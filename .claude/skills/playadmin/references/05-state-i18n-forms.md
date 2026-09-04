# 05 · Client State, i18n & Forms

**Server state lives in TanStack Query (see 04-data-layer.md). This file owns the other three
pillars:** client/UI state in **Zustand v5**, bilingual **i18n (react-i18next + RTL)**, and
**forms (React Hook Form + Zod)**. Auth session is the one Zustand store the whole app depends on —
router guards and the axios client read it via `getState()`, never `localStorage` directly.

---

## 1 · authStore.ts — the single source of session truth

**Rule:** Role is **derived from the decoded JWT**, never from a hardcoded email. The current code's
`email === "test_admin@bplay.com" ? "super_admin" : "admin"` is a defect — delete it. The token is
the authority; `hydrateFromToken` re-derives everything from it on boot.

```ts
// src/shared/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import type { AdminRole, AuthUser, AuthSession } from '@/shared/types/common';

interface JwtPayload {
  sub: string;
  email: string;
  role: AdminRole;          // "super_admin" | "admin"
  name?: string;
  exp: number;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  role: AdminRole | null;
  isAuthenticated: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
  hydrateFromToken: (token: string | null) => void;
}

/** Decode + validate a JWT → derived session, or null if missing/expired/garbage. */
function decodeSession(token: string | null): Omit<AuthState, keyof AuthActions> | null {
  if (!token) return null;
  try {
    const p = jwtDecode<JwtPayload>(token);
    if (p.exp * 1000 <= Date.now()) return null;            // expired → treat as logged out
    return {
      accessToken: token,
      user: { id: p.sub, email: p.email, name: p.name ?? p.email },
      role: p.role,
      isAuthenticated: true,
    };
  } catch {
    return null;
  }
}

type AuthActions = Pick<AuthState, 'login' | 'logout' | 'hydrateFromToken'>;

const LOGGED_OUT = {
  accessToken: null,
  user: null,
  role: null,
  isAuthenticated: false,
} as const;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...LOGGED_OUT,

      // Called by the login mutation with the server's accessToken.
      // We STILL derive role from the token, never from the request body.
      login: (session: AuthSession) => {
        const derived = decodeSession(session.accessToken);
        set(derived ?? LOGGED_OUT);
      },

      logout: () => set(LOGGED_OUT),

      // Run once on app boot to rehydrate/validate the persisted token.
      hydrateFromToken: (token: string | null) => {
        set(decodeSession(token) ?? LOGGED_OUT);
      },
    }),
    {
      name: 'bplay-admin-auth',                 // localStorage key (replaces raw accessToken/user/role)
      // Persist ONLY the token; everything else is re-derived on load → no stale/forgeable role.
      partialize: (s) => ({ accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        state?.hydrateFromToken(state.accessToken);
      },
    },
  ),
);
```

### Exported selector hooks (import these — not the raw store)

```ts
// src/shared/stores/authStore.ts (continued)
export const useAccessToken = () => useAuthStore((s) => s.accessToken);
export const useAuthRole = () => useAuthStore((s) => s.role);
export const useAuthUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);

// Action selectors are stable references — safe to pull individually.
export const useLogin = () => useAuthStore((s) => s.login);
export const useLogout = () => useAuthStore((s) => s.logout);
```

### apiClient reads the store via getState() (no hook, no localStorage)

```ts
// src/shared/lib/apiClient.ts (excerpt — full file in 04-data-layer.md)
import { useAuthStore } from '@/shared/stores/authStore';

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;   // ← store is the authority
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();                 // clears session; guard redirects to /login
    }
    return Promise.reject(toAppError(error));
  },
);
```

### Router guards read the store (not localStorage)

```tsx
// src/app/router/guards.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useIsAuthenticated, useAuthRole } from '@/shared/stores/authStore';
import { paths } from './paths';
import type { AdminRole } from '@/shared/types/common';

export function RequireAuth() {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function RequireRole({ allow }: { allow: AdminRole[] }) {
  const role = useAuthRole();
  if (!role || !allow.includes(role)) {
    return <Navigate to={paths.forbidden} replace />;
  }
  return <Outlet />;
}
```

Usage in `routes.tsx`: wrap `super_admin`-only areas with
`<RequireRole allow={['super_admin']}>` (e.g. `/app/admin-management`), and `admin` fallback lands
on `/app/profile` — see 06-feature-workflow.md.

**Never:** read `localStorage.getItem('accessToken')` or `localStorage.getItem('role')` in a
component or guard. The store owns those keys now.

---

## 2 · The selector rule (prevents re-render storms)

**Rule:** Subscribe to the **smallest slice** you need. Every Zustand hook call must take a
selector that returns a primitive or a stable reference.

**Never destructure the whole store** — that subscribes the component to *every* state change:

```tsx
// ❌ BAD — re-renders on ANY auth change, even fields you don't use
const { user } = useAuthStore();

// ❌ BAD — new object literal every render → infinite re-render with useShallow-less v5
const { user, role } = useAuthStore((s) => ({ user: s.user, role: s.role }));
```

```tsx
// ✅ GOOD — one primitive slice, re-renders only when `user` changes
const user = useAuthUser();

// ✅ GOOD — need multiple slices? use useShallow so the tuple compares by value
import { useShallow } from 'zustand/react/shallow';
const [user, role] = useAuthStore(useShallow((s) => [s.user, s.role]));
```

Actions are already stable references, so pulling them one-by-one (`useLogout()`) never causes an
extra render. Prefer the pre-made selector hooks over inline selectors so the slice logic lives in
one place.

---

## 3 · Optional per-feature UI store (modals / filters)

**Rule:** Server data → TanStack Query. Ephemeral UI state that several components in one feature
share (which modal is open, current filter/search) → a small Zustand slice. A single field local to
one component stays in `useState`.

```ts
// src/features/admin-management/store/admin.store.ts
import { create } from 'zustand';
import type { AdminRole } from '@/shared/types/common';

interface AdminFilters {
  search: string;
  role: AdminRole | 'all';
  page: number;
}

interface AdminUiState {
  filters: AdminFilters;
  inviteOpen: boolean;
  editingId: string | null;
  setSearch: (v: string) => void;
  setRole: (v: AdminRole | 'all') => void;
  setPage: (p: number) => void;
  resetFilters: () => void;
  openInvite: () => void;
  closeInvite: () => void;
  openEdit: (id: string) => void;
  closeEdit: () => void;
}

const DEFAULT_FILTERS: AdminFilters = { search: '', role: 'all', page: 1 };

export const useAdminUiStore = create<AdminUiState>((set) => ({
  filters: DEFAULT_FILTERS,
  inviteOpen: false,
  editingId: null,

  // Changing search/role resets pagination to page 1.
  setSearch: (search) => set((s) => ({ filters: { ...s.filters, search, page: 1 } })),
  setRole: (role) => set((s) => ({ filters: { ...s.filters, role, page: 1 } })),
  setPage: (page) => set((s) => ({ filters: { ...s.filters, page } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  openInvite: () => set({ inviteOpen: true }),
  closeInvite: () => set({ inviteOpen: false }),
  openEdit: (id) => set({ editingId: id }),
  closeEdit: () => set({ editingId: null }),
}));

// Selector hooks — same discipline as auth.
export const useAdminFilters = () => useAdminUiStore((s) => s.filters);
export const useInviteOpen = () => useAdminUiStore((s) => s.inviteOpen);
```

Feed `filters` straight into the query key so filter changes refetch automatically:

```tsx
const filters = useAdminFilters();
const { data, isLoading } = useAdminsQuery(filters);   // adminKeys.list(filters) — see 04
```

For simple open/close you may prefer the `useDisclosure` hook (`shared/hooks`) over a store —
reserve the store for state that crosses component boundaries.

---

## 4 · i18n — react-i18next + RTL

Bilingual **en + ar**. Keys are namespaced `feature.area.key`. RTL is driven by syncing
`document.documentElement.dir` and CSS **logical properties** (`margin-inline`, `text-align: start`)
— never physical `left`/`right`. See 02-design-system.md for the logical-property rule.

### Config

```ts
// src/shared/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ar from './locales/ar.json';

export const SUPPORTED_LNGS = ['en', 'ar'] as const;
export type AppLang = (typeof SUPPORTED_LNGS)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LNGS as unknown as string[],
    interpolation: { escapeValue: false },        // React already escapes
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'bplay-admin-lang',
      caches: ['localStorage'],
    },
  });

// Keep <html dir/lang> in sync with the active language on every change + at boot.
export function applyDirection(lng: string) {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
}
i18n.on('languageChanged', applyDirection);
applyDirection(i18n.language);

export default i18n;
```

`I18nProvider` (in `app/providers`) simply imports this module for its side effects and wraps
children — react-i18next reads the shared `i18n` singleton, so no explicit provider prop is needed
beyond importing `./shared/i18n` once in `main.tsx`.

### Locale files — `feature.area.key`

```json
// src/shared/i18n/locales/en.json
{
  "common": {
    "actions": { "save": "Save", "cancel": "Cancel", "confirm": "Confirm", "retry": "Retry" },
    "states": { "loading": "Loading…", "empty": "Nothing here yet", "error": "Something went wrong" }
  },
  "admin": {
    "invite": {
      "title": "Invite admin",
      "emailLabel": "Email",
      "roleLabel": "Role",
      "submit": "Send invite",
      "success": "Invite sent to {{email}}"
    },
    "table": { "count_one": "{{count}} admin", "count_other": "{{count}} admins" }
  }
}
```

```json
// src/shared/i18n/locales/ar.json  (same key tree — values Arabic; placeholder English at seed time)
{
  "common": {
    "actions": { "save": "حفظ", "cancel": "إلغاء", "confirm": "تأكيد", "retry": "إعادة المحاولة" },
    "states": { "loading": "جارٍ التحميل…", "empty": "لا يوجد شيء بعد", "error": "حدث خطأ ما" }
  },
  "admin": {
    "invite": {
      "title": "دعوة مشرف",
      "emailLabel": "البريد الإلكتروني",
      "roleLabel": "الدور",
      "submit": "إرسال الدعوة",
      "success": "تم إرسال الدعوة إلى {{email}}"
    },
    "table": { "count_one": "مشرف واحد", "count_other": "{{count}} مشرفين" }
  }
}
```

**Rule:** en.json and ar.json must have **identical key trees**. Seed missing Arabic values with the
English string rather than omitting the key (never leaves a raw key on screen).

### Usage + interpolation

```tsx
import { useTranslation } from 'react-i18next';

function InviteHeader({ email }: { email: string }) {
  const { t } = useTranslation();
  return (
    <>
      <h2>{t('admin.invite.title')}</h2>
      <p>{t('admin.invite.success', { email })}</p>
      <span>{t('admin.table.count', { count: 5 })}</span>   {/* auto-selects _one / _other */}
    </>
  );
}
```

### LanguageSwitcher + useDirection

```tsx
// src/shared/ui/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LNGS } from '@/shared/i18n';
import styles from './LanguageSwitcher.module.css';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <div className={styles.group} role="group" aria-label="Language">
      {SUPPORTED_LNGS.map((lng) => (
        <button
          key={lng}
          type="button"
          data-testid={`lang-${lng}`}
          className={i18n.language === lng ? styles.active : styles.button}
          aria-pressed={i18n.language === lng}
          onClick={() => i18n.changeLanguage(lng)}   // fires languageChanged → applyDirection()
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

```ts
// src/shared/hooks/useDirection.ts
import { useTranslation } from 'react-i18next';

export function useDirection(): { dir: 'rtl' | 'ltr'; isRtl: boolean } {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  return { dir: isRtl ? 'rtl' : 'ltr', isRtl };
}
```

Use `useDirection()` only for the rare JS-side need (e.g. framer-motion x-offset, chart direction).
For layout, **CSS logical properties handle RTL automatically** once `<html dir>` flips — you should
almost never branch on `isRtl` in CSS.

---

## 5 · Forms — React Hook Form + Zod

**Rule:** No hand-rolled form state, no inline validation. One Zod schema per form lives in
`<feature>.schema.ts`; wire it with `zodResolver`; render fields through the kit's `Field` + `Input`
(03-ui-kit.md); disable submit while `isSubmitting`; map server `AppError.fieldErrors` back onto the
form with `setError`.

### Schema

```ts
// src/features/admin-management/api/admin.schema.ts
import { z } from 'zod';

export const inviteAdminSchema = z.object({
  email: z.string().min(1, 'admin.invite.errors.emailRequired').email('admin.invite.errors.emailInvalid'),
  role: z.enum(['admin', 'super_admin'], { message: 'admin.invite.errors.roleRequired' }),
});

// Zod-inferred type is the single source of truth for the form values.
export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;
```

Error strings are i18n **keys** (resolved by `t()` at render), so validation is bilingual for free.

### The form component

```tsx
// src/features/admin-management/components/InviteAdminForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Field, Input, Select, Button } from '@ui';
import { AppError } from '@/shared/lib/errors';
import { useInviteAdminMutation } from '../hooks/useInviteAdminMutation';
import { inviteAdminSchema, type InviteAdminInput } from '../api/admin.schema';

export function InviteAdminForm({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const invite = useInviteAdminMutation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteAdminInput>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: { email: '', role: 'admin' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await invite.mutateAsync(values);          // mutation toasts success + invalidates keys (04)
      onSuccess?.();
    } catch (err) {
      // Map server-side validation onto the exact fields.
      if (err instanceof AppError && err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([name, message]) => {
          setError(name as keyof InviteAdminInput, { type: 'server', message });
        });
        return;
      }
      // Non-field error → surface at the form root.
      setError('root.serverError', {
        type: 'server',
        message: err instanceof AppError ? err.message : t('common.states.error'),
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate data-testid="invite-admin-form">
      <Field label={t('admin.invite.emailLabel')} error={errors.email && t(errors.email.message!)} required>
        <Input type="email" autoComplete="email" {...register('email')} />
      </Field>

      <Field label={t('admin.invite.roleLabel')} error={errors.role && t(errors.role.message!)} required>
        <Select
          options={[
            { label: t('admin.roles.admin'), value: 'admin' },
            { label: t('admin.roles.super_admin'), value: 'super_admin' },
          ]}
          {...register('role')}
        />
      </Field>

      {errors.root?.serverError && (
        <p role="alert" className="form-error">{errors.root.serverError.message}</p>
      )}

      <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting} fullWidth>
        {t('admin.invite.submit')}
      </Button>
    </form>
  );
}
```

**Notes**
- `register` returns a `ref` — the kit's `Input`/`Select` are `forwardRef`, so spreading works.
- `errors.<field>.message` is an **i18n key**; wrap it in `t()` at render (`t(errors.email.message!)`).
- `isSubmitting` (RHF) drives both the button spinner and its disabled state — one source of truth.
- Field-level server errors come from `AppError.fieldErrors` (populated in `toAppError`, 04); root
  errors go on `root.serverError`.
- The **mutation** owns success toast + cache invalidation; the form owns only validation + error
  mapping. Don't duplicate toast logic here.

---

## Do / Never recap

**Do**
- Derive role from the decoded JWT; persist only the token; re-derive on rehydrate.
- Read auth via selector hooks (`useAccessToken`, `useAuthRole`, `useIsAuthenticated`); guards +
  apiClient read `useAuthStore.getState()`.
- Subscribe to the smallest slice; use `useShallow` for multi-field selections.
- Keep en/ar key trees identical; sync `<html dir/lang>` on `languageChanged`; style RTL with
  logical properties.
- Define one Zod schema per form, resolve with `zodResolver`, render via `Field`+`Input`, disable
  submit on `isSubmitting`, map `AppError.fieldErrors` with `setError`.

**Never**
- Read/write `localStorage` auth keys directly, or set role from an email.
- Destructure the whole Zustand store or return a fresh object literal from a selector without
  `useShallow`.
- Put server data in Zustand, or hand-roll loading/error flags for a form.
- Use physical `left`/`right` in CSS, or omit an Arabic key (seed it with English instead).
- Hand-roll validation or read `errors` message strings without passing them through `t()`.

See also: 04-data-layer.md (queries/mutations/AppError), 03-ui-kit.md (Field/Input/Select/Button),
02-design-system.md (logical-property RTL rule), 06-feature-workflow.md (guards wiring).
