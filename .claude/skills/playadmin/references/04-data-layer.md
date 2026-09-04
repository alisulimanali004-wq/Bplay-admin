# 04 — Data Layer (Axios + TanStack Query)

The networking + server-state layer for **bplay-admin**. Everything that touches the backend flows through **one axios client**, **one error normalizer**, **one envelope unwrapper**, and **TanStack Query v5** hooks. Components never call `axios` directly, never read `err?.response?.data?.message`, and never hold manual `loading`/`error` flags for server data. This file gives complete, copy-ready templates and ends with a Do/Never recap. See **02-design-system.md** for tokens, **03-ui-kit.md** for UI primitives, **05-state-i18n-forms.md** for the auth store & Zod forms consumed here.

---

## 0. Layer map

```
shared/
  lib/
    apiClient.ts       # axios instance + interceptors (token in, 401 + errors out)
    errors.ts          # AppError class + toAppError(unknown)  ← the ONLY place message extraction lives
    queryClient.ts     # QueryClient config + global QueryCache/MutationCache onError → toast
    storage.ts         # thin localStorage wrapper (see 05)
  types/
    api.ts             # ApiEnvelope<T> + unwrap<T>(res) + unwrapList<T>(res)
features/<feature>/api/
  <feature>.types.ts   # DTO (raw backend) + domain type + to<Entity> mapper
  <feature>.api.ts     # typed service fns calling apiClient, returning DOMAIN types
  <feature>.keys.ts    # query-key factory
  <feature>.schema.ts  # zod schemas for form inputs / payloads
features/<feature>/hooks/
  useXQuery.ts         # useQuery wrappers
  useXMutation.ts      # useMutation wrappers (invalidate + toast + server fieldErrors)
```

**Rule:** data flows **DTO → mapper → domain type**. The rest of the app only ever sees the domain type (`Admin`, never the raw `{ is_active, _id, full_name }`).

---

## 1. `shared/lib/errors.ts` — AppError + toAppError

This kills the `err?.response?.data?.message` pattern currently duplicated across every service. **Every** thrown error in the app is an `AppError`. Validation field errors are captured into `fieldErrors` so forms can map them onto React Hook Form via `setError` (see §7 and 05).

```ts
// shared/lib/errors.ts
import axios from 'axios';

/** Per-field validation messages, keyed by form field name. */
export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  readonly status: number;        // HTTP status, or 0 for network/unknown
  readonly code: string;          // machine code ('network' | 'timeout' | 'http_401' | backend code)
  readonly fieldErrors?: FieldErrors;
  readonly cause?: unknown;

  constructor(params: {
    message: string;
    status?: number;
    code?: string;
    fieldErrors?: FieldErrors;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.status = params.status ?? 0;
    this.code = params.code ?? 'unknown';
    this.fieldErrors = params.fieldErrors;
    this.cause = params.cause;
  }

  get isNetwork() {
    return this.code === 'network' || this.code === 'timeout';
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isValidation() {
    return this.status === 422 || Boolean(this.fieldErrors);
  }
}

/**
 * Extract per-field errors from the common backend shapes:
 *   { errors: { email: ['Required'] } }         (Laravel-style)
 *   { errors: [{ field: 'email', message }] }   (array-style)
 *   { fieldErrors: { email: 'Required' } }
 */
function extractFieldErrors(data: unknown): FieldErrors | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = (data as Record<string, unknown>).errors ?? (data as Record<string, unknown>).fieldErrors;
  if (!raw) return undefined;

  const out: FieldErrors = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'field' in item) {
        const f = String((item as any).field);
        const m = (item as any).message ?? (item as any).msg;
        if (f && m) out[f] = String(m);
      }
    }
  } else if (typeof raw === 'object') {
    for (const [field, val] of Object.entries(raw as Record<string, unknown>)) {
      out[field] = Array.isArray(val) ? String(val[0]) : String(val);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/** THE single normalizer. Turn any thrown value into an AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (axios.isAxiosError(error)) {
    // No response → network/timeout.
    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED';
      return new AppError({
        message: isTimeout ? 'The request timed out. Please try again.' : 'Network error. Check your connection.',
        status: 0,
        code: isTimeout ? 'timeout' : 'network',
        cause: error,
      });
    }
    const { status, data } = error.response;
    const backendMessage =
      (data && typeof data === 'object'
        ? ((data as any).message ?? (data as any).error ?? (data as any).msg)
        : typeof data === 'string'
          ? data
          : undefined) ?? undefined;

    return new AppError({
      message: backendMessage ?? defaultMessageForStatus(status),
      status,
      code: (data as any)?.code ?? `http_${status}`,
      fieldErrors: extractFieldErrors(data),
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new AppError({ message: error.message, code: 'unknown', cause: error });
  }
  return new AppError({ message: 'Something went wrong.', code: 'unknown', cause: error });
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400: return 'Invalid request.';
    case 401: return 'Your session has expired. Please sign in again.';
    case 403: return 'You do not have permission to do that.';
    case 404: return 'Not found.';
    case 409: return 'This conflicts with existing data.';
    case 422: return 'Please fix the highlighted fields.';
    case 429: return 'Too many requests. Slow down and retry.';
    default:  return status >= 500 ? 'Server error. Please try again later.' : 'Request failed.';
  }
}
```

**Rule:** the only file allowed to read `error.response.data.message` is `errors.ts`. Everywhere else you have a typed `AppError` with `.message`, `.status`, `.fieldErrors`.

---

## 2. `shared/types/api.ts` — envelope unwrap

The backend is inconsistent (verified in the current `admin.service.js`): responses arrive as `{ data: { data: [...] } }`, `{ data: { admins: [...] } }`, `{ data: [...] }`, or a bare array. `unwrap` / `unwrapList` absorb that variance in ONE place so `<feature>.api.ts` stays clean.

```ts
// shared/types/api.ts
import type { AxiosResponse } from 'axios';

/** Loose envelope covering every shape the backend actually returns. */
export interface ApiEnvelope<T> {
  data?: T | { data?: T; [collection: string]: unknown };
  message?: string;
  success?: boolean;
}

/** Unwrap a single object payload: {data:{data}} | {data} | raw. */
export function unwrap<T>(res: AxiosResponse<any>): T {
  const body = res?.data;
  if (body && typeof body === 'object') {
    if ('data' in body && body.data && typeof body.data === 'object' && 'data' in body.data) {
      return body.data.data as T; // { data: { data: {...} } }
    }
    if ('data' in body) return body.data as T; // { data: {...} }
  }
  return body as T; // raw
}

/**
 * Unwrap a list payload. `collectionKey` is the named array some endpoints use
 * (e.g. 'admins', 'owners', 'cities'). Falls back to nested/plain/raw arrays.
 */
export function unwrapList<T>(res: AxiosResponse<any>, collectionKey?: string): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body as T[];                       // raw array
  if (Array.isArray(body?.data?.data)) return body.data.data as T[]; // { data: { data: [] } }
  if (collectionKey && Array.isArray(body?.data?.[collectionKey])) {
    return body.data[collectionKey] as T[];                          // { data: { admins: [] } }
  }
  if (Array.isArray(body?.data)) return body.data as T[];            // { data: [] }
  if (collectionKey && Array.isArray(body?.[collectionKey])) {
    return body[collectionKey] as T[];                               // { admins: [] }
  }
  return [];
}
```

**Never:** re-implement list extraction inside a feature. Import `unwrapList` and pass the collection key.

---

## 3. `shared/lib/apiClient.ts` — axios instance

Base URL comes from **`import.meta.env.VITE_API_BASE_URL`** (never a hardcoded string). The request interceptor pulls the token from the **auth store** (not `localStorage` directly — see 05). The response interceptor performs **401 refresh-or-logout** and funnels every failure through `toAppError`.

```ts
// shared/lib/apiClient.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/shared/stores/authStore';
import { toAppError } from './errors';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // e.g. http://localhost:3000/api/v1
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- Request: attach Bearer from the auth store ----
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  const lng = document.documentElement.lang || 'en';
  config.headers.set('Accept-Language', lng);
  return config;
});

// ---- Response: 401 refresh-or-logout + error normalization ----
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Single-flight: concurrent 401s share ONE refresh call.
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        // Bare axios (not apiClient) to avoid interceptor recursion.
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const next = res.data?.data?.accessToken ?? res.data?.accessToken ?? null;
        if (next) useAuthStore.getState().setAccessToken(next);
        return next;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/');

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(original); // replay once
      }
      // Refresh failed → hard logout + redirect (guard picks it up).
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(toAppError(error));
  },
);
```

**Rule:** `apiClient` rejects with an **AppError**, always. Callers/hooks receive `AppError`, never a raw `AxiosError`.
**Never:** import `localStorage` here — the store owns the token (persist key `bplay-admin-auth`, see 05).

> If the backend has no refresh endpoint yet, keep the seam but make `refreshAccessToken` resolve `null` — the 401 path then logs out cleanly. Wire the real `/auth/refresh` when it exists; nothing else changes.

---

## 4. `.env` files

Vite only exposes vars prefixed with `VITE_`. Commit `.env.example`; keep secrets out of the repo.

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_USE_MOCKS=false
```

```bash
# .env.production
VITE_API_BASE_URL=https://api.bplay.app/api/v1
VITE_USE_MOCKS=false
```

```bash
# .env.example  (committed; documents required vars)
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_USE_MOCKS=false
```

Type them for editor safety:

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_MOCKS: string; // 'true' | 'false'
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**Rule:** flip `VITE_USE_MOCKS` to run the whole app against fake data with no backend (see §8).

---

## 5. Feature API layer — admin-management (real endpoints)

Endpoints (verified): `GET/POST /admin/admin-management`, `PATCH/DELETE /admin/admin-management/{id}`, `POST /admin/admin-management/is_active/{id}`.

### 5.1 `admin.types.ts` — DTO + domain + mapper

```ts
// features/admin-management/api/admin.types.ts

export type AdminRole = 'super_admin' | 'admin';

/** Raw backend shape — fields arrive under inconsistent keys (see current service). */
export interface AdminDto {
  id?: string | number;
  _id?: string;
  admin_id?: string;
  name?: string;
  full_name?: string;
  email?: string;
  email_address?: string;
  role?: string;
  is_active?: boolean;
  isActive?: boolean;
  status?: string;
  user?: { name?: string; fullName?: string; email?: string; role?: string };
}

/** The ONE canonical shape the app uses everywhere. */
export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
}

export interface CreateAdminInput {
  name: string;
  email: string;
  role: AdminRole;
  password: string;
}

export type UpdateAdminInput = Partial<Pick<Admin, 'name' | 'email' | 'role'>>;

/** DTO → domain. Absorbs every key variant here so nothing else has to. */
export function toAdmin(dto: AdminDto): Admin {
  const isActive =
    typeof dto.is_active === 'boolean' ? dto.is_active
    : typeof dto.isActive === 'boolean' ? dto.isActive
    : dto.status ? dto.status !== 'suspended'
    : true;

  const role = (dto.role ?? dto.user?.role ?? 'admin') as AdminRole;

  return {
    id: String(dto.id ?? dto._id ?? dto.admin_id ?? ''),
    name: dto.name ?? dto.full_name ?? dto.user?.name ?? dto.user?.fullName ?? '',
    email: dto.email ?? dto.email_address ?? dto.user?.email ?? '',
    role: role === 'super_admin' ? 'super_admin' : 'admin',
    isActive,
  };
}
```

### 5.2 `admin.api.ts` — typed service fns

```ts
// features/admin-management/api/admin.api.ts
import { apiClient } from '@/shared/lib/apiClient';
import { unwrap, unwrapList } from '@/shared/types/api';
import { toAdmin, type Admin, type AdminDto, type CreateAdminInput, type UpdateAdminInput } from './admin.types';

const BASE = '/admin/admin-management';

export interface AdminListParams {
  search?: string;
  role?: 'super_admin' | 'admin';
  isActive?: boolean;
}

export async function getAdmins(params: AdminListParams = {}): Promise<Admin[]> {
  const res = await apiClient.get(BASE, { params });
  return unwrapList<AdminDto>(res, 'admins').map(toAdmin);
}

export async function createAdmin(body: CreateAdminInput): Promise<Admin> {
  const res = await apiClient.post(BASE, body);
  return toAdmin(unwrap<AdminDto>(res));
}

export async function updateAdmin(id: string, body: UpdateAdminInput): Promise<Admin> {
  const res = await apiClient.patch(`${BASE}/${id}`, body);
  return toAdmin(unwrap<AdminDto>(res));
}

/** POST /admin/admin-management/is_active/{id} — activate / suspend. */
export async function toggleAdminActiveStatus(id: string, isActive: boolean): Promise<Admin> {
  const res = await apiClient.post(`${BASE}/is_active/${id}`, { is_active: isActive });
  return toAdmin(unwrap<AdminDto>(res));
}

export async function deleteAdmin(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
```

### 5.3 `admin.keys.ts` — query-key factory

```ts
// features/admin-management/api/admin.keys.ts
import type { AdminListParams } from './admin.api';

export const adminKeys = {
  all: ['admins'] as const,
  lists: () => [...adminKeys.all, 'list'] as const,
  list: (params: AdminListParams) => [...adminKeys.lists(), params] as const,
  details: () => [...adminKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminKeys.details(), id] as const,
};
```

### 5.4 `admin.schema.ts` — zod

```ts
// features/admin-management/api/admin.schema.ts
import { z } from 'zod';

export const adminRoleSchema = z.enum(['super_admin', 'admin']);

export const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'admin.form.nameMin'),
  email: z.string().trim().email('admin.form.emailInvalid'),
  role: adminRoleSchema,
  password: z.string().min(8, 'admin.form.passwordMin'),
});

export const updateAdminSchema = createAdminSchema.partial().omit({ password: true });

export type CreateAdminValues = z.infer<typeof createAdminSchema>;
export type UpdateAdminValues = z.infer<typeof updateAdminSchema>;
```

> Error strings are i18n keys — resolve with `t(fieldState.error.message)` in the form (see 05).

**Reference — owner-management** uses the same pattern with the action enum `'approve' | 'reject' | 'activate' | 'disable' | 'block'`:

```ts
// features/owner-management/api/owner.api.ts (shape reference)
export type OwnerAction = 'approve' | 'reject' | 'activate' | 'disable' | 'block';

export const getOwners = async (): Promise<Owner[]> =>
  unwrapList<OwnerDto>(await apiClient.get('/admin/owners-management/owners'), 'owners').map(toOwner);

export const getPendingVerification = async (ownerId: string): Promise<OwnerVerification> =>
  toOwnerVerification(unwrap(await apiClient.get(`/admin/owners-management/pending-verification/${ownerId}`)));

export const decideOwnerVerification = async (ownerId: string, action: OwnerAction): Promise<void> => {
  await apiClient.patch(`/admin/owners-management/pending-verification/${ownerId}`, { action });
};
```

---

## 6. `shared/lib/queryClient.ts` — TanStack Query config

Global defaults + a `QueryCache` / `MutationCache` `onError` that toasts every uncaught failure. Because `apiClient` rejects with `AppError`, `error.message` here is already human-readable.

```ts
// shared/lib/queryClient.ts
import { QueryCache, MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/ui'; // imperative toast singleton (see 03 ToastProvider)
import { AppError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // Never retry auth/permission/validation; retry once on network/5xx.
        if (error instanceof AppError && (error.status === 401 || error.status === 403 || error.isValidation)) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      // Query components render ErrorState; still surface a toast for background refetches.
      if (error instanceof AppError && !error.isUnauthorized) toast.error(error.message);
    },
  }),
  mutationCache: new MutationCache({
    // Only toast here if the mutation didn't pass its own onError.
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.options.onError) return;
      toast.error(error instanceof AppError ? error.message : 'Something went wrong.');
    },
  }),
});
```

Mount it once (see `app/providers/QueryProvider`):

```tsx
// app/providers/QueryProvider.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/shared/lib/queryClient';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

---

## 7. Query & mutation hooks

Components consume **only these hooks** — never `useQuery` inline, never `apiClient` directly. This centralizes keys, invalidation, and server-error mapping.

```ts
// features/admin-management/hooks/useAdminsQuery.ts
import { useQuery } from '@tanstack/react-query';
import { getAdmins, type AdminListParams } from '../api/admin.api';
import { adminKeys } from '../api/admin.keys';

export function useAdminsQuery(params: AdminListParams = {}) {
  return useQuery({
    queryKey: adminKeys.list(params),
    queryFn: () => getAdmins(params),
    placeholderData: (prev) => prev, // keep old rows visible while refetching (v5 keepPreviousData)
  });
}
```

```ts
// features/admin-management/hooks/useCreateAdminMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseFormSetError, FieldValues } from 'react-hook-form';
import { createAdmin } from '../api/admin.api';
import { adminKeys } from '../api/admin.keys';
import { AppError } from '@/shared/lib/errors';
import { toast } from '@/shared/ui';
import type { CreateAdminInput } from '../api/admin.types';

/**
 * Pass the RHF `setError` so backend validation (AppError.fieldErrors) maps
 * straight onto the form fields; other errors toast.
 */
export function useCreateAdminMutation(setError?: UseFormSetError<FieldValues>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAdminInput) => createAdmin(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.lists() });
      toast.success('admin.toast.created');
    },
    onError: (error) => {
      if (error instanceof AppError && error.fieldErrors && setError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: 'server', message });
        }
        return; // handled inline on the form
      }
      toast.error(error instanceof AppError ? error.message : 'Something went wrong.');
    },
  });
}
```

Optimistic toggle (activate/suspend) — snapshot, patch cache, rollback on error:

```ts
// features/admin-management/hooks/useToggleAdminMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleAdminActiveStatus } from '../api/admin.api';
import { adminKeys } from '../api/admin.keys';
import type { Admin } from '../api/admin.types';

export function useToggleAdminMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleAdminActiveStatus(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: adminKeys.lists() });
      const snapshots = qc.getQueriesData<Admin[]>({ queryKey: adminKeys.lists() });
      for (const [key, list] of snapshots) {
        if (list) qc.setQueryData(key, list.map((a) => (a.id === id ? { ...a, isActive } : a)));
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, list]) => qc.setQueryData(key, list));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: adminKeys.lists() }),
  });
}
```

Component usage stays declarative — no manual flags:

```tsx
const { data: admins = [], isLoading, error, refetch } = useAdminsQuery({ search });
// <DataTable data={admins} isLoading={isLoading} error={error?.message} onRetry={refetch} ... />
```

---

## 8. Backend-not-ready strategy (`VITE_USE_MOCKS`)

Keep the seam so every feature renders **loading / empty / error / success** before the backend exists. Going live = flip `VITE_USE_MOCKS` to `false`; no component or hook changes. Two supported approaches — **pick one per project and stay consistent.**

### Option A — swap the api module (simple, zero deps)

Give each feature a `<feature>.api.mock.ts` with the same signatures, and a barrel that chooses at build time:

```ts
// features/admin-management/api/admin.api.mock.ts
import type { Admin, CreateAdminInput } from './admin.types';

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));
let db: Admin[] = [
  { id: '1', name: 'Sara Admin', email: 'sara@bplay.app', role: 'super_admin', isActive: true },
  { id: '2', name: 'Omar Admin', email: 'omar@bplay.app', role: 'admin', isActive: false },
];

export async function getAdmins(): Promise<Admin[]> { await wait(); return [...db]; }
export async function createAdmin(body: CreateAdminInput): Promise<Admin> {
  await wait();
  const admin: Admin = { id: String(Date.now()), name: body.name, email: body.email, role: body.role, isActive: true };
  db = [admin, ...db];
  return admin;
}
export async function updateAdmin(id: string, patch: Partial<Admin>): Promise<Admin> {
  await wait(); db = db.map((a) => (a.id === id ? { ...a, ...patch } : a));
  return db.find((a) => a.id === id)!;
}
export async function toggleAdminActiveStatus(id: string, isActive: boolean): Promise<Admin> {
  await wait(); db = db.map((a) => (a.id === id ? { ...a, isActive } : a));
  return db.find((a) => a.id === id)!;
}
export async function deleteAdmin(id: string): Promise<void> { await wait(); db = db.filter((a) => a.id !== id); }
```

```ts
// features/admin-management/api/index.ts  ← hooks import from HERE, not the concrete file
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
export * from USE_MOCKS ? './admin.api.mock' : './admin.api';
```

> Vite tree-shakes the unused branch out of production builds.

### Option B — MSW (higher fidelity: real network, real interceptors exercised)

Intercept at the network boundary so `apiClient`, interceptors, and `unwrap` all run for real:

```ts
// shared/lib/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const base = import.meta.env.VITE_API_BASE_URL;
export const handlers = [
  http.get(`${base}/admin/admin-management`, () =>
    HttpResponse.json({ data: { admins: [{ id: '1', name: 'Sara', email: 'sara@bplay.app', role: 'super_admin', is_active: true }] } }),
  ),
  http.post(`${base}/admin/admin-management`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ data: { id: String(Date.now()), ...body, is_active: true } }, { status: 201 });
  }),
];
```

```ts
// main.tsx (bootstrap gate)
async function enableMocks() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return;
  const { worker } = await import('@/shared/lib/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
enableMocks().then(() => {/* render root */});
```

**Rule:** mock modules return the SAME domain/DTO shapes the backend does, so the mapper and hooks are exercised identically. **Never** branch on `VITE_USE_MOCKS` inside a component or hook — only inside the api barrel (A) or bootstrap (B).

---

## 9. Do / Never

**Do**
- Route all HTTP through `apiClient`; let it reject with `AppError`.
- Extract error messages ONLY in `errors.ts`; components read `error.message` / `error.fieldErrors`.
- Unwrap envelopes with `unwrap` / `unwrapList(res, collectionKey)` — nothing else.
- Map DTO → domain with `to<Entity>`; the app sees one canonical shape.
- Fetch via feature hooks (`useXQuery` / `useXMutation`); invalidate the right keys on mutate; toast in `onSuccess`.
- Map `AppError.fieldErrors` onto RHF via `setError` for validation failures.
- Read `VITE_API_BASE_URL` from `import.meta.env`; flip `VITE_USE_MOCKS` to build without a backend.
- Use the key factory (`adminKeys.list(params)`); default `staleTime` 30s, `retry` 1, `refetchOnWindowFocus:false`.

**Never**
- Call `axios`/`fetch` or read `err?.response?.data?.message` in a component or service.
- Hold manual `loading`/`error` `useState` for server data — TanStack Query owns it.
- Read/write `localStorage` for the token outside the auth store (see 05).
- Hardcode the base URL or a `test_admin@bplay.com` role shortcut — role comes from the JWT (see 05).
- Re-implement list extraction or field-error parsing per feature.
- Branch on `VITE_USE_MOCKS` inside components/hooks — only in the api barrel or bootstrap.
- Retry 401/403/422, or refetch on window focus.

_See **03-ui-kit.md** (DataTable/Toast/ErrorState), **05-state-i18n-forms.md** (authStore, zod + RHF wiring)._
