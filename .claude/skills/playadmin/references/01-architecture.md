# 01 — Architecture & App Shell

The layered TypeScript structure, dependency rules, feature-slice anatomy, path aliases, provider composition, routing, guards, and layouts for **bplay-admin**. Read this before adding any feature, route, or shared primitive. Sibling files: `02-design-system.md`, `03-ui-kit.md`, `04-data-layer.md`, `05-state-i18n-forms.md`.

---

## 1. Folder structure — and why each layer exists

```
src/
  main.tsx                   # ReactDOM root; mounts <App/>
  app/
    App.tsx                  # provider composition ONLY (no routes logic beyond <AppRouter/>)
    providers/               # QueryProvider, I18nProvider, ToastProvider, AppErrorBoundary
    router/
      routes.tsx             # lazy route tree + <Suspense> fallback
      guards.tsx             # RequireAuth, RequireRole
      paths.ts               # centralized path constants (no string literals in components)
  shared/
    ui/                      # UI Kit primitives (Button, Input, Modal, DataTable…) + barrel
    lib/                     # apiClient.ts, queryClient.ts, errors.ts, storage.ts
    hooks/                   # useDebounce, useDisclosure, useDirection…
    i18n/                    # index.ts (config), locales/en.json, locales/ar.json
    stores/                  # authStore.ts, uiStore.ts (Zustand)
    types/                   # api.ts (ApiEnvelope, unwrap), common domain types
    utils/                   # formatters, guards
  styles/
    tokens.css               # THE single design-token source (see 02)
    globals.css              # reset + base + imports tokens.css
  features/<feature>/
    api/<feature>.api.ts     # typed service fns → apiClient
    api/<feature>.keys.ts    # query-key factory
    api/<feature>.types.ts   # DTOs + domain types + mappers
    api/<feature>.schema.ts  # zod schemas
    hooks/                   # useXQuery.ts / useXMutation.ts (TanStack Query)
    store/<feature>.store.ts # OPTIONAL zustand UI slice (modals/filters)
    components/*.tsx + *.module.css
    pages/*.tsx
    index.ts                 # barrel (public surface of the slice)
```

**Why each layer:**

| Layer | Purpose | Rule |
|-------|---------|------|
| `app/` | Composition root: providers, router, guards. The only place that knows the whole app. | Contains no business logic. |
| `shared/ui/` | Presentational, app-agnostic primitives styled with tokens. | Zero knowledge of features or server data. |
| `shared/lib/` | Cross-cutting infrastructure: HTTP, query client, error model, storage. | No React components. |
| `shared/stores/` | Global client state (auth, UI) via Zustand. | Consumed via selectors, never destructured whole. |
| `styles/` | Single token source + global reset. | Every color/space/radius lives here (see 02). |
| `features/<x>/` | A vertical slice: its own api/hooks/store/components/pages. | Self-contained; talks to siblings only through their barrel. |

**Rule:** a feature owns its data layer, UI, and state. **Never:** import another feature's internal file — go through `@features/<x>` barrel (and ideally not at all; lift shared concepts to `shared/`).

---

## 2. Dependency direction (one-way)

```
pages  ─▶  hooks (TanStack Query)  ─▶  api/service  ─▶  apiClient (shared/lib)
  │                                        │
  └──▶ components ──▶ shared/ui            └──▶ types + mappers (api.types)
                       │
                       └──▶ styles/tokens.css (via CSS Modules)
```

- **Pages** orchestrate: call query/mutation hooks, compose components, own route-level layout.
- **Hooks** wrap TanStack Query around the api service fns; they hold the query keys + invalidation. No `fetch`/`axios` here.
- **api/service** are typed async fns that call `apiClient` and unwrap/map DTOs → domain types.
- **components** are presentational; they receive data + callbacks as props and render `shared/ui`.
- **shared/ui** depends only on `styles/tokens.css` and its own module CSS.

**Rule:** dependencies point **downward only**. **Never:** `shared/ui` importing a feature; a component calling `apiClient` directly; a page doing raw axios. Pages get data through hooks; components get data through props.

---

## 3. Anatomy of a feature slice (concrete listing)

`features/admin-management/` — the super-admin CRUD for admin accounts:

```
features/admin-management/
  api/
    admin-management.types.ts    # AdminDto, Admin, toAdmin(dto), CreateAdminInput
    admin-management.api.ts      # getAdmins, createAdmin, updateAdmin, deleteAdmin, toggleActive
    admin-management.keys.ts     # adminKeys factory
    admin-management.schema.ts   # createAdminSchema, updateAdminSchema (zod)
  hooks/
    useAdminsQuery.ts            # useQuery(adminKeys.list(params))
    useCreateAdminMutation.ts    # invalidates adminKeys.lists() + toast
    useToggleAdminMutation.ts    # optimistic is_active toggle
  store/
    admin-management.store.ts     # OPTIONAL: modal open flag + table filters
  components/
    AdminTable.tsx + .module.css
    AdminFormModal.tsx + .module.css
    AdminRowActions.tsx + .module.css
  pages/
    AdminManagementPage.tsx + .module.css
  index.ts                       # export { AdminManagementPage } and public hooks/types
```

Data flow for this slice: `AdminManagementPage` → `useAdminsQuery()` → `getAdmins()` → `apiClient.get('/admin/admin-management')` → `unwrap` → `toAdmin` mapper → typed `Admin[]` → `<DataTable<Admin>>`. Full templates for each file live in `04-data-layer.md` and `05-state-i18n-forms.md`.

---

## 4. Path aliases

Declare aliases in **both** `vite.config.ts` (runtime resolve) and `tsconfig.json` (type resolution). They must match exactly.

**`vite.config.ts`:**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/shared/ui', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/shared/lib', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
    },
  },
});
```

**`tsconfig.json`** (compilerOptions):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@ui": ["src/shared/ui"],
      "@ui/*": ["src/shared/ui/*"],
      "@lib": ["src/shared/lib"],
      "@lib/*": ["src/shared/lib/*"],
      "@features/*": ["src/features/*"]
    }
  },
  "include": ["src", "vite-env.d.ts"]
}
```

**Rule:** import shared primitives via aliases — `import { Button } from '@ui'`, `import { apiClient } from '@lib/apiClient'`. **Never:** deep relative chains (`../../../shared/ui/Button`).

---

## 5. Providers composition

`App.tsx` composes providers in a fixed order: **QueryClientProvider ▸ I18nextProvider ▸ ToastProvider ▸ AppErrorBoundary ▸ BrowserRouter ▸ AppRouter**. The error boundary sits inside i18n/toast (so it can translate + toast) but outside the router (so a route crash is caught).

**`src/main.tsx`:**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**`src/app/App.tsx`:**

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@lib/queryClient';
import i18n from '@/shared/i18n';
import { ToastProvider } from './providers/ToastProvider';
import { AppErrorBoundary } from './providers/AppErrorBoundary';
import { AppRouter } from './router/routes';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ToastProvider>
          <AppErrorBoundary>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </AppErrorBoundary>
        </ToastProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
```

**`src/app/providers/AppErrorBoundary.tsx`** (class boundary + translated fallback):

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@ui';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO: forward to monitoring; console for now
    console.error('AppErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Something went wrong"
          message="An unexpected error occurred. Please reload."
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
```

`QueryProvider`/`ToastProvider` internals (queryClient config, toast context) are defined in `04-data-layer.md` and `03-ui-kit.md`; import them here.

---

## 6. Routing

### 6.1 Path constants — `src/app/router/paths.ts`

```ts
export const paths = {
  root: '/',
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  app: '/app',
  adminManagement: '/app/admin-management',
  ownerManagement: '/app/owner-management',
  regionManagement: '/app/region-management',
  profile: '/app/profile',
} as const;
```

### 6.2 Route tree — `src/app/router/routes.tsx`

Lazy-load every page; wrap the tree in one `<Suspense>` with a Spinner fallback. Groups: **public/auth**, **dashboard (guarded)**.

```tsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { paths } from './paths';
import { RequireAuth, RequireRole } from './guards';
import { Spinner } from '@ui';
import { DashboardLayout } from '@/shared/ui/layouts/DashboardLayout';
import { MainLayout } from '@/shared/ui/layouts/MainLayout';

const LoginPage = lazy(() => import('@features/auth/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@features/auth/pages/ResetPasswordPage'));
const AdminManagementPage = lazy(() => import('@features/admin-management/pages/AdminManagementPage'));
const OwnerManagementPage = lazy(() => import('@features/owner-management/pages/OwnerManagementPage'));
const RegionManagementPage = lazy(() => import('@features/region-management/pages/RegionManagementPage'));
const ProfilePage = lazy(() => import('@features/profile/pages/ProfilePage'));

export function AppRouter() {
  return (
    <Suspense fallback={<Spinner size="lg" label="Loading…" />}>
      <Routes>
        {/* public / auth */}
        <Route element={<MainLayout />}>
          <Route path={paths.login} element={<LoginPage />} />
          <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={paths.resetPassword} element={<ResetPasswordPage />} />
        </Route>

        {/* dashboard (auth required) */}
        <Route
          path={paths.app}
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route
            path={paths.adminManagement}
            element={
              <RequireRole role="super_admin">
                <AdminManagementPage />
              </RequireRole>
            }
          />
          <Route
            path={paths.ownerManagement}
            element={
              <RequireRole role="super_admin">
                <OwnerManagementPage />
              </RequireRole>
            }
          />
          <Route
            path={paths.regionManagement}
            element={
              <RequireRole role="super_admin">
                <RegionManagementPage />
              </RequireRole>
            }
          />
          <Route path={paths.profile} element={<ProfilePage />} />
        </Route>

        <Route path={paths.root} element={<Navigate to={paths.app} replace />} />
        <Route path="*" element={<Navigate to={paths.app} replace />} />
      </Routes>
    </Suspense>
  );
}
```

Note the child routes use **absolute** paths that match `paths.*`; react-router v7 resolves them against the parent `/app` element. (Alternatively use relative segments — keep them centralized in `paths.ts` either way.)

### 6.3 Guards — `src/app/router/guards.tsx`

Guards read the **auth store selectors**, never `localStorage`. `RequireAuth` redirects unauthenticated users to `/login` (preserving intended location). `RequireRole` redirects an authenticated-but-wrong-role user to their default landing.

```tsx
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated, useAuthRole } from '@/shared/stores/authStore';
import { paths } from './paths';
import type { Role } from '@/shared/types/common';

const defaultLandingFor: Record<Role, string> = {
  super_admin: paths.adminManagement,
  admin: paths.profile,
};

export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const currentRole = useAuthRole();
  if (currentRole !== role) {
    return <Navigate to={currentRole ? defaultLandingFor[currentRole] : paths.login} replace />;
  }
  return <>{children}</>;
}
```

**Rule:** all access control derives from `authStore` (role from decoded JWT — see 05). **Never:** read `localStorage.getItem('role')` or gate on a hardcoded email in a component.

---

## 7. Layouts + role-aware shell

Two layouts, both rendering `<Outlet/>`:

- **`MainLayout`** — bare centered container for auth/public pages (no sidebar).
- **`DashboardLayout`** — Header + role-aware Sidebar + content; Sidebar collapses to a drawer below `md (768px)` via a `uiStore` `isSidebarOpen` flag.

**`src/shared/ui/layouts/DashboardLayout.tsx`:**

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../shell/Sidebar';
import { Header } from '../shell/Header';
import { Footer } from '../shell/Footer';
import { useIsSidebarOpen } from '@/shared/stores/uiStore';
import styles from './DashboardLayout.module.css';

export function DashboardLayout() {
  const isSidebarOpen = useIsSidebarOpen();
  return (
    <div className={styles.shell} data-sidebar-open={isSidebarOpen}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
```

`DashboardLayout.module.css` uses logical properties for RTL and a media query for the drawer:

```css
.shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-block-size: 100vh;
  background: var(--color-bg);
}
.content {
  padding-inline: var(--space-6);
  padding-block: var(--space-6);
}
@media (max-width: 768px) {
  .shell { grid-template-columns: 1fr; }
  /* Sidebar renders as an overlay drawer toggled by data-sidebar-open */
}
```

**Role-aware nav** — the Sidebar builds its items from the auth role selector; super_admin sees management links, admin sees only Profile:

```tsx
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthRole } from '@/shared/stores/authStore';
import { paths } from '@/app/router/paths';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const role = useAuthRole();
  const { t } = useTranslation();

  const items = [
    ...(role === 'super_admin'
      ? [
          { to: paths.adminManagement, label: t('nav.adminManagement') },
          { to: paths.ownerManagement, label: t('nav.ownerManagement') },
          { to: paths.regionManagement, label: t('nav.regionManagement') },
        ]
      : []),
    { to: paths.profile, label: t('nav.profile') },
  ];

  return (
    <aside className={styles.sidebar}>
      <nav>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}
            data-testid={`nav-${item.to}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

The **Header** exposes the language toggle (updates `document.documentElement.dir`/`lang` — see 05) and a logout action calling `authStore.logout()`; the mobile drawer toggle flips `uiStore.toggleSidebar()`.

---

## 8. Barrels (`index.ts`)

- Every `shared/ui` primitive is re-exported from `src/shared/ui/index.ts` (the `@ui` barrel).
- Every feature exposes its **public** surface via `features/<x>/index.ts` — pages consumed by the router, plus hooks/types other slices legitimately need.
- Internal components/api files are **not** re-exported; they stay private to the slice.

```ts
// src/features/admin-management/index.ts
export { default as AdminManagementPage } from './pages/AdminManagementPage';
export { useAdminsQuery } from './hooks/useAdminsQuery';
export type { Admin } from './api/admin-management.types';
```

**Rule:** cross-slice imports go through the barrel only. **Never:** barrel-export a whole feature's internals or create circular barrels (a feature importing another feature's barrel that imports back).

---

## Migration notes (current JS app → this standard)

> The existing app is **JavaScript**, uses a **single guard** with **raw `localStorage` reads** in components, derives role from a **hardcoded email** (`email === 'test_admin@bplay.com'`), and hits `http://localhost:3000/api/v1` inline. New code follows this document; existing pages get aligned during the refactor:
> - Convert `.jsx` → `.tsx`; enable `strict`. New files are TS-only.
> - Move all `localStorage` access behind `authStore` (persist key `bplay-admin-auth`); components read selectors.
> - Derive `role` from the **decoded JWT** (`jwt-decode`), delete the hardcoded-email branch.
> - Replace the single ad-hoc guard with `RequireAuth` + `RequireRole`.
> - Move the API base to `import.meta.env.VITE_API_BASE_URL`; centralize HTTP in `@lib/apiClient`.
> - Replace manual `loading`/`error` flags with TanStack Query hooks.
> - Route the unused `dashboard` feature or remove it.

---

## Do / Never recap

**Do**
- Keep dependencies pointing downward: pages → hooks → api → apiClient.
- Compose providers in the fixed order (Query ▸ i18n ▸ Toast ▸ ErrorBoundary ▸ Router).
- Lazy-load every page under one `<Suspense>`; centralize paths in `paths.ts`.
- Drive guards, apiClient auth, and role-aware nav from `authStore` selectors.
- Keep each feature a self-contained slice; expose only its barrel.
- Use path aliases and CSS Modules + tokens for every component.

**Never**
- Read `localStorage` or a hardcoded email for auth/role in components.
- Call axios/`apiClient` from a component or page (go through a hook).
- Import another feature's internal file, or let `shared/ui` know about a feature.
- Use deep relative import chains, `left/right` CSS, or hardcoded colors.
- Put business logic in `App.tsx` or duplicate error-message extraction (use `toAppError`).
