# 06 · Feature Workflow — Build a New Feature End-to-End

The ordered, world-class recipe for adding a feature to **bplay-admin**. Follow the layers top-to-bottom: types → schema → api → keys → hooks → (store) → components → page → route → i18n → states → verify. Every layer has a canonical shape defined in the sibling references — this file is the assembly line that wires them together. Reuse the UI Kit (see [03-ui-kit.md](03-ui-kit.md)); never hand-roll a modal, table, or spinner.

---

## 1 · The ordered build checklist

Copy this into your working notes and tick as you go. Replace `<feature>` / `Xxx` with your feature (e.g. `facility-management` / `Facility`).

### Step 0 · Reuse audit (do this FIRST — see §3)
- [ ] Searched `src/shared/ui` for a primitive that already covers each UI element you need.
- [ ] Searched existing `features/*` for a data/mutation pattern you can mirror (owner-management is the reference for approve/reject).
- [ ] Confirmed no primitive needs to be **forked** — if one is missing a variant, extend it centrally instead.

### Step 1 · Scaffold folders
```
src/features/<feature>/
  api/
    <feature>.types.ts     # DTOs + domain types + mappers
    <feature>.schema.ts    # zod schemas for forms/payloads
    <feature>.api.ts       # typed service fns (apiClient)
    <feature>.keys.ts      # query-key factory
  hooks/
    useXxxQuery.ts
    useXxxMutation.ts
  store/
    <feature>.store.ts     # OPTIONAL zustand UI slice (modals/filters)
  components/
    XxxTable.tsx + XxxTable.module.css
    XxxActions.tsx + …
  pages/
    XxxManagementPage.tsx + XxxManagementPage.module.css
  index.ts                 # barrel (public surface of the feature)
```
**Rule:** a feature's public surface is its `index.ts` barrel and its route. Components/hooks stay internal unless another feature genuinely needs them (then promote to `shared/`).

### Step 2 · Define `<feature>.types.ts` (contracts first, against the real JSON)
- [ ] `XxxDto` = the raw backend shape (snake_case, loose, optional-heavy).
- [ ] `Xxx` = the canonical domain type your UI consumes (camelCase, tight).
- [ ] `toXxx(dto: XxxDto): Xxx` = the **single** normalization mapper (replaces every scattered `normalizeXxx`).
- [ ] Input types for mutations: `ApproveFacilityInput`, etc.

### Step 3 · Define `<feature>.schema.ts`
- [ ] One zod schema per form/payload; infer the TS input type from it (`z.infer`).
- [ ] Reuse shared field schemas where they exist (email, phone, required-string).

### Step 4 · Define `<feature>.api.ts`
- [ ] Named async fns calling `apiClient` with **real endpoints** (see the endpoint table in the brief / [04-data-layer.md](04-data-layer.md)).
- [ ] Unwrap the envelope via the shared `unwrap<T>()` — never re-implement `res.data.data` ladders per file.
- [ ] Map list/detail results through `toXxx`. Let the interceptor throw `AppError` — do **not** try/catch to swallow.

### Step 5 · Define `<feature>.keys.ts`
- [ ] Query-key factory (`all`, `lists()`, `list(params)`, `details()`, `detail(id)`).

### Step 6 · Query + mutation hooks
- [ ] `useXxxQuery(params)` → `useQuery` keyed by the factory.
- [ ] `useXxxMutation()` → `useMutation`, `onSuccess` invalidates the right keys + toast.
- [ ] No manual `loading`/`error` `useState` for server data — TanStack owns it.

### Step 7 · Optional store slice
- [ ] Only if you have modal-open flags / client-side filters. Expose **selectors**; never destructure the whole store.

### Step 8 · Build components from the UI Kit
- [ ] Compose `DataTable`, `Badge`, `Button`, `Modal`, `ConfirmDialog`, `SearchInput` from `@ui`.
- [ ] Each component gets a `*.module.css` using **tokens only** — no hex, no inline `style={{}}`.
- [ ] `data-testid` on interactive nodes (`facility-row-{id}`, `approve-btn`).

### Step 9 · Assemble the Page
- [ ] Page reads hooks, renders states, wires modals via the store/`useDisclosure`.
- [ ] Standardized callback names: `onConfirm` / `onClose` / `onSubmit`.

### Step 10 · Register a LAZY route + guard
- [ ] `React.lazy` the page in `app/router/routes.tsx`, wrap in `<Suspense>`, guard with `RequireAuth` + `RequireRole`.
- [ ] Add the path constant to `app/router/paths.ts` and a Sidebar entry.

### Step 11 · Add en/ar i18n keys
- [ ] Add every user string to **both** `locales/en.json` and `locales/ar.json` under `<feature>.*`.
- [ ] Consume via `t('<feature>.key')`. Verify RTL (logical CSS props only).

### Step 12 · Wire loading / empty / error / success
- [ ] Table shows skeleton (loading), `EmptyState` (no rows), `ErrorState` + retry (error), data (success) — all driven by the query, before the backend even exists (`VITE_USE_MOCKS`).

### Step 13 · Verify (§ at the end)
- [ ] `tsc --noEmit` clean, `eslint` clean, exercised all four states, tested both languages/directions.

---

## 2 · Worked mini-example — `facility-management` (list + approve/reject)

A super-admin lists submitted facilities and approves or rejects each. This mirrors the **real owner-management action pattern** (`PATCH …/pending-verification/{id}` with `{ action }`). Every layer shown briefly.

### 2.1 · `api/facility.types.ts`
```ts
// Raw backend shape — loose, snake_case.
export interface FacilityDto {
  id?: string;
  _id?: string;
  name?: string;
  owner_name?: string;
  city?: string;
  status?: string;               // 'pending' | 'approved' | 'rejected'
  created_at?: string;
}

// Canonical domain shape — the ONLY thing components consume.
export type FacilityStatus = 'pending' | 'approved' | 'rejected';

export interface Facility {
  id: string;
  name: string;
  ownerName: string;
  city: string;
  status: FacilityStatus;
  createdAt: string;
}

export type FacilityAction = 'approve' | 'reject';

// Single canonical mapper (replaces scattered normalizeX).
export function toFacility(dto: FacilityDto): Facility {
  return {
    id: dto.id ?? dto._id ?? '',
    name: dto.name ?? '',
    ownerName: dto.owner_name ?? '',
    city: dto.city ?? '',
    status: (dto.status as FacilityStatus) ?? 'pending',
    createdAt: dto.created_at ?? '',
  };
}
```

### 2.2 · `api/facility.schema.ts`
```ts
import { z } from 'zod';

export const reviewFacilitySchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});
export type ReviewFacilityInput = z.infer<typeof reviewFacilitySchema>;
```

### 2.3 · `api/facility.api.ts`
```ts
import { apiClient } from '@lib/apiClient';
import { unwrapList, unwrap } from '@/shared/types/api';
import { toFacility, type Facility } from './facility.types';
import type { ReviewFacilityInput } from './facility.schema';

const BASE = '/admin/facilities-management';

export async function getFacilities(params: { status?: string; page?: number } = {}): Promise<Facility[]> {
  const res = await apiClient.get(`${BASE}/facilities`, { params });
  return unwrapList<FacilityDto>(res).map(toFacility);
}

export async function reviewFacility(id: string, input: ReviewFacilityInput) {
  // Mirrors owner-management: PATCH pending-verification with an { action } body.
  const res = await apiClient.patch(`${BASE}/pending-verification/${id}`, input);
  return unwrap(res);
}
```
**Rule:** the interceptor already turns failures into `AppError` — the api fn does not try/catch. **Never** re-inline `res?.data?.data?.message` extraction; that lives in `toAppError`.

### 2.4 · `api/facility.keys.ts`
```ts
export const facilityKeys = {
  all: ['facilities'] as const,
  lists: () => [...facilityKeys.all, 'list'] as const,
  list: (params: object) => [...facilityKeys.lists(), params] as const,
  details: () => [...facilityKeys.all, 'detail'] as const,
  detail: (id: string) => [...facilityKeys.details(), id] as const,
};
```

### 2.5 · `hooks/useFacilitiesQuery.ts` + `useReviewFacilityMutation.ts`
```ts
// useFacilitiesQuery.ts
import { useQuery } from '@tanstack/react-query';
import { getFacilities } from '../api/facility.api';
import { facilityKeys } from '../api/facility.keys';

export function useFacilitiesQuery(params: { status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: facilityKeys.list(params),
    queryFn: () => getFacilities(params),
  });
}
```
```ts
// useReviewFacilityMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewFacility } from '../api/facility.api';
import { facilityKeys } from '../api/facility.keys';
import { useToast } from '@ui';
import { useTranslation } from 'react-i18next';
import type { ReviewFacilityInput } from '../api/facility.schema';

export function useReviewFacilityMutation() {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewFacilityInput }) => reviewFacility(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilityKeys.lists() });
      toast.success(t('facility.reviewSuccess'));
    },
  });
}
```
**Never** add a `const [loading, setLoading] = useState(false)` around these — `mutation.isPending` / `query.isLoading` are the source of truth.

### 2.6 · `store/facility.store.ts` (optional UI slice)
```ts
import { create } from 'zustand';

interface FacilityUiState {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
}
export const useFacilityUiStore = create<FacilityUiState>((set) => ({
  statusFilter: 'pending',
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));

// Selectors — consume ONLY what you need (prevents re-render storms).
export const useStatusFilter = () => useFacilityUiStore((s) => s.statusFilter);
export const useSetStatusFilter = () => useFacilityUiStore((s) => s.setStatusFilter);
```

### 2.7 · `components/FacilityTable.tsx`
```tsx
import { DataTable, Badge, Button, type Column } from '@ui';
import { useTranslation } from 'react-i18next';
import type { Facility } from '../api/facility.types';
import styles from './FacilityTable.module.css';

const statusVariant = { pending: 'warning', approved: 'success', rejected: 'danger' } as const;

interface Props {
  data: Facility[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onReview: (facility: Facility, action: 'approve' | 'reject') => void;
}

export function FacilityTable({ data, isLoading, error, onRetry, onReview }: Props) {
  const { t } = useTranslation();
  const columns: Column<Facility>[] = [
    { key: 'name', header: t('facility.name') },
    { key: 'ownerName', header: t('facility.owner') },
    { key: 'city', header: t('facility.city') },
    {
      key: 'status',
      header: t('facility.status'),
      render: (row) => <Badge variant={statusVariant[row.status]}>{t(`facility.status_${row.status}`)}</Badge>,
    },
  ];
  return (
    <DataTable<Facility>
      columns={columns}
      data={data}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      getRowId={(row) => row.id}
      rowActions={(row) => (
        <div className={styles.actions}>
          <Button size="sm" variant="primary" data-testid={`approve-${row.id}`} onClick={() => onReview(row, 'approve')}>
            {t('facility.approve')}
          </Button>
          <Button size="sm" variant="danger" data-testid={`reject-${row.id}`} onClick={() => onReview(row, 'reject')}>
            {t('facility.reject')}
          </Button>
        </div>
      )}
    />
  );
}
```
```css
/* FacilityTable.module.css — tokens only */
.actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
```

### 2.8 · `pages/FacilityManagementPage.tsx`
```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, ConfirmDialog, SearchInput } from '@ui';
import { useFacilitiesQuery } from '../hooks/useFacilitiesQuery';
import { useReviewFacilityMutation } from '../hooks/useReviewFacilityMutation';
import { useStatusFilter } from '../store/facility.store';
import { FacilityTable } from '../components/FacilityTable';
import type { Facility, FacilityAction } from '../api/facility.types';

export default function FacilityManagementPage() {
  const { t } = useTranslation();
  const status = useStatusFilter();
  const { data = [], isLoading, isError, refetch } = useFacilitiesQuery({ status });
  const review = useReviewFacilityMutation();
  const [pending, setPending] = useState<{ facility: Facility; action: FacilityAction } | null>(null);

  return (
    <Card padding="lg">
      <SearchInput value="" onChange={() => {}} placeholder={t('facility.search')} />
      <FacilityTable
        data={data}
        isLoading={isLoading}
        error={isError ? t('facility.loadError') : undefined}
        onRetry={refetch}
        onReview={(facility, action) => setPending({ facility, action })}
      />
      <ConfirmDialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        variant={pending?.action === 'reject' ? 'danger' : 'primary'}
        title={t(`facility.confirm_${pending?.action}`)}
        message={t('facility.confirmMessage', { name: pending?.facility.name })}
        isLoading={review.isPending}
        onConfirm={async () => {
          if (!pending) return;
          await review.mutateAsync({ id: pending.facility.id, input: { action: pending.action } });
          setPending(null);
        }}
      />
    </Card>
  );
}
```

### 2.9 · Route (lazy + guarded) — `app/router/routes.tsx`
```tsx
const FacilityManagementPage = lazy(() => import('@features/facility-management/pages/FacilityManagementPage'));
// …inside the protected /app children:
{
  path: 'facilities',
  element: (
    <RequireRole role="super_admin">
      <Suspense fallback={<Spinner size="lg" />}><FacilityManagementPage /></Suspense>
    </RequireRole>
  ),
},
```
Add `paths.facilities = '/app/facilities'` and a Sidebar link.

### 2.10 · i18n — add to **both** locale files
```json
// locales/en.json  (mirror keys in ar.json with Arabic values)
{
  "facility": {
    "name": "Facility", "owner": "Owner", "city": "City", "status": "Status",
    "status_pending": "Pending", "status_approved": "Approved", "status_rejected": "Rejected",
    "approve": "Approve", "reject": "Reject", "search": "Search facilities…",
    "confirm_approve": "Approve facility?", "confirm_reject": "Reject facility?",
    "confirmMessage": "Are you sure about \"{{name}}\"?",
    "reviewSuccess": "Facility updated", "loadError": "Failed to load facilities"
  }
}
```
**Rule:** every key exists in **both** `en.json` and `ar.json`. Never ship a key in only one.

---

## 3 · Reuse before you build

**Rule:** before writing any UI, grep `src/shared/ui` and the existing `features/*` for something that already does the job.

- [ ] Need a table? Use `DataTable` — it already handles loading/empty/error/retry. **Never** write `<table>` by hand.
- [ ] Need a modal / confirm? Use `Modal` / `ConfirmDialog` — they own focus-trap, Esc, aria. **Never** roll a `position:fixed` overlay.
- [ ] Need a status pill? Use `Badge` with a semantic `variant`. **Never** style a colored `<span>`.
- [ ] Need debounced search? Use `SearchInput`. Need a mutation toast? Use `useToast()`.
- [ ] Missing a variant (e.g. a `Button` needs an `xs` size)? **Extend the primitive centrally** — add the optional prop in `shared/ui/Button.tsx` + its CSS module — so every feature benefits. **Never** copy `Button.tsx` into your feature and tweak it.

> A forked primitive is a bug: it drifts, misses the next a11y fix, and duplicates tokens. One primitive, evolved by additive optional props.

---

## 4 · Anti-patterns (from the real audit) → the correct replacement

| ❌ Anti-pattern (present in current code) | ✅ Correct replacement |
|---|---|
| Hardcoded `#2563eb` / `rgba(…)` in a component or feature CSS | Reference a **token**: `var(--color-primary)`. Colors live only in `styles/tokens.css`. |
| Hand-rolled modal (`div.overlay` + manual close) | `Modal` / `ConfirmDialog` from `@ui` (focus-trap + Esc + `role="dialog"`). |
| Hand-rolled `<table>` with `.map` rows | `DataTable<T>` — it renders skeleton/empty/error/retry internally. |
| `const [loading,setLoading]=useState()` around a fetch | TanStack Query — read `isLoading` / `isPending` / `isError`. |
| `const { modalOpen, filters, setX } = useStore()` (whole-store destructure) | **Selectors**: `useStore((s) => s.modalOpen)` — one slice per hook. |
| `localStorage.getItem('accessToken')` inside a component | Read the **auth store** selector `useAccessToken()`; the store owns persistence. |
| `role === derive from email` (`email === 'test_admin@bplay.com'`) | Decode the JWT (`jwt-decode`) in `authStore.hydrateFromToken()`; role comes from the token payload. |
| Inline `style={{ marginTop: 16 }}` | A `*.module.css` class using `var(--space-4)` and **logical** props (`margin-block-start`). |
| `left` / `right` in CSS | Logical properties: `margin-inline`, `inset-inline`, `text-align: start/end` (RTL-safe). |
| Scattered `normalizeOwner` / `res.data.data` ladders per file | One `toXxx(dto)` mapper in `.types.ts` + shared `unwrap()` in `shared/types/api.ts`. |
| Duplicated `err?.response?.data?.message` extraction | `toAppError(err)` in `shared/lib/errors.ts` — the only place that reads error shapes. |
| Mixed callback names `onInvite` / `onCreate` / `onAssign` | Standardize: `onSubmit` / `onConfirm` / `onClose`. |
| Dead files: `auth.api.js`, `auth.endpoints.js`, unused `decodeToken.js`, `AuthLayout.jsx`, `DashboardHome.jsx` | **Delete** on migration. No orphaned modules. |
| A `.service.js` with mixed fetch + normalize + error handling | Split into `.api.ts` (calls) + `.types.ts` (mappers) + interceptor (errors). |
| Stub store methods that `throw new Error('not implemented')` | Either implement, or gate behind `VITE_USE_MOCKS` with a real fake data source. Never ship throwing stubs. |
| `<div onClick>` acting as a button; missing `aria-label` on icon-only controls | Real `<button>` / `IconButton` with a `label`; keyboard-focusable, `role`/`aria` set. |
| Raw axios call with a hardcoded `http://localhost:3000` URL | `apiClient` (baseURL from `VITE_API_BASE_URL`) + endpoint constant. |
| A component throwing on server error with no UI | `ErrorState` + `onRetry`; global `QueryCache.onError` toast as a backstop. |

---

## 5 · Migration notes — bring an existing JS feature up to standard incrementally

You do not need a big-bang rewrite. Migrate one feature at a time; the app stays green throughout.

- [ ] **Rename to TS in place.** `owner.service.js` → split: `api/owner.api.ts`, `api/owner.types.ts`, `api/owner.keys.ts`. Move each `normalizeOwner` into a single `toOwner(dto)` in `.types.ts`.
- [ ] **Route the data layer through `apiClient` + `unwrap`.** Delete the per-file `extractList` / `extractItem` ladders; call `unwrapList` / `unwrap`.
- [ ] **Replace fetch `useState`/`useEffect` with query hooks.** Swap `useEffect(load)` + `setLoading` for `useOwnersQuery`. Replace manual re-fetch with `invalidateQueries`.
- [ ] **Convert client state to a Zustand slice with selectors.** Keep `ownerStore.js` behavior but export `useX()` selector hooks; stop destructuring the whole store in components.
- [ ] **Swap raw JSX for UI Kit.** `OwnerTable.jsx` → compose `DataTable`; `ApproveOwnerModal.jsx` → `ConfirmDialog`. Move colors to tokens, `left/right` → logical props.
- [ ] **Fix auth:** remove the email-based role hack; derive role via `jwt-decode` in the auth store; make guards + `apiClient` read the store, not `localStorage`.
- [ ] **Extract strings to i18n.** Wrap every literal in `t('owner.*')`, add to both locale files.
- [ ] **Delete the corpses.** `auth.api.js`, `auth.endpoints.js`, unused `decodeToken.js`, `AuthLayout.jsx`, `DashboardHome.jsx`, `pages/Home.jsx` if superseded.
- [ ] **Verify after each feature** (§6). Migrate the next only when the current is green.

---

## 6 · Verification (run after every change — nothing ships red)

```bash
npm run typecheck     # tsc --noEmit — MUST be clean (strict), zero new errors
npm run lint          # eslint — clean
npm run dev           # smoke-test the feature in the browser
```
- [ ] `tsc --noEmit` reports **zero** new errors (strict mode).
- [ ] ESLint clean; no `any` leaks, no unused imports, no dead files left behind.
- [ ] Feature renders **loading / empty / error / success** — exercise via `VITE_USE_MOCKS` before the backend exists.
- [ ] Tested in **both** languages: `en` (LTR) and `ar` (RTL) — no clipped text, no mirrored-wrong layout; CSS uses logical props.
- [ ] No hardcoded colors, inline styles, hand-rolled modals/tables, manual server-loading flags, whole-store destructures, or `localStorage` reads in components.
- [ ] Every user string in **both** `en.json` and `ar.json`; consumed via `t()`.
- [ ] Interactive nodes have `data-testid` and correct `aria`; icon-only controls have a `label`.
- [ ] Route is lazy + guarded; the barrel exports only the feature's public surface.
- [ ] Re-read the diff — the change is additive and broke nothing existing.

---

## Do / Never recap

**Do**
- Build in layer order: types → schema → api → keys → hooks → (store) → components → page → route → i18n → states → verify.
- Reuse `@ui` primitives; extend one centrally when a variant is missing.
- Let TanStack Query own server state; Zustand (with selectors) own client state.
- Keep one `toXxx` mapper + shared `unwrap` + `toAppError`; tokens for all styling; logical CSS props for RTL.
- Mirror the owner-management `{ action }` pattern for approve/reject flows.

**Never**
- Hand-roll a modal/table/spinner, or fork a primitive into a feature.
- Add manual `loading`/`error` `useState` for server data.
- Destructure the whole Zustand store, read `localStorage` in a component, or derive role from an email.
- Hardcode colors/URLs, use inline styles, or use `left`/`right` in CSS.
- Ship throwing stub methods, dead files, a key in only one locale, or code with `tsc`/lint errors.

See also: [02-design-system.md](02-design-system.md) · [03-ui-kit.md](03-ui-kit.md) · [04-data-layer.md](04-data-layer.md) · [05-state-i18n-forms.md](05-state-i18n-forms.md).
