# bplay-admin — Comprehensive Audit Report

**Date:** 2026-07-13
**Scope:** Full application — UI, UX, logic, data, backend integration — across all 12 features + the shared layer.
**Method:** Static gates → full live browser testing (isolated Playwright) → 6 parallel deep code-review agents (each cross-checking the real `bplay-backend`) → cross-verification & conflict resolution.

> **⚠️ Context (updated):** There is **no live backend yet** — running on mock data is **intentional**. When the backend is announced ready, the team makes small `*.api.ts` changes and connects. Therefore **all real-endpoint/contract findings (C1, C2, H1, H2, H3, M1, M2, M7) are DEFERRED BY DESIGN** — they are the go-live reconciliation checklist, *not* current bugs. The **"Fix now"** items below are the ones that affect the app *as it runs today on mocks* (client logic, UX, i18n, cleanup). One caveat: **C1 (region model)** is a different data model, not a "simple change" — flag it for design attention whenever the backend contract lands.

### Priority split

| Fix now (mock-mode quality) | Defer to go-live (reconcile with backend) |
|---|---|
| H4, H5, H6, H7, H8, H9 · M3, M4, M5, M6, M8, M9 · L1–L4 | C1, C2, H1, H2, H3 · M1, M2, M7 |

---

## ✅ Fixes applied (2026-07-13) — all "Fix now" items done & verified

All changes are client-side only (no backend touched). Gates after: **`tsc` ✓ · `eslint` ✓ · `vite build` ✓ · i18n parity 1360/1360 ✓ · Playwright re-test 0 console errors, every fix validated.**

| Item | Fix | Files |
|---|---|---|
| **H5/H6/M1** | New `isNotFoundError()`; `queryClient` no longer retries 4xx and doesn't toast not-found (detail pages show the inline empty state instantly, no double UX) | `shared/lib/errors.ts`, `shared/lib/queryClient.ts` |
| **H4** | Logout now calls `queryClient.clear()` — no cross-session cache leak | `app/layouts/AppSidebar.tsx` |
| **H7** | `AssignAdminModal` lists **regional admins only** (verified: general-oversight admins excluded) | `region-management/hooks/useAdminsForAssign.ts` |
| **H8/M8** | `DataTable` error/empty/actions labels now localized centrally (fixes all 15+ tables + the 4 pages missing `actionsLabel`) | `shared/ui/DataTable/DataTable.tsx` (+ `common.errorTitle/emptyDefault`) |
| **H9** | Real localized 404 page (design-system + RTL); deleted the hardcoded `.jsx` stub | `pages/NotFound.tsx` (+ css), `common.notFound.*` |
| **M5** | `ResetPasswordModal` now requires an explicit **confirm click** (no auto-fire) and surfaces errors | `admin-management/components/ResetPasswordModal.tsx` (+ `admin.reset.confirm/error`) |
| **M6** | Booking date presets (7/30/90d) capped at "now" — future bookings no longer leak into "Last 7 days" | `booking-management/api/booking.filter.ts` |
| **M4** | `useFacilityDocumentReview` now shows an error toast on failure | `facility-management/hooks/useFacilityDocumentReview.ts` |
| **M3** | City filter debounced via `SearchInput` (primitive evolved with `ariaLabel`/`testId`, no fork) | `shared/ui/SearchInput/SearchInput.tsx`, `FacilityFiltersBar.tsx` |
| **L1** | Deleted dead-code cluster + duplicate `apiClient.js` **+ the entire legacy blue palette** (`variables.css` + dead `auth.css`, now that nothing live used them) | multiple deletes; `styles/globals.css` |
| **L2** | Owner "Joined" filter relabeled "Last year" (matches its actual rolling-365-day behavior) | `en.json`/`ar.json` |

**Deferred (unchanged, by design):** all real-endpoint items (C1, C2, H1, H2, H3, M1's detail-page string swap, M2, M7) + **M9** (region `nameAr` — tied to the C1 region-model rework) + **L3** (mock image URLs — cosmetic).

---

## الملخّص التنفيذي (Executive summary — Arabic)

التطبيق **ممتاز ومصقول على مستوى الواجهة والتجربة والمنطق** فوق البيانات الوهمية: بناء نظيف (feature-slice + TanStack Query + Zustand + RHF/Zod)، تصميم موحّد بألوان Pitch-Forest، دعم عربي/RTL كامل (تطابق 1352/1352 مفتاح)، استجابة للموبايل، وإتاحة (a11y) صحيحة — و**صفر أخطاء console** عبر 39 تركيبة صفحة/لغة/جهاز و**كل صفحات التفاصيل الـ8**.

لكن **طبقة الربط بالباك-اند الحقيقي غير جاهزة للإطلاق**: بنية التبديل mock↔real سليمة تماماً (نفس التواقيع، "قلب علم واحد")، إنما بعض ملفات `*.api.ts` الحقيقية كُتبت على عقد مفترض/SRS يختلف عن `bplay-backend` الفعلي. عند قلب `VITE_USE_MOCKS=false` ستتعطّل ميزات (المناطق 100%، وجزء كبير من إدارة المدراء، وحالة المالكين، وإعادة تعيين كلمة السر، وترقيم صفحات المنشآت). هذه هي أولوية الإصلاح رقم 1.

الخلاصة: **جاهز للعرض/الديمو بامتياز، وغير جاهز للوصل بالباك-اند بعد** — يحتاج جولة تصليب لطبقة التكامل قبل الإطلاق.

---

## What is excellent (verified, not assumed)

- **Zero runtime errors.** 39 route × locale × viewport combinations (EN/AR, desktop/mobile) + all 8 detail pages driven live → **0 console errors, 0 page errors.**
- **Architecture is clean & consistent.** `page → query/mutation hook → *.api.ts → apiClient`; **mock/real signature parity holds across all 10 api folders** (the "flip one flag to go live" contract is structurally sound).
- **Design system discipline.** No raw hex/rgba or non-dynamic inline styles outside icon SVGs & map geometry. One Pitch-Forest token system, one visual language on every page.
- **Bilingual + RTL is real.** 1352/1352 EN=AR key parity, genuine Arabic (0 untranslated), true RTL mirroring (sidebar, tables, KPI order, icons all flip).
- **Responsive.** Sidebar collapses to a hamburger drawer < 768px; content reflows cleanly.
- **Accessibility baked in.** Modals are `role="dialog"` + `aria-modal`, focus-trapped, Esc-closable; inputs labelled; verified live.
- **RBAC correct.** A regional `admin` lands on Facilities, sees no super-admin nav links, and is safely redirected (no crash) from super-admin routes.
- **Static gates green.** `tsc --noEmit`, `eslint`, and `vite build` all pass.
- **Strong domain modeling** (verified solid): facility edit-gating (`canEditFacility` enforced in list + detail + route), owner 3-signal model, trust tier label-only, community 2-tier moderation + aggregate reactions + actor id/facilityId split, read-only invariant airtight in bookings/subscriptions, xlsx export truly lazy, SYP via `Intl.NumberFormat`.

---

## Findings by priority

Severity = impact once the real backend is connected (`VITE_USE_MOCKS=false`) or user-facing impact today. Each is cross-checked against the real code (and, where noted, `bplay-backend`).

### 🔴 CRITICAL — go-live blockers

**C1. `region-management` real API targets endpoints that do not exist on the backend.** *(confirmed by 2 independent agents against `bplay-backend`)*
`src/features/region-management/api/region.api.ts` calls a flat `/admin/regions[/:id]`, `/is_active/:id`, `/assign/:id`, `/restore/:id` with a circle body (`{center_lat, center_lng, radius_km}`). The real backend has **no flat region entity** — geography is a `cities`/`neighbourhoods` hierarchy at `/admin/regions/cities|city|neighborhoods|neighborhood` with a `{name, boundary}` / `{name, center, radiusMeters}` contract. Every region call 404s on go-live. **This also breaks scope derivation app-wide** (`getScopeRegions()` feeds owner/admin/facility/booking/membership scoping).
*Fix:* either add the SRS circle-model endpoints backend-side, or rewrite `region.api.ts` + `RegionDto`/`toRegion` against the real cities/neighbourhoods contract. (The frontend was built to the SRS circle model; the backend implements polygons — a design divergence to reconcile.)

**C2. `admin-management` real API is rejected by backend schema validation + calls missing routes.** *(backend-verified)*
`src/features/admin-management/api/admin.api.ts`:
- `getAdmins`/`getAdminStats` send `{q, status, scope, assignment, showDeleted, page, pageSize}` — backend `listAdminsSchema.query` is `additionalProperties:false` and only allows `{search, is_active, neighborhoodId, page, limit}` → **400 on every list/stats call.**
- `createAdmin`/`updateAdmin` send `{scope, region_ids}` (not in backend body schema) and omit the backend-required `role` → 400.
- `setAdminScope`, `assignRegions`, `restoreAdmin` → routes that don't exist (backend hard-deletes; no soft-delete/restore/scope concept).
*Fix:* align param/body names (`search`, `is_active`, `page`, `limit`, `role`); add the missing routes backend-side or redesign around the backend's actual hard-delete/no-scope model.

### 🟠 HIGH

**H1. `auth` reset-password sends the wrong field name.** *(backend-verified)*
`src/features/auth/api/auth.api.ts:27` posts `{ token, password }` to `/auth/reset-password`; backend `auth.schema.js:225` requires `{ token, newPassword }` with `additionalProperties:false` → **every reset 400s on go-live.**
*Fix:* `apiClient.post('/auth/reset-password', { token: input.token, newPassword: input.password })`.

**H2. `owner` status-update hits the wrong endpoint + sends an action the backend rejects.** *(confirmed by 2 agents)*
`src/features/owner-management/api/owner.api.ts:43` does `PATCH /admin/owners-management/owners/{id}/status`; contract is `PATCH /admin/owners-management/pending-verification/{id}`. Also the app's `suspend` action isn't in the backend enum (`approve/reject/activate/disable/block`) — it should map `suspend → disable`. Approve/reject/suspend all 404/400 on go-live.

**H3. `facility` list re-paginates client-side over a backend-paginated response → empty page 2+.**
`src/features/facility-management/api/facility.api.ts:35` sends `page/pageSize` to the backend, then `buildFacilityListResult` re-slices the returned array by the *same* `page/pageSize`. If the backend honors pagination (standard), page 2 arrives with ~10 rows and re-slicing `(page-1)*pageSize` yields empty. The author already worked around this in `getFacilityStats` with a `{pageSize:1000}` hack — inconsistent. Same issue in `getPendingFacilities`.
*Fix:* pick one contract uniformly — fetch unbounded + paginate client-side, or trust the backend and drop the re-slice.

**H4. Manual logout never clears the query cache → cross-session data leak.**
`src/app/layouts/AppSidebar.tsx:55` calls `logout()` + a *soft* `navigate('/login')`; the JS process never restarts, so the entire TanStack Query cache (admin/owner/player lists, profile) survives. There is no `queryClient.clear()` anywhere. On a shared/kiosk machine, the next admin can see the previous admin's cached data (incl. out-of-scope) until `staleTime` elapses.
*Fix:* call `queryClient.clear()` in a shared `performLogout()` used by both the manual and 401 paths.

**H5. Global error toast fires even for expected "not found" detail states.**
`src/shared/lib/queryClient.ts:21` `QueryCache.onError` toasts every query error. Detail pages *also* render an inline not-found `EmptyState`. TanStack Query v5 has no per-query `onError`, so navigating to a deleted/out-of-scope id shows **both** the correct empty state **and** an unwanted toast — every time, every feature.
*Fix:* skip the toast in `onError` for not-found (via `query.meta.suppressToast` or a known-message check).

**H6. `retry: 1` replays not-found/4xx throws.**
`src/shared/lib/queryClient.ts:10` retries once by default. Every not-found detail fetch is retried → ~2s of loading skeleton/spinner before the not-found state appears (verified live), and a duplicate `404` request on a real backend.
*Fix:* `retry: (n, e) => (isAppError(e) && e.status >= 400 && e.status < 500) ? false : n < 1`.

**H7. `AssignAdminModal` allows assigning a general-scope admin to a region.**
`src/features/region-management/components/AssignAdminModal.tsx` + `useAdminsForAssign.ts` list every admin (general + regional). Picking a general admin writes `region.assignedAdminIds` but the admin's own detail page (gated on `scope === 'regional'`) never shows it → an invisible, unmanageable one-sided link. (The admin-initiated path correctly hides "Assign regions" for general admins.)
*Fix:* filter `useAdminsForAssign` to `scope === 'regional'`, and/or badge+disable general admins in the picker.

**H8. `DataTable` error state is structurally unlocalizable.**
`src/shared/ui/DataTable/DataTable.tsx:130` renders `<ErrorState>` with baked-in `"Something went wrong"` / `"Retry"` and exposes no `errorTitle`/`retryLabel` prop — so no caller can translate it. Fires on all 15+ `DataTable` usages on any real list error.
*Fix:* thread `errorTitle`/`retryLabel` props through (mirroring the existing `actionsLabel` pattern) and pass `t(...)`.

**H9. Live 404 page is a hardcoded English, unstyled, wrong-extension stub.**
`src/pages/NotFound.jsx` (wired to the catch-all `*` route) renders a bare `<h1>404 - Page Not Found</h1>` — not `t()`, no design system, `.jsx` in a TS app. Any bad URL shows this to real users regardless of locale.
*Fix:* rewrite as `NotFound.tsx` using `PageContainer`/`EmptyState` + `t('common.notFound.*')`.

### 🟡 MEDIUM

**M1. Not-found detection is coupled to mock-only literal strings — 6+ detail pages.** *(root cause behind H5/H6)*
Admin/Region/Owner/Player/Facility/Booking/Community/facility-wizard detect not-found via `error.message === 'X not found'` — a string only the *mock* throws. The real backend's 404 message (e.g. `"Admin user not found"`) never matches → the friendly empty state is unreachable; users get generic "Retry" (which re-404s forever).
*Fix:* match on `AppError.status === 404` (already exposed by `toAppError`).

**M2. `facility` bulk-review reports fake success.**
`facility.api.ts:172` `bulkAction` hardcodes `{ succeeded: ids.length, skipped: [] }` and ignores `res.data`. The "N approved / N skipped" toasts always claim full success even if the backend skipped ineligible facilities.
*Fix:* unwrap the real `succeeded`/`skipped` from the response.

**M3. `facility` city filter has no debounce.** `FacilityFiltersBar.tsx:262` fires a query per keystroke (10-char city = 10 requests), while the adjacent search box is debounced. *Fix:* reuse `SearchInput`/debounce.

**M4. `useFacilityDocumentReview` has no `onError` toast** (`hooks/useFacilityDocumentReview.ts:14`) — a failed doc accept/reject fails silently, unlike every sibling mutation. *Fix:* add `onError` toast.

**M5. `ResetPasswordModal` auto-fires on open + misleading/blank in real mode + swallows errors.** `components/ResetPasswordModal.tsx:26` resets on open, shows the returned string as "the original password" (real impl returns `''` and omits the required body field → 400), and `.catch(()=>{})` swallows the rejection with no error UI → stuck spinner forever. *Fix:* gate reveal on a mock-vs-real flag; render `isError` with retry.

**M6. `booking` date-range quick presets (7/30/90 days) have no upper bound.** `DateRange.tsx:28` returns `{fromMs: now-Nd, toMs: null}`; because `booking.date` spans past **and** future, "Last 7 days" includes all future bookings too. *Fix:* bound the upper end to "now" for booking-date presets (or add explicit past/upcoming semantics).

**M7. Systemic client-side stats scans + uncached scope round-trips (performance).** 7 of 10 features compute stats via `{pageSize:1000}` client reduce; booking/membership call `getFacilities({pageSize:1000})` on *every* API call (list, byId, stats) uncached → ~3 backend round-trips per page load. *Fix:* dedicated `/stats` endpoints; wrap scope lookups in a shared `useQuery` key.

**M8. `actionsLabel` not localized on 4 core list pages** (Admin/Region/Owner/Player) → hardcoded `'Actions'`; Facility/Booking/Community/ClubSubscriptions do it right. *Fix:* pass `actionsLabel={t('common.actions')}`.

**M9. Region/city names are raw English data with no Arabic variant** — rendered as-is under the Arabic locale everywhere (regions, owner region, facility city/governorate, filters, maps). Data-model gap (no `name_ar`). *Fix:* add `nameAr` to the contract and pick by `i18n.language`, or document as a known limitation.

### ⚪ LOW / cleanup

**L1. Dead-code cluster (delete).** `src/pages/{Home,Unauthorized}.jsx`, `src/layouts/{AuthLayout,MainLayout}.jsx`, `src/shared/components/{Header,Footer}/*.jsx`, `src/features/dashboard/pages/DashboardHome.jsx`, `src/App.css`, `src/index.css`, `src/styles/{variables,home,welcome}.css`, **and a duplicate orphaned `src/shared/services/apiClient.js`** (hardcodes baseURL, reads localStorage token, no 401 handling — a copy-paste trap). All verified 0-importer.

**L2. Owner "Joined = This year" filter is mislabeled** — it applies a rolling 365-day window; the identical player filter correctly says "Last year". *Fix:* relabel to "Last year".

**L3. Mock data references external image URLs** (`picsum.photos`, `i.pravatar.cc`) → empty media boxes when offline/slow. *Fix:* bundle a few local placeholder assets for a fully self-contained demo.

**L4. `.jsx` files in a TS codebase** — `NotFound.jsx` (live, see H9) + the dead cluster. Standardize on `.tsx`.

---

## Refuted during verification (NOT bugs — recorded for transparency)

These looked like issues but were disproven by reading the real code / backend or by live testing:

- **Login `identifier` mismatch** — the admin route `/admin/login` requires `{email, password}` (verified in `bplay-backend .../super-admin/auth/auth.schema.js`); `identifier` belongs to the separate general `/auth/login`. The admin app is correctly wired.
- **Facility wizard skips the required owner** — false; zod `ownerId: z.string().min(1)` + RHF `handleSubmit` block Next (live screenshot shows the "Choose an owner" error, stays on step 1).
- **`Select` portal inline style breaks RTL** — false; it's `position:fixed` geometry from `getBoundingClientRect` (physical coords, correct both directions) — an allowed dynamic-geometry exception.
- **Booking table columns clipped** — false; the `DataTable` has a horizontal-scroll container (Payment/Total reachable).
- **Community post images broken** — false; external CDN latency, not a code defect (avatars loaded).
- **Missing booking calendar** — out of scope; the admin bookings screen is intentionally read-only list+detail oversight (the day/week/month calendar is an owner-app feature, not admin).

---

## Recommended remediation order

1. **Backend-integration hardening sprint (before any go-live):** C1, C2, H1, H2, H3 — align every real `*.api.ts` to the actual `bplay-backend` contract (endpoints, verbs, body/query field names, action enums, pagination model). Add an integration smoke test that runs the app once with `VITE_USE_MOCKS=false` against a dev backend.
2. **Cross-cutting robustness (one PR, high leverage):** M1 + H5 + H6 — replace all `error.message === 'X not found'` with `status === 404`, suppress the not-found toast, and disable retry on 4xx. Fixes the not-found UX across all features at once.
3. **Session safety:** H4 — centralize logout + `queryClient.clear()`.
4. **i18n completeness:** H8, H9, M8, M9.
5. **Feature polish:** M2–M7, then the LOW cleanup batch.

---

*Verification performed: static (`tsc`/`eslint`/`vite build`/i18n parity) · live Playwright on an isolated browser (39 route×locale×viewport + all 8 detail pages + search/filter/tabs/modals/wizard/auth/logout/RBAC/not-found + a11y probes) · 6 parallel deep code-review agents cross-checking `bplay-backend` · conflict resolution favoring backend source-of-truth.*
