---
name: playadmin
description: >-
  The bplay-admin build standard (React 19 + TypeScript). Invoke before creating
  or modifying ANY feature, page, component, hook, store, service, or style in the
  Bplay super-admin / admin dashboard. Encodes the exact professional architecture
  (feature-slice + TanStack Query + Zustand + React Hook Form/Zod), the "Pitch
  Forest" design-token system ported 1:1 from the Bplay mobile app, the shared UI
  Kit, the mock-data-first (backend-not-ready) strategy, bilingual EN+AR/RTL, and
  the new-feature workflow + verification. Use it so every line matches the codebase
  and every page looks like one designer built it — zero drift, world-class quality.
---

# /playadmin — The Bplay Admin Build Standard

You are a **senior React + TypeScript architect** building **bplay-admin** (the super-admin /
admin dashboard for the Bplay sports-facility booking & club-management platform) to a
**world-class, production-grade** standard. When this skill is active you do not write
"ordinary" React — you write code that is **clean, strongly typed, consistent, fully
responsive, accessible, performant, and architecturally exact**. **Every page must look like
it was designed by the same hand, in the same colors as the Bplay app.** No drift. No
regressions.

This skill is the **single source of truth**. It was built by reading the real bplay-admin
source (`src/`), the reference Flutter build standard (`/play`), and the Bplay mobile app's
**Palette** (`D:/Bplay/Bplay-mobile/lib/core/styles/palette.dart`) — the authoritative color
system. Every token, signature, and template here is **grounded in the real source**. Do not
invent APIs. If something is missing, open the referenced file and confirm before writing.

> **Project root:** the dashboard lives in `bplay-admin/` (`src/…`). All paths below are
> relative to `bplay-admin/` unless noted. The app is migrating **JS → TypeScript**; all new
> code is `.ts` / `.tsx`.

---

## 0. How to operate when `/playadmin` is active

1. **Understand before you write.** Read the relevant [reference file(s)](references/) for the
   layer you're touching, and the nearest existing feature (`admin-management` is the canonical
   CRUD slice) and mirror it.
2. **Reuse, never reinvent.** Before building anything, check whether it already exists — a
   **UI Kit primitive** (`@ui`), a design **token** (`var(--…)`), a **query hook**, an **auth
   selector**, a shared **type**. If it exists, use it. Hand-rolling a duplicate (a modal, a
   button, a table, a color) is a defect.
3. **Match the app's design language exactly.** Colors come **only** from the Pitch-Forest
   tokens (ported from the mobile app). The whole dashboard is one dark, forest-green,
   frosted-glass world with mint accents and cream text. Same palette, type scale, spacing
   rhythm, radii, and component styles on **every** page.
4. **Wire for a missing backend — mock-data first.** Remaining features are built **without a
   live backend**, fully working on **professional mock data**, and structured so going live =
   **flipping one flag** (`VITE_USE_MOCKS`) / swapping one data source. Every feature must
   render **loading / empty / error / success** states convincingly before the backend exists.
   See [04 · backend-not-ready](references/04-data-layer.md).
5. **Verify, every time.** After any change run `npx tsc --noEmit` (clean), `npm run lint`
   (clean), and `npm run build` (**must compile**). tsc/eslint are static gates — a real build
   plus a manual smoke of the four states is required for non-trivial work. See
   [07 · verification](references/07-verification.md). **Never report done while a type or build
   error exists.**
6. **Never break what works.** When editing, re-read the surrounding code; keep changes additive
   and safe.

---

## 1. The Golden Rules (non-negotiable)

1. **Feature-slice + clean layering.** `page → query/mutation hook → feature api (service) →
   apiClient`. UI composes from `@ui`. Data flows **downward only**: pages/components never
   import from a sibling feature's internals; shared code lives in `shared/`. Full map →
   [01-architecture.md](references/01-architecture.md).
2. **TypeScript, strict.** No `any`, no `@ts-ignore`, no untyped props. Every component, hook,
   service, and store is fully typed. DTOs and domain types live in `<feature>/api/*.types.ts`.
3. **Server state = TanStack Query. Client state = Zustand.** All fetching/caching/loading/error
   for backend data goes through **`useQuery` / `useMutation`** — **never** a manual
   `useState(loading)` + `try/catch` for server data. Zustand holds only **auth session** and
   **UI state** (modals, filters), always read via **selectors**. See
   [04](references/04-data-layer.md) & [05](references/05-state-i18n-forms.md).
4. **Colors, spacing, type, radius, shadow — tokens only.** Style exclusively through
   `var(--token)` from `styles/tokens.css` (the Pitch-Forest system). **Never** a raw hex/rgba
   in a component or feature CSS, and **never** an inline `style={{…}}` object. The lone
   tolerated raw value is `transparent`. See [02-design-system.md](references/02-design-system.md).
5. **The palette is the app's palette.** Brand primary is luminous **mint** `sageMist #CDECC6`
   (dark ink on it), surfaces are **pitch greens** (`#0A1B13` stage, `#122A20` card), text is
   **cream** `#ECFBE8`, secondary is warm **amber** `#D4A373`. Status vocabulary:
   active mint / pending `#FBBF24` / warn `#FB923C` / info `#93C5FD` / danger `#F87171` /
   neutral `#9CA3AF` (fill @12%, border @35%). This is ported 1:1 from the mobile `Palette`.
6. **Styling = CSS Modules.** Each component has `Foo.tsx` + `Foo.module.css`; import
   `styles from './Foo.module.css'` and use `className={styles.card}`. No global class leakage,
   no styling libraries fighting the tokens.
7. **Reuse the UI Kit.** Compose every screen from `@ui` primitives — `Button`, `IconButton`,
   `Field`, `Input`, `Select`, `Textarea`, `Modal`, `ConfirmDialog`, `DataTable`, `Badge`,
   `Card`, `Alert`, `Spinner`, `EmptyState`, `ErrorState`, `Pagination`, `SearchInput`, and
   `useToast()`. Never hand-roll a modal/table/button. Need a variant a primitive lacks?
   **Evolve the primitive centrally** (add an optional prop) — never fork a private copy into a
   feature. See [03-ui-kit.md](references/03-ui-kit.md).
8. **Forms = React Hook Form + Zod.** Schema in `<feature>/api/*.schema.ts`,
   `useForm({ resolver: zodResolver(schema) })`, fields wired through `Field`/`Input`, submit
   disabled while `isSubmitting`, server field errors mapped back via `setError`. No hand-rolled
   validation. See [05](references/05-state-i18n-forms.md).
9. **Fully bilingual (EN + AR) — no hardcoded UI strings, ever.** Every user-facing string is a
   key in **both** `shared/i18n/locales/en.json` **and** `ar.json`, consumed via
   `const { t } = useTranslation(); t('feature.area.key')`. The dashboard supports **RTL**: set
   `document.documentElement.dir` on language change and lay out with **CSS logical properties**
   (`margin-inline-start`, `padding-inline`, `inset-inline-start`, `text-align: start`) — never
   `left`/`right`/`margin-left`. Default font is **Cairo** (Arabic-first). See
   [05](references/05-state-i18n-forms.md).
10. **Networking through the seam only.** One axios client (`shared/lib/apiClient.ts`) with
    `baseURL` from **`import.meta.env.VITE_API_BASE_URL`**, a request interceptor (Bearer token
    from the auth store) and a response interceptor (**401 → refresh-or-logout**, all errors
    normalized via `toAppError`). Feature services call `apiClient` with **typed** functions and
    real endpoints. Never inline a URL or a raw axios call in a component.
11. **Auth via the store, not localStorage reads.** The `authStore` (Zustand + persist) owns the
    session; **role comes from the decoded JWT**, never a hardcoded email. Router guards and the
    apiClient read `authStore.getState()`. See [05](references/05-state-i18n-forms.md).
12. **Accessibility is not optional.** Every input has a label/`aria-label`; modals are
    `role="dialog"` + `aria-modal`, focus-trapped, and Esc-closable; errors use `role="alert"`;
    interactive elements are keyboard-reachable with a visible `:focus-visible` ring; contrast
    meets WCAG AA. The Kit bakes this in — don't undo it.
13. **Performance + safety.** Lazy-load routes (`React.lazy` + `Suspense`), `memo`/`useCallback`
    where it prevents re-render storms, Zustand **selectors** (never destructure the whole
    store), `queryClient` sane defaults. Add `data-testid` to interactive nodes. No dead code, no
    `console.log`, no leftover mock residue in a live path.
14. **Consistency is the product.** Same layout shell, same spacing rhythm, same button/table/
    modal, same empty/error/loading treatment on every page. A new screen that looks or behaves
    differently from the rest is a bug, even if it "works".

> The current scaffold contains many pre-existing violations of these rules (blue hardcoded
> colors instead of the app palette, hand-rolled modals/tables, manual loading flags, role from
> a hardcoded email, dead files, no i18n, no responsiveness below the sidebar). **Do not
> replicate them.** New code follows the rules above; existing pages are aligned during the
> refactor (see [06 · migration notes](references/06-feature-workflow.md)).

---

## 2. Architecture at a glance

```
src/
  main.tsx
  app/
    App.tsx                 # providers: QueryClient > I18n > Toast > ErrorBoundary > Router
    providers/              # QueryProvider, I18nProvider, ToastProvider, AppErrorBoundary
    router/                 # routes.tsx (LAZY), guards.tsx (RequireAuth/RequireRole), paths.ts
  shared/
    ui/                     # the UI Kit (Button, Modal, DataTable, Badge, …) + barrel index.ts
    lib/                    # apiClient.ts, queryClient.ts, errors.ts, storage.ts
    stores/                 # authStore.ts, uiStore.ts (Zustand)
    i18n/                   # index.ts + locales/{en,ar}.json
    hooks/  types/  utils/
  styles/
    tokens.css              # THE Pitch-Forest design-token source (colors/space/type/…)
    globals.css             # reset + base + tokens import
  features/<feature>/
    api/  { <f>.api.ts · <f>.keys.ts · <f>.types.ts · <f>.schema.ts }
    hooks/ { useXQuery.ts · useXMutation.ts }     # TanStack Query
    store/ <f>.store.ts     # OPTIONAL zustand UI slice (modals/filters)
    components/ *.tsx + *.module.css              # composed from @ui
    pages/ *.tsx
    index.ts                # barrel
```

**Dependency direction (never violate):** `page → hooks(query) → api(service) → apiClient →
backend`; components → `@ui` + tokens; features → `shared`, never a sibling feature.
Full detail → [references/01-architecture.md](references/01-architecture.md).

---

## 3. Design system — the Pitch-Forest tokens (the core visual rule)

**All color/space/type/radius/shadow comes from `styles/tokens.css`**, ported 1:1 from the Bplay
app so the dashboard is visually identical in feel. Key tokens (full file →
[02-design-system.md](references/02-design-system.md)):

| Role | Token | Value |
|---|---|---|
| App background (stage) | `--color-bg` | `#0A1B13` |
| Card / surface | `--color-surface` | `#122A20` |
| Raised surface | `--color-surface-2` | `#1F3D31` |
| Primary accent (mint) | `--color-primary` | `#CDECC6` |
| Ink on primary | `--color-on-primary` | `#0C1F17` |
| Secondary (amber) | `--color-secondary` | `#D4A373` |
| Text | `--color-text` | `#ECFBE8` |
| Muted / subtle text | `--color-text-muted` / `--color-text-subtle` | `#A9C2A4` / `#7E967C` |
| Border / focus ring | `--color-border` / `--color-focus` | `#24382C` / `#CDECC6` |
| Status active/pending/warn/info/danger/neutral | `--color-status-*` | `#CDECC6 / #FBBF24 / #FB923C / #93C5FD / #F87171 / #9CA3AF` |

- **Spacing** on a 4px base (`--space-1…--space-20`). **Radius** `--radius-sm…--radius-full`.
  **Type** `--text-xs…--text-5xl`, font `--font-sans: 'Cairo', system-ui, …` (Arabic-first).
  **Shadows** `--shadow-sm/md/lg`. **Transitions** `--transition-fast/normal/slow`. **Z-index**
  `--z-header/sidebar/dropdown/modal/toast`.
- **Rule:** never a raw hex/rgba/inline-style in a component. Gradients, shadows, and status
  fills are pre-defined token recipes. **Never** `left`/`right` — use logical properties for RTL.
- **Responsive:** mobile-first, breakpoints `xs480 sm640 md768 lg1024 xl1280`; the sidebar
  collapses to a **drawer below 768px** (kills the fixed `250px` desktop-only layout).

---

## 4. The UI Kit — reuse these (never hand-roll)

The app's design system as code. Import from `@ui`. Full signatures + a11y + templates →
[03-ui-kit.md](references/03-ui-kit.md).

| Primitive | One-liner |
|---|---|
| `Button` / `IconButton` | Token-styled CTA with `variant`/`size`/`isLoading` (spinner + disabled). |
| `Field` + `Input` / `Select` / `Textarea` | Labeled, `role="alert"` errors, RHF-ready (`forwardRef`). |
| `Modal` | Portal + focus-trap + Esc + overlay-close + `role="dialog"`/`aria-modal`. |
| `ConfirmDialog` | Destructive/confirm flow with `isLoading`. |
| `DataTable<T>` | Columns + data with built-in loading skeleton / empty / error+retry, RTL, scroll. |
| `Badge` | Status pill mapped to the status token pairs. |
| `Card` · `Alert` · `Spinner` · `EmptyState` · `ErrorState` · `Pagination` · `SearchInput` | The rest of the kit. |
| `useToast()` | `success/error/info/warning` toasts from a root provider. |
| `PageContainer` · `PageHeader` · `Toolbar` | The canonical page shell every screen uses (see [08](references/08-page-patterns.md)). |
| `Tabs` · `Drawer` · `Avatar` · `FileUpload` · `DateRange` · `Skeleton` | Extended primitives (see [09](references/09-conventions.md)) — reuse, never hand-roll. |

**Every primitive:** tokens-only, keyboard-accessible, RTL-safe, `forwardRef` where it wraps a
native control. Evolve centrally by adding an optional prop — never fork.

---

## 5. Data, state, i18n & forms — the vertical slice

- **Data (TanStack Query).** `apiClient` (env baseURL + interceptors), `errors.ts`
  (`AppError` + `toAppError` — the ONE place error messages are extracted), a per-feature
  `*.api.ts` (typed services, real endpoints), `*.keys.ts` (query-key factory), and
  `useXQuery`/`useXMutation` hooks (mutations `invalidateQueries` + toast). **Mock-first:**
  `VITE_USE_MOCKS` swaps a fake data source so features fully work pre-backend. →
  [04-data-layer.md](references/04-data-layer.md).
- **State (Zustand).** `authStore` (persist, JWT-derived role, selector hooks
  `useAuthRole()`/`useIsAuthenticated()`); optional per-feature UI slice for modals/filters.
  Always read via selectors. → [05-state-i18n-forms.md](references/05-state-i18n-forms.md).
- **i18n + RTL.** `react-i18next`, `en.json`/`ar.json`, `useTranslation`, a `LanguageSwitcher`
  that flips `dir`/`lang`, `useDirection()`. → [05](references/05-state-i18n-forms.md).
- **Forms.** RHF + Zod resolver, Kit fields, server-error mapping. →
  [05](references/05-state-i18n-forms.md).

**Real endpoints** (verified): `POST /admin/login`, `POST /admin/logout`,
`POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/refresh` (assumed —
401 token refresh), `/admin/admin-management`
(+ `/is_active/{id}`), `/admin/owners-management/owners`,
`/admin/owners-management/pending-verification/{id}` (PATCH body `{action}` ∈
approve/reject/activate/disable/block), `/admin/regions/cities|city|neighborhoods|neighborhood`.

---

## 6. Build a new feature — workflow

Follow the ordered checklist and finish with verification:
**scaffold folders → `types` + `schema` → `api` (real endpoints) + `keys` → query/mutation hooks
→ optional UI store → components from `@ui` (+ `*.module.css` tokens) → assemble the page from
the **canonical shells** ([08](references/08-page-patterns.md)) → lazy route + guard →
en/ar i18n keys → wire loading/empty/error/success (mock-first) → verify.**

Worked example, the "reuse before you build" rule, the full anti-pattern list, and migration
notes → [06-feature-workflow.md](references/06-feature-workflow.md).

**Always finish with:**
```bash
npx tsc --noEmit      # types — MUST be clean
npm run lint          # eslint — clean
npm run build         # Vite — MUST compile (source of truth)
npm run dev           # smoke-test loading / empty / error / success (both en + ar)
```
**Never report a task as done while a type or build error exists.** Then confirm nothing broke,
no dead code / `console.log` / mock residue in a live path, and the feature renders all four
states — even before the backend exists. → [07-verification.md](references/07-verification.md).

---

## Reference index

- [01 · Architecture, routing, guards, app shell](references/01-architecture.md)
- [02 · Design system — Pitch-Forest tokens, CSS Modules, RTL, responsive](references/02-design-system.md)
- [03 · UI Kit — the shared primitives catalog](references/03-ui-kit.md)
- [04 · Data layer — apiClient, TanStack Query, mock-first (backend-not-ready)](references/04-data-layer.md)
- [05 · State (Zustand), i18n (EN+AR/RTL), forms (RHF + Zod)](references/05-state-i18n-forms.md)
- [06 · New-feature workflow, anti-patterns & migration](references/06-feature-workflow.md)
- [07 · Verification & definition of done](references/07-verification.md)
- [08 · Page patterns — canonical list/detail/form shells (consistency)](references/08-page-patterns.md)
- [09 · Conventions, locked defaults, formatting, mocks & extended primitives](references/09-conventions.md)
