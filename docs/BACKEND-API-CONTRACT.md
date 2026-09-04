# Bplay Super-Admin Platform — Backend API Contract

**Version:** 1.1 · **Status:** Final — ready for backend implementation · **Date:** 2026-08-01
**Changelog — 1.1:** added **§16 Notifications** (the admin inbound notification centre, SRS `FR-ADM-SET-006/007/008`) and renumbered Statistics → §17, Reconciliation → §18. Notifications is the first domain that is *mostly already built*; the gap is the five event producers (§16.7) and region stamping (§16.8). Feedback (§10 in the SRS) and Plans still have no section here.
**Audience:** Backend engineering team building the API that the finished `bplay-admin` (React) frontend will connect to.
**Frontend basis:** `D:\Bplay\bplay-admin\src` (running on mock data via `VITE_USE_MOCKS`). Every endpoint, path, method, request body, and response field below is extracted verbatim from the real service layer (`*.api.ts` / `*.types.ts` / `*.schema.ts`) and **cross‑verified against the actual `apiClient` calls in source**. Build to this contract and the frontend connects by flipping one flag (`VITE_USE_MOCKS=false`) — **zero frontend changes**.

---

## 1. Purpose

This is the **single source of truth** for the HTTP API that the Bplay super-admin dashboard consumes. The frontend is **already built and shipping against an in-memory mock**. Every service in the app is written so that going live is a one-flag flip (`VITE_USE_MOCKS=false`) — the real `*.api.ts` service files already contain the exact method, path, query, request body, and response-parsing logic the app will use in production.

This document extracts that contract, endpoint by endpoint, so the backend can be built to match it **with zero frontend changes**. Where the frontend's expectation diverges from what the backend team is likely to build (or from what already exists), the divergence is called out explicitly and collected in [§18 Reconciliation](#18-reconciliation--open-questions-for-backend).

## 2. How to read this document

- **[§4 Global Conventions](#4-global-conventions)** applies to *every* endpoint. Read it first. Per-endpoint sections do not repeat auth, base URL, or envelope rules.
- Each domain (§5–§16) opens with a **summary table** (Method · Path · Purpose · Role · Status), then gives **per-endpoint detail**: request (path / query / body as typed field tables) and response (a JSON example + a field table), followed by error cases.
- Every endpoint carries a **Backend status** badge:

  | Badge | Meaning |
  |---|---|
  | ✅ **Built & aligned** | Endpoint exists in the current backend and the FE contract matches. Safe to wire. |
  | ⚠️ **Diverges — reconcile** | Either exists but the shape/fields/model differs from what the FE sends, or the path is non-idiomatic and must be confirmed. Requires a decision before go-live. |
  | 🔴 **Not built — needed** | No backend implementation exists. The FE contract below is what must be built. |

- **Wire casing is `snake_case`** in both directions unless a specific endpoint is flagged otherwise (a few read models are consumed raw as camelCase — those are marked as high-risk divergences).
- All paths shown are **relative to the versioned base URL** (`/api/v1`). e.g. `POST /admin/login` means `POST http://<host>/api/v1/admin/login`, and `GET /admin/admin-management` means `GET http://<host>/api/v1/admin/admin-management`.

## 3. Tech context

- **Actors.** One platform owner (`super_admin`) plus multiple `admin` accounts. An `admin` may be **general** (platform-wide oversight) or **regional** (scoped to one or more assigned regions). `super_admin` is not created or managed through these endpoints.
- **Region scoping.** Region is the governing scope for regional admins. The FE models a region as a **geographic circle** (`name + center_lat + center_lng + radius_km`) and resolves "which region a facility/player/booking belongs to" by point-in-circle math **on the client**. This diverges from a city/neighbourhood backend model and is the single biggest reconciliation item (see §18). The regional scope of the signed-in admin is expected to travel **inside the JWT** (`assignedRegionIds`, camelCase).
- **Currency.** All money is **Syrian Pounds (SYP)** as a **plain integer** — no minor units, no formatting, no currency object. Money fields carry an explicit `_syp` suffix.
- **Mock-first.** The FE currently runs entirely on `*.api.mock.ts`. The mocks are the authoritative *shape* reference (they return richer objects than some thin real mappers read). Going live is `VITE_USE_MOCKS=false`; no other FE change is intended, provided the backend honors this contract.

---

## 4. Global Conventions

### 4.1 Base URL & versioning

- Single axios instance (`shared/lib/apiClient.ts`).
- Base URL = `VITE_API_BASE_URL`, default **`http://localhost:3000/api/v1`**. The version segment `/api/v1` is baked into the base URL and is **not** repeated per endpoint.
- Default request header: `Content-Type: application/json`. Request timeout: **15 000 ms** (fail-fast).
- **All dashboard endpoints live under `/admin/...`.** The only exceptions are the two shared password endpoints, which use a bare `/auth/...` prefix: `POST /auth/forgot-password` and `POST /auth/reset-password`. Login and logout are `POST /admin/login` and `POST /admin/logout`.

### 4.2 Authentication

- **Scheme:** Bearer JWT. The request interceptor reads `accessToken` from the Zustand auth store and sets `Authorization: Bearer <token>` on every request when a token is present.
- **Login** returns a JWT; the FE unwraps it to `{ accessToken }` and then **decodes the token client-side** to obtain the session identity. No separate `GET /me` is called at login.
- **JWT claims the FE decodes and depends on:**

  | Claim | Type | Purpose |
  |---|---|---|
  | `role` | `"super_admin" \| "admin"` | Drives routing + RBAC. Falls back to `"admin"` if absent. |
  | `email` | string | Header/profile display. Falls back to the submitted login email if absent. |
  | `name` | string (optional) | Header/profile display. **Currently absent from the real admin JWT → shows `undefined`.** |
  | `assignedRegionIds` | string[] | **Regional-admin scope — camelCase, read directly off the decoded JWT payload** (distinct from the snake_case `assigned_region_ids` on the Admin *entity* DTO, §6). The entire regional scoping model depends on this. **Currently absent from the real admin JWT.** |

  > ⚠️ The backend admin JWT today carries only `{ sub, email, role, sid }`. It must additionally carry `name` and `assignedRegionIds` (**camelCase — the FE decodes the raw JWT payload**), or the FE must hydrate them from a `GET /admin/profile`. See §17.

- **Session persistence.** The full session (`accessToken`, `user`, `role`, `isAuthenticated`) is persisted by Zustand under the localStorage key `bplay-admin-auth`.
- **401 handling.** Any `401` response → the client immediately clears the session and hard-redirects to `/login`. **No retry, no silent refresh.**
- **Token refresh — NOT implemented.** There is an explicit `TODO(auth)` for `POST /auth/refresh`; today an admin whose token expires is silently logged out. If long-lived admin sessions are wanted, the backend must expose an admin refresh and the FE must persist + use refresh tokens (see §18).

### 4.3 Success response envelope

The FE unwraps every read through shared helpers that tolerate several nesting shapes. **Recommended canonical shape:**

```json
{
  "success": true,
  "message": "OK",
  "data": { "id": "a1", "name": "Regional Admin — Damascus" }
}
```

Unwrap ladder for a **single object** (`unwrap<T>`): `data.data` → `data` → the raw body. Any of these is accepted.

For a **list**, the FE tries, in order: `data.data`, then `data.<pluralKey>` (the entity's plural name), then `data`, then the raw body — returning the first array it finds, else `[]`. **Recommended canonical list shape** (plural key = entity name):

```json
{
  "success": true,
  "data": { "admins": [ { "id": "a1" }, { "id": "a2" } ] }
}
```

Observed list keys per domain: `admins`, `players`, `owners`, `facilities`, `regions`, `posts`, `comments`, `reactors`, `bookings`, `subscriptions`, `plans`, `invoices`, `rooms`, `ratings`, `reports`, `notifications`, `preferences`.

### 4.4 Error response envelope

The FE normalizes every rejected response to an `AppError`. The backend error body should carry:

```json
{
  "success": false,
  "message": "Email is already in use.",
  "error": "Email is already in use.",
  "code": "ERR_DUPLICATE_EMAIL",
  "errors": {
    "email": "Email is already in use.",
    "phone": ["Must be 9 digits", "Invalid format"]
  }
}
```

| Field | How the FE uses it |
|---|---|
| `message` | Primary human message (precedence: `message` → `error` → axios message → generic fallback). |
| `error` | Secondary message field, used if `message` is absent. |
| `code` | Machine error code, surfaced on `AppError.code`. |
| `errors` | Field-level validation map: `{ fieldName: string \| string[] }`. Flattened to per-field messages (first element of an array is used). Drives inline form errors. |

**Status-code semantics the FE relies on:**

| Status | FE behavior |
|---|---|
| `401` | Hard logout + redirect to `/login`. Never retried. |
| `404` (or any error whose message matches `/\bnot found\.?$/i`) | Treated as an expected "not found". Detail pages render their own empty state; the query client **does not** retry or toast. **Not-found must be a real HTTP 404** — string-matching is a fallback, not the contract. |
| `409` | Recommended for invalid state transitions (e.g. approve a non-pending facility). Should carry a `code`. |
| `422` / `400` | Validation. Should populate `errors`. |
| `403` | Role/scope denied. |

### 4.5 Pagination

- **Request query params:** `page` (1-based) and `pageSize`. **Not** `limit`/`per_page`/`offset`. Default `pageSize` = **10**. Stats calls fetch "everything" by sending `pageSize=1000`.
- **Response the FE type expects:** `Paginated<T> = { items: T[]; total: number; page: number; pageCount: number }`.
- **Current reality (critical):** every list service **ignores server pagination**. It fetches the full array, maps it, then **filters/sorts/paginates client-side**. No `total`/`page`/`pageCount`/`meta` is read from the server anywhere today.
  - **Consequence:** for go-live the backend must **either (a)** return the *full scoped set* per list endpoint (simplest; FE works unchanged), **or (b)** implement true server-side pagination — in which case the FE's client-side slice must be removed first, or later pages render empty (the known "facility page-2 empty" bug class). Decide per §17.

### 4.6 Filtering, sorting, search

- Filter/sort/search params are sent as the axios `params` object, but — like pagination — are **re-applied client-side today**, so the backend *may* ignore them as long as it returns the full scoped set. Param names per endpoint are documented in each domain.
- Common list controls: `q` (free-text search), entity-specific status/type filters, `sortBy` + `sortDir` (`asc`/`desc`).
- Two param types serialize poorly as query strings and are effectively client-only today: `dateRange` (a nested object `{ preset, from?, to? }`) and array filters like `amenities[]`. If server-side filtering is implemented, these must be flattened (e.g. `date_from`/`date_to`).

### 4.7 Field conventions

| Concern | Convention |
|---|---|
| **Casing** | Requests: `snake_case`. Responses: `snake_case` DTOs, normalized to camelCase by per-feature mappers. **Exceptions** (consumed raw as camelCase, no mapper — backend MUST emit camelCase): player subscription, player rooms, player ratings, player reports, and the `updateProfile` response. |
| **IDs** | Strings (UUID-friendly). Numeric ids are accepted and stringified. Common aliases tolerated on read: `id` / `_id` / `<entity>_id`. |
| **Dates** | ISO-8601 strings, passed through unchanged. |
| **Currency** | Integer SYP, `_syp` suffix (e.g. `total_spent_syp`, `price_syp`, `amount_syp`). |
| **Phone** | Canonical Syrian form `963XXXXXXXXX` (country code + 9-digit local, **no `+`**). The FE prepends `963` to a validated 9-digit local part on write. |
| **National ID** | Syrian national number, exactly **11 digits**. |
| **Booleans/status** | Tolerant on read (e.g. `is_active` may be a boolean or inferred from `status: "active"`), but the backend should emit explicit booleans. |

> **Read-alias tolerance (why the per-entity field tables list a canonical name + a few aliases).** Every response mapper (`toAdmin` / `toOwner` / `toPlayer` / `toFacility` / `toRegion` / `toMembership` / `toPost` / …) reads each field through a fallback chain. Beyond the **canonical `snake_case` name documented per entity**, it also accepts the field's **camelCase mirror** (`isActive`, `createdAt`, `avatarUrl`, `assignedRegionIds`, …) and, for some fields, common alternates (`full_name`, `phone_number`, `avatar_url`, `national_number`, `email_address`, `website`, `*_count`, `status`, …). **Build the backend to emit the canonical `snake_case` names shown in each entity table** — those always map. The aliases are extra tolerance, not a license to diverge. Per-entity tables call out only the *non-obvious* aliases; assume the camelCase mirror is always accepted. *(Two documented exceptions where a mapper does NOT tolerate aliases / is camelCase-only: the four Player sub-resources §9.4–9.7, and the Booking `id`/`facility_id`/`player_id` keys §13.)*

### 4.8 Roles at a glance

| Domain | Callable by | Region-scoped? |
|---|---|---|
| Auth | Public (login/forgot/reset), authenticated (logout) | No |
| Admins | `super_admin` only | No (platform-wide) |
| Regions | `super_admin` only | No (regions *define* scope) |
| Owners | `super_admin` only | No (V1) |
| Players | `super_admin` only | No (flat global list; `city` filter only) |
| Facilities | `super_admin` + `admin` | **Yes** (admin sees only in-region) |
| Community | `super_admin` + `admin` | Not sent by FE (backend decides) |
| Bookings | `super_admin` + `admin` | **Yes** (admin sees only in-region) |
| Subscriptions (club) | `super_admin` + `admin` | **Yes** (derived from club scope) |
| Profile | any authenticated admin (self) | No |
| Notifications | `super_admin` + `admin` (own inbox) | **Yes** — enforced at *emit* time, not at read time |
| Dashboard/Statistics | `super_admin` only | **Yes** (via `region` query param) |

---

## 5. Auth

The FE calls **4 endpoints**. There is **no refresh call** wired.

| # | Method | Path | Purpose | Role | Status |
|---|---|---|---|---|---|
| 1 | POST | `/admin/login` | Authenticate; start session | Public | ✅ Built & aligned |
| 2 | POST | `/admin/logout` | Revoke current session | Authenticated | ✅ Built & aligned |
| 3 | POST | `/auth/forgot-password` | Request reset email | Public | ✅ Built & aligned |
| 4 | POST | `/auth/reset-password` | Set new password via token | Public | ⚠️ Field-name mismatch |
| — | POST | `/auth/refresh` | Silent token refresh | — | 🔴 Not built (FE not wired either) |

### 5.1 Login — `POST /admin/login` ✅

**Request body**

| Field | Type | Req | Notes |
|---|---|---|---|
| `email` | string | ✔ | Valid email. (Admin login uses `email`, **not** the mobile app's `identifier`.) |
| `password` | string | ✔ | Client-side strong-password rule (≥8, uppercase, digit, special). |

**Success (200)** — the FE reads only `data.accessToken` and decodes it.

```json
{ "success": true, "data": { "accessToken": "<JWT>", "expiresIn": 86400 } }
```

`expiresIn` is currently ignored. The JWT payload **must** include `role`; **should** include `name` and `assignedRegionIds` (camelCase; see §4.2).

**Post-success nav:** `super_admin` → dashboard; `admin` → facility management.

**Errors:** `401` invalid credentials · `403` domain/IP forbidden · `429` rate-limited/locked.

> Reconcile: add `role` + `name` + `assignedRegionIds` (camelCase) to the admin JWT claims, or the header shows no name and regional scoping is lost.

### 5.2 Logout — `POST /admin/logout` ✅

No request body (the server identifies the session from the JWT `sid` claim and deletes that session row).
**Success:** `204 No Content` (body ignored). **Errors:** `400` if the JWT lacks `sid`; `401` if missing/expired.
Note: the FE also drops the session client-side on any 401, so logout succeeds visually even if this call fails.

### 5.3 Forgot password — `POST /auth/forgot-password` ✅

| Field | Type | Req |
|---|---|---|
| `email` | string | ✔ |

**Success (200):** generic no-enumeration message; the FE ignores the body and navigates to the reset page.

```json
{ "success": true, "data": { "message": "If the email exists, a reset link is on its way." } }
```

**Errors:** always 200 regardless of account existence; `429` on abuse.
> Reconcile: this is the shared users endpoint (players/owners/admins share the `users` table). Confirm admin accounts are eligible and that the emailed link deep-links to the **admin** app's `/reset-password`, not the mobile app.

### 5.4 Reset password — `POST /auth/reset-password` ⚠️

The reset `token` arrives as a `?token=…` query param on the reset page and is placed in the request body.

| Field | Type | Req | Notes |
|---|---|---|---|
| `token` | string | ✔ | From the emailed link. |
| `password` | string | ✔ | Strong-password rule. (`confirmPassword` is validated client-side but **never sent**.) |

**Success (200):** body ignored; FE navigates to login.
**Errors:** `400` `ERR_INVALID_RESET` / `ERR_RESET_EXPIRED` / weak password.

> ⚠️ **Field-name mismatch — must reconcile.** The backend expects `{ token, newPassword }`; the FE sends `{ token, password }`. On the real path this fails backend validation. Fix on one side (rename FE `password → newPassword`, or have the backend accept `password`).

### 5.5 Refresh — `POST /auth/refresh` 🔴 (not wired on either side)

The admin login issues a 24h DB-backed session and returns **no refresh token**. The FE has no refresh-token storage. Today an admin is silently logged out at expiry. **Decision needed:** either accept 24h hard sessions, or issue admin refresh tokens on `/admin/login` and wire FE persistence + a `/auth/refresh` call.

---

## 6. Admins (Admin Management)

Base path: **`/admin/admin-management`**. `super_admin` only. Platform-wide (not region-scoped). The `super_admin` (platform owner) is not created or listed here.

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | GET | `/admin/admin-management` | List admins (filter/search/paginate) | ⚠️ Reconcile (schema + client paging) |
| 2 | GET | `/admin/admin-management?pageSize=1000` | KPI stats (derived) | 🔴 No stats endpoint |
| 3 | GET | `/admin/admin-management/{id}` | Get one admin (incl. deleted) | ⚠️ Reconcile |
| 4 | POST | `/admin/admin-management` | Create admin | ⚠️ Reconcile |
| 5 | PATCH | `/admin/admin-management/{id}` | Update admin (no password) | ⚠️ Reconcile |
| 6 | POST | `/admin/admin-management/is_active/{id}` | Activate / deactivate | ⚠️ Confirm route |
| 7 | PATCH | `/admin/admin-management/scope/{id}` | Promote / demote scope | ⚠️ Confirm route |
| 8 | POST | `/admin/admin-management/assign-regions/{id}` | Replace region set (M2M) | ⚠️ Confirm route |
| 9 | POST | `/admin/admin-management/reset-password/{id}` | Reset password | ⚠️ Confirm route |
| 10 | DELETE | `/admin/admin-management/{id}` | Soft-delete | ⚠️ Confirm route |
| 11 | POST | `/admin/admin-management/restore/{id}` | Restore soft-deleted | ⚠️ Confirm route |

### Admin object (response DTO, canonical snake_case)

```json
{
  "id": "a1",
  "name": "Layla Haddad",
  "email": "layla@bplay.sy",
  "role": "admin",
  "is_active": true,
  "scope": "regional",
  "phone": "963933100201",
  "national_id": "01020304050",
  "photo_url": "data:image/webp;base64,…",
  "is_deleted": false,
  "assigned_region_ids": ["c1"],
  "assigned_region_names": ["Damascus"],
  "created_at": "2026-06-01T09:00:00.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Aliases accepted on read: `_id`, `admin_id`. |
| `name` | string | Alias `full_name`. |
| `email` | string | |
| `role` | string | Defaults to `"admin"`. |
| `is_active` | boolean | Drives FE `status` (`active` \| `suspended`). Alias: `status: "active"`. |
| `scope` | `"general" \| "regional"` | Anything non-`general` normalizes to `regional`. |
| `phone` | string | `963XXXXXXXXX`. |
| `national_id` | string | 11 digits. |
| `photo_url` | string? | View-only here (admins edit their own photo via Profile). |
| `is_deleted` | boolean | Alias `deleted_at` (non-null → deleted). |
| `assigned_region_ids` | string[] | **Must be populated by the backend on read** (see reconcile #1). |
| `assigned_region_names` | string[] | Server-resolved display names. |
| `created_at` | string (ISO) | |

### 6.1 List — `GET /admin/admin-management` ⚠️

**Query params** (all currently re-applied client-side): `q`, `status` (`all`/`active`/`suspended`), `scope` (`all`/`general`/`regional`), `assignment` (`all`/`assigned`/`unassigned`), `showDeleted` (boolean — when true, return **only** soft-deleted admins), `page`, `pageSize`.

**Success (200):** `{ data: { admins: Admin[] } }`.
> ⚠️ `status=suspended` is a FE projection of `is_active=false` — the backend should filter on the boolean. The FE re-paginates client-side, so return the full set (or migrate FE — §18).

### 6.2 Stats — `GET /admin/admin-management?pageSize=1000` 🔴

No dedicated endpoint. Counts (`{ total, active, regional, unassigned }`) are computed client-side from a 1000-row pull. **Recommended:** add `GET /admin/admin-management/stats → { total, active, regional, unassigned }`.

### 6.3 Get one — `GET /admin/admin-management/{id}` ⚠️

Path param `id`. Returns a single Admin (including soft-deleted). `404` if unknown.

### 6.4 Create — `POST /admin/admin-management` ⚠️

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | string | ✔ | min 2 |
| `email` | string | ✔ | valid, unique |
| `password` | string | ✔ | strong-password rule |
| `phone` | string | ✔ | `963` + 9-digit local |
| `national_id` | string | ✔ | 11 digits |
| `scope` | `"general" \| "regional"` | ✔ | |
| `region_ids` | string[] | ✔ | May be empty; a `regional` admin must have ≥1. |

**Success (201):** the created Admin under `data`. **Errors:** `409` duplicate email/national_id · `422` validation.

### 6.5 Update — `PATCH /admin/admin-management/{id}` ⚠️

Body = create minus `password`: `name`, `email`, `phone`, `national_id`, `scope`, `region_ids`. **Success (200):** updated Admin.

### 6.6 Activate / deactivate — `POST /admin/admin-management/is_active/{id}` ⚠️

Body: `{ "is_active": boolean }`. Success `200/204` (void).
> Non-RESTful path. Confirm, or reconcile to `PATCH /admin/admin-management/{id}` with `{ is_active }`.

### 6.7 Set scope — `PATCH /admin/admin-management/scope/{id}` ⚠️

Body: `{ "scope": "general" | "regional" }`. **Side effect the backend must honor:** promoting to `general` **clears all region links**. Success `200/204`.

### 6.8 Assign regions — `POST /admin/admin-management/assign-regions/{id}` ⚠️

Body: `{ "region_ids": string[] }` — **replace-set semantics**; empty array = unassign all. Success `200/204`.
> Regions are assignable two ways — inline via `region_ids` on create/update AND via this endpoint. Backend must accept both.

### 6.9 Reset password — `POST /admin/admin-management/reset-password/{id}` ⚠️

No body. The real service **discards the response** (returns `''`). Implement as a reset-link / regenerate flow — **must not** echo a plaintext password. (The "reveal original password once" UX is mock-only.)

### 6.10 Soft-delete — `DELETE /admin/admin-management/{id}` ⚠️

No body. **Soft-delete** (hidden from default list, restorable). **Side effect:** clear the deleted admin from every region. Success `200/204`.

### 6.11 Restore — `POST /admin/admin-management/restore/{id}` ⚠️

No body. Un-deletes; the admin returns **unassigned**. Success `200/204`.

> **Admin reconciliation flags:** (1) `assigned_region_ids`/`assigned_region_names` must be embedded on each admin read, or the region column/search/`assignment` filter break. (2) Region ids are **circle ids** (`c1`–`c6`) — reconcile with any city/neighbourhood backend model. (3) The entire `/admin/admin-management` surface was flagged by the 2026-07 audit as rejected by the current backend schema — treat action sub-paths (#6–#11) as FE-proposed. (4) Write-through side effects (§6.7/6.8/6.10) must be server-side.

---

## 7. Regions

Base path: **`/admin/regions`**. `super_admin` only. Regions **define** scope; they are not themselves region-scoped. The FE models a region as a **geographic circle**.

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | GET | `/admin/regions` | List all regions (incl. deleted) | ⚠️ Model divergence / likely not built |
| 2 | GET | `/admin/regions/{id}` | Get one (incl. deleted) | ⚠️ |
| 3 | GET | `/admin/regions` (reuse) | Stats (derived) | 🔴 No stats endpoint |
| 4 | GET | `/admin/regions` (reuse) | Scope-resolution list (derived) | ⚠️ |
| 5 | POST | `/admin/regions` | Create region | ⚠️ Circle model |
| 6 | PATCH | `/admin/regions/{id}` | Update region | ⚠️ Circle model |
| 7 | POST | `/admin/regions/is_active/{id}` | Toggle active | ⚠️ Confirm route |
| 8 | POST | `/admin/regions/assign/{id}` | Replace admin set (M2M) | ⚠️ Confirm route |
| 9 | DELETE | `/admin/regions/{id}` | Soft-delete | ⚠️ Must be soft |
| 10 | POST | `/admin/regions/restore/{id}` | Restore | ⚠️ Confirm route |

### Region object (canonical snake_case)

```json
{
  "id": "c1",
  "name": "Damascus",
  "center_lat": 33.5138,
  "center_lng": 36.2765,
  "radius_km": 15,
  "is_active": true,
  "is_deleted": false,
  "assigned_admin_ids": ["a1", "a4"],
  "assigned_admin_names": ["Layla Haddad", "Omar Nasser"],
  "created_at": "2026-05-01T00:00:00.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Aliases: `_id`, `region_id`. Seeded ids `c1..c6` assumed stable by demo seeds. |
| `name` | string | min 2 |
| `center_lat` | number | −90…90, not (0,0) |
| `center_lng` | number | −180…180, not (0,0) |
| `radius_km` | number | > 0, ≤ 100 |
| `is_active` | boolean | Alias `status: "active"/"inactive"`. |
| `is_deleted` | boolean | Alias `deleted_at`. **Must be present** so the trash view works. |
| `assigned_admin_ids` | (string\|number)[] | M2M. |
| `assigned_admin_names` | string[] | Server-resolved (assign sends ids only). |
| `created_at` | string (ISO) | |

### 7.1 List — `GET /admin/regions` ⚠️

**No query params are sent.** All filters (`q`, `status`, `assignment`, `showDeleted`, `page`, `pageSize`) are client-side. **The list MUST include soft-deleted rows** (with `is_deleted`/`deleted_at` set) — there is no separate deleted-list endpoint.

**Success (200):** `{ data: { regions: Region[] } }`.

### 7.2 Get one — `GET /admin/regions/{id}` ⚠️

Path param `id`. Must return even soft-deleted rows. `404` if unknown.

### 7.3 Stats (derived) 🔴 · 7.4 Scope regions (derived) ⚠️

Both reuse `GET /admin/regions`. Stats returns `{ total, active, unassigned }` (live regions only), computed client-side. Scope-resolution filters to live regions with numeric center/radius. No new endpoints required if the list returns the geo fields; an optional `GET /admin/regions/stats` would remove the KPI over-fetch.

### 7.5 Create — `POST /admin/regions` ⚠️

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | string | ✔ | min 2 |
| `center_lat` | number | ✔ | −90…90, not (0,0) |
| `center_lng` | number | ✔ | −180…180, not (0,0) |
| `radius_km` | number | ✔ | > 0, ≤ 100 |

**Success (200/201):** created Region (new regions default `is_active: true`, `is_deleted: false`, empty admin arrays).

### 7.6 Update — `PATCH /admin/regions/{id}` ⚠️

Body = full geo field set (`name`, `center_lat`, `center_lng`, `radius_km`) — sent every time (full replace of geo fields despite PATCH).

### 7.7 Toggle active — `POST /admin/regions/is_active/{id}` ⚠️

Body: `{ "is_active": boolean }`. Success `200` (void). Non-standard RPC path — confirm or reconcile to `PATCH /admin/regions/{id}`.

### 7.8 Assign admins — `POST /admin/regions/assign/{id}` ⚠️

Body: `{ "admin_ids": string[] }` — **replace-set**, may be empty. Admin *names* are display-only and **not sent**; the backend resolves them for subsequent reads. Success `200` (void).

### 7.9 Delete (soft) — `DELETE /admin/regions/{id}` ⚠️

No body. **Must be a soft-delete** — paired with restore; the list must still return the row with `is_deleted` set. Possible `409` if the backend blocks deleting a region with assigned admins/facilities.

### 7.10 Restore — `POST /admin/regions/restore/{id}` ⚠️

No body. Success `200` (void).

> **Region reconciliation flags:** (1) **CRITICAL model mismatch** — FE = circle (`name + center + radius_km`); backend reportedly = cities/neighbourhoods. Resolve before wiring anything that depends on regions (facilities, bookings, subscriptions, dashboard scope all do). (2) `GET /admin/regions` must include soft-deleted rows. (3) RPC-style paths (`/is_active/{id}`, `/assign/{id}`, `/restore/{id}`) — confirm or reconcile. (4) `assigned_admin_names` resolved server-side. (5) Seeded ids `c1..c6` assumed stable.

---

## 8. Owners

Base paths: **`/admin/owners-management`** (owners + platform subscription) and **`/admin/platform-plans`** (plan catalog). `super_admin` only.

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | GET | `/admin/owners-management/owners` | List owners | ⚠️ Provisional namespace |
| 2 | GET | `/admin/owners-management/owners/{id}` | Owner detail | ⚠️ |
| 3 | GET | `/admin/owners-management/owners?pageSize=1000` | KPI stats (derived) | 🔴 No stats endpoint |
| 4 | PATCH | `/admin/owners-management/owners/{id}/status` | Account lifecycle (approve/reject/suspend/…) | ⚠️ |
| 5 | PATCH | `/admin/owners-management/owners/{id}/documents/{documentId}` | Review KYC doc | ⚠️ |
| 6 | POST | `/admin/owners-management/owners` | Admin-create owner (temp password) | ⚠️ |
| 7 | GET | `/admin/platform-plans?sector=sports` | Platform plan catalog | 🔴 Likely unbuilt |
| 8 | GET | `/admin/owners-management/owners/{ownerId}/subscription` | Owner's platform subscription | 🔴 Likely unbuilt |
| 9 | GET | `/admin/owners-management/owners/{ownerId}/subscription/invoices` | Subscription invoices | 🔴 Likely unbuilt |
| 10 | POST | `/admin/owners-management/owners/{ownerId}/subscription/change` | Upgrade/renew | 🔴 Likely unbuilt |

### Owner object (canonical snake_case, all fields optional on the wire)

```json
{
  "id": "o1",
  "name": "Sami Kanaan",
  "legal_name": "Sami K. Kanaan",
  "email": "sami@club.sy",
  "phone": "963933100201",
  "national_id": "01020304050",
  "date_of_birth": "1985-03-11",
  "avatar_url": "…",
  "city": "Damascus",
  "address": "Mezzeh, Damascus",
  "bio": "…",
  "link": "https://club.sy",
  "intended_facility_type": "sports_club",
  "region": "Damascus",
  "account_status": "active",
  "status_reason": "",
  "is_blocked": false,
  "blocked_reason": "",
  "trust_score": 82,
  "monthly_revenue_syp": 4250000,
  "facilities_count": 3,
  "documents": [ /* OwnerDocument[] */ ],
  "created_at": "2026-04-02T10:00:00.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Aliases: `_id`, `user_id`, `owner_id`. |
| `name` / `legal_name` | string | `legal_name` = read-only KYC identity. |
| `email`, `phone`, `national_id`, `date_of_birth` | string | `phone` = `963XXXXXXXXX`. |
| `city`, `address`, `bio`, `link` | string | |
| `intended_facility_type` | `"sports_club" \| "independent_court"` | |
| `region` | string | **Denormalized label** derived from the owner's facilities (not an id). |
| `account_status` | `"under_review" \| "active" \| "rejected" \| "suspended"` | Unknown → `under_review`. |
| `status_reason` | string | Admin note for rejected/suspended. |
| `is_blocked` | boolean | Permanent ban — **orthogonal** to `account_status`. |
| `blocked_reason` | string | |
| `trust_score` | number (0–100) | ⚠️ FE expects an int; backend stores a `trust_tier` enum — reconcile (§18). Displayed as a tier label only. |
| `monthly_revenue_syp` | number | SYP. |
| `facilities_count` | number | **Must be in the list payload** or the has/none facilities filter breaks. |
| `documents` | OwnerDocument[] | See §8.5. |
| `created_at` | string (ISO) | Aliases: `join_date`. |

### 8.1 List owners — `GET /admin/owners-management/owners` ⚠️

**Query params** (currently re-applied client-side): `q`, `status` (`all`/`under_review`/`active`/`rejected`/`suspended`/`blocked`), `facilities` (`all`/`none`/`has`), `joined` (`all`/`7d`/`30d`/`90d`/`year`), `page`, `pageSize`. List key: **`owners`**. Return the full scoped set including `facilities_count` and `trust_score`.

### 8.2 Owner detail — `GET /admin/owners-management/owners/{id}` ⚠️

Single Owner with `documents[]` populated. `404` if unknown.

### 8.3 Stats — `GET /admin/owners-management/owners?pageSize=1000` 🔴

Derived `{ total, under_review, active, blocked }`. **Recommended:** `GET /admin/owners-management/owners/stats`.

### 8.4 Account lifecycle — `PATCH /admin/owners-management/owners/{id}/status` ⚠️

> Single discriminated endpoint — **not** separate approve/reject routes.

| Field | Type | Req | Notes |
|---|---|---|---|
| `action` | `"approve" \| "reject" \| "suspend" \| "activate" \| "block" \| "unblock"` | ✔ | |
| `reason` | string | conditionally | **Required** for `reject`, `suspend`, `block`. |

**Server-side effects the FE assumes:**

| Action | Effect |
|---|---|
| `approve` | `account_status = active`, clear `status_reason`. |
| `reject` | `account_status = rejected`, set `status_reason`. |
| `suspend` | `account_status = suspended`, set reason, **cascade: disable all the owner's facilities**. |
| `activate` | `account_status = active`, clear reason. |
| `block` | `is_blocked = true`, set `blocked_reason`, **cascade: disable all facilities**. |
| `unblock` | `is_blocked = false`, clear `blocked_reason`. |

Success `200/204` (void). Valid action per state (FE-guarded, should be server-enforced): under_review→{approve,reject}; rejected→{approve}; active→{suspend}; suspended→{activate}; `block` always; blocked→{unblock} only. `409/422` on illegal transition.
> The `block`/`unblock` ban model and the facility-cascade are known backend gaps.

### 8.5 Review KYC document — `PATCH /admin/owners-management/owners/{id}/documents/{documentId}` ⚠️

| Field | Type | Req | Notes |
|---|---|---|---|
| `action` | `"accept" \| "reject"` | ✔ | |
| `reason` | string | on reject | Stored as the doc's `rejection_reason`; cleared on accept. |

**OwnerDocument shape** (inside `documents[]`):

```json
{
  "id": "d1",
  "type": "national_id",
  "status": "under_review",
  "rejection_reason": "",
  "url": "…",
  "mime_type": "image/jpeg",
  "uploaded_at": "2026-04-02T10:05:00.000Z"
}
```

`type ∈ national_id|business_license|tax_certificate|ownership_proof|other`; `status ∈ under_review|accepted|rejected`; `mime_type` drives image-vs-pdf viewer. Success `200/204` (void).

### 8.6 Admin-create owner — `POST /admin/owners-management/owners` ⚠️

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | string | ✔ | min 2 |
| `email` | string | ✔ | valid |
| `phone` | string | ✔ | `963` + 9 digits |
| `national_id` | string | ✔ | 11 digits |
| `intended_facility_type` | `"sports_club" \| "independent_court"` | ✔ | |
| `region` | string | — | **Sent but never collected by the form → always `undefined`.** Treat as optional. |

**Success (201):** the created Owner **plus a one-time `temp_password`**:

```json
{ "success": true, "data": { "id": "o9", "account_status": "under_review", "trust_score": 50, "temp_password": "Xy7$kPq2" } }
```

`409` on duplicate email/phone/national_id.

### 8.7 Platform plan catalog — `GET /admin/platform-plans?sector=sports` 🔴

**Query:** `sector=sports`. List key **`plans`**.

```json
{
  "id": "pl_pro",
  "tier": "pro",
  "name": "Pro",
  "monthly_price": 250000,
  "yearly_price": 2500000,
  "currency": "SYP",
  "feature_gate": {
    "max_facilities": 5,
    "banner_upload": true,
    "review_reply": true,
    "campaigns": true,
    "stats_retention_days": 365,
    "priority_support": false
  },
  "display_order": 2,
  "is_active": true
}
```

`tier ∈ free|pro|elite`. In `feature_gate`, `null` = unlimited (`max_facilities`, `stats_retention_days`).

### 8.8 Owner subscription — `GET /admin/owners-management/owners/{ownerId}/subscription` 🔴

```json
{
  "id": "sub1",
  "owner_id": "o1",
  "tier": "pro",
  "tier_name": "Pro",
  "status": "active",
  "billing_period": "monthly",
  "start_date": "2026-06-01T00:00:00.000Z",
  "renewal_date": "2026-07-01T00:00:00.000Z",
  "trial_end_date": null,
  "auto_renew": true
}
```

`status ∈ trial|active|expired|pending_activation`. Decide whether to `404` when no subscription exists or return a default Free record (the mock fabricates a Free/active one).

### 8.9 Subscription invoices — `GET …/{ownerId}/subscription/invoices` 🔴

List key **`invoices`**. Empty list is valid.

```json
{
  "id": "inv1",
  "owner_id": "o1",
  "tier": "pro",
  "tier_name": "Pro",
  "billing_period": "monthly",
  "amount": 250000,
  "currency": "SYP",
  "payment_method": "mock",
  "status": "paid",
  "issued_at": "2026-06-01T00:00:00.000Z",
  "reference": "BPL-SUB-2026-000001"
}
```

`payment_method ∈ mock|gateway` (V1 always `mock`); `status ∈ paid|pending|failed`.

### 8.10 Change subscription — `POST …/{ownerId}/subscription/change` 🔴

| Field | Type | Req | Notes |
|---|---|---|---|
| `target_tier` | `"free" \| "pro" \| "elite"` | ✔ | |
| `billing_period` | `"monthly" \| "yearly"` | ✔ | |
| `change_type` | `"subscribe" \| "upgrade" \| "downgrade" \| "renewal" \| "reactivation"` | ✔ | |

**Effects assumed:** set tier/period, `status=active`, reset `start_date=now`, `renewal_date = now + 30/365d`, clear `trial_end_date`; if resulting price > 0, append a `paid` invoice. Success `200/204` (void).
> **Downgrade/cancel semantics are undefined** — the mock refuses to downgrade even though `downgrade` is accepted. Backend must define.

**Cross-feature reads on the owner detail page** (owned by other domains): owner's facilities via `GET /admin/facilities-management/facilities?ownerId={id}&pageSize=100`; owner's posts via `GET /admin/community-management/posts?authorId={id}&pageSize=50`. Both require those list endpoints to honor the respective filter.

---

## 9. Players

Base paths: **`/admin/players-management`** and **`/admin/players-management/players`**. `super_admin` only. **Flat global list — no region param is ever sent** (only a free-text `city`/governorate filter). All paths are the FE's expected contract; none are confirmed built (🔴).

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | GET | `/admin/players-management/players` | List players | 🔴 |
| 2 | GET | `/admin/players-management/players/{id}` | Player 360 detail | 🔴 |
| 3 | GET | `…/players?pageSize=1000` | KPI stats (derived) | 🔴 No stats endpoint |
| 4 | GET | `…/players/{id}/subscription` | Platform subscription + invoices | 🔴 ⚠️ camelCase |
| 5 | GET | `…/players/{id}/rooms` | Play-rooms | 🔴 ⚠️ camelCase |
| 6 | GET | `…/players/{id}/ratings` | Ratings authored | 🔴 ⚠️ camelCase |
| 7 | GET | `…/players/{id}/reports` | Reports filed by/against | 🔴 ⚠️ camelCase |
| 8 | PATCH | `…/players/{id}/status` | Suspend/activate/block/unblock | 🔴 |
| 9 | PATCH | `…/players/{playerId}/ratings/{ratingId}` | Hide/un-hide a rating | 🔴 |
| 10 | PATCH | `…/players/{playerId}/reports/{reportId}` | Resolve/dismiss a report | 🔴 |
| 11 | PATCH | `…/players/{playerId}/lift-booking-suspension` | Lift no-show suspension | 🔴 |

### Player object (canonical snake_case; §1/§2 go through the `toPlayer` mapper)

```json
{
  "id": "p1",
  "name": "Nour Aziz",
  "email": "nour@example.sy",
  "phone": "963933100201",
  "gender": "female",
  "date_of_birth": "1998-07-20",
  "avatar_url": "…",
  "city": "Damascus",
  "bio": "…",
  "link": "https://…",
  "sports": [ { "sport": "padel", "skill_level": "intermediate" } ],
  "account_status": "active",
  "status_reason": "",
  "is_blocked": false,
  "blocked_reason": "",
  "email_verified": true,
  "two_factor_enabled": false,
  "account_type": "paid",
  "current_plan": "Pro",
  "no_show_violations": 1,
  "booking_suspended_until": null,
  "overall_rating": 4.6,
  "bookings_count": 42,
  "rooms_count": 7,
  "ratings_given_count": 12,
  "total_spent_syp": 850000,
  "open_reports_count": 0,
  "latitude": 33.51,
  "longitude": 36.28,
  "created_at": "2026-01-10T09:00:00.000Z"
}
```

Key fields: `account_status ∈ active|suspended` (orthogonal to `is_blocked`); `account_type ∈ free|paid`; `gender ∈ male|female` (any other value → unset); `sports[].skill_level ∈ beginner|intermediate|advanced|pro` (unknown → `beginner`); counters + `total_spent_syp`; `booking_suspended_until` + `no_show_violations` drive the no-show flag. Aliases tolerated on read: `_id`/`user_id`/`player_id` (id), `full_name` (name), `email_address` (email), `phone_number` (phone), `photo_url` (avatar_url), `region`→`city`, `website`/`social_link` (link), `status` (account_status), `isBlocked`/`blocked` (is_blocked), `join_date`/`createdAt` (created_at — **`join_date` wins if both present**), `lat`/`lng` or `location:{lat,lng}`.

### 9.1 List — `GET …/players` 🔴

**Query params** (client-side today): `q`, `status` (`all`/`active`/`suspended`/`blocked`), `accountType` (`all`/`free`/`paid`), `city`, `sport` (`all`/football/padel/tennis/basketball/volleyball/swimming), `joined` (`all`/`7d`/`30d`/`90d`/`year`), `page`, `pageSize`. List key **`players`**. Return the full set.

### 9.2 Detail — `GET …/players/{id}` 🔴

Single Player. `404` if unknown.

### 9.3 Stats — `GET …/players?pageSize=1000` 🔴

Derived `{ total, active, suspended, blocked }` where `active = account_status==='active' && !is_blocked`, etc. **Recommended:** `GET …/players/stats`.

### 9.4 Subscription — `GET …/players/{id}/subscription` 🔴 ⚠️ camelCase

> **Consumed with NO mapper — the backend MUST emit camelCase.**

```json
{
  "accountType": "paid",
  "planName": "Pro",
  "status": "active",
  "billingPeriod": "monthly",
  "startDate": "2026-06-01",
  "renewalDate": "2026-07-01",
  "priceSyp": 120000,
  "invoices": [
    { "id": "i1", "date": "2026-06-01", "amountSyp": 120000, "planName": "Pro", "status": "paid" }
  ]
}
```

`accountType ∈ free|paid`; `status ∈ active|expired`; `billingPeriod ∈ monthly|annual`.

### 9.5 Rooms — `GET …/players/{id}/rooms` 🔴 ⚠️ camelCase

List key **`rooms`**, no mapper (camelCase required):

```json
{
  "id": "r1", "sport": "padel", "facilityName": "Mezzeh Club", "courtName": "Court 2",
  "date": "2026-07-10", "startTime": "18:00", "role": "leader", "type": "public",
  "matchStyle": "friendly", "joinedCount": 3, "requiredCount": 4, "status": "open"
}
```

`role ∈ leader|member`; `type ∈ public|private`; `matchStyle ∈ friendly|competitive|training`; `status ∈ open|full|ended|cancelled`.

### 9.6 Ratings — `GET …/players/{id}/ratings` 🔴 ⚠️ camelCase

List key **`ratings`**, no mapper:

```json
{ "id": "rt1", "target": "facility", "targetName": "Mezzeh Club", "targetId": "f1",
  "stars": 4, "comment": "Great courts", "date": "2026-06-20", "hidden": false }
```

`target ∈ facility|club|player`; `targetId` deep-links facility/club targets.

### 9.7 Reports — `GET …/players/{id}/reports` 🔴 ⚠️ camelCase

List key **`reports`**, no mapper:

```json
{ "id": "rp1", "direction": "against", "counterpartyName": "Sami K.", "counterpartyId": "p9",
  "reason": "no_show", "details": "…", "context": "booking",
  "status": "open", "date": "2026-06-25", "resolutionNote": "" }
```

`direction ∈ filed|against`; `context ∈ room|chat|community|booking`; `status ∈ open|reviewing|resolved|dismissed`. Open-report count = `direction==='against'` and status `open|reviewing`.

### 9.8 Moderate account — `PATCH …/players/{id}/status` 🔴

| Field | Type | Req | Notes |
|---|---|---|---|
| `action` | `"suspend" \| "activate" \| "block" \| "unblock"` | ✔ | |
| `reason` | string | — | `status_reason` on suspend, `blocked_reason` on block; cleared on activate/unblock. |

Success `200/204` (void). `account_status` and `is_blocked` are **two orthogonal columns**.

### 9.9 Hide rating — `PATCH …/players/{playerId}/ratings/{ratingId}` 🔴

Body: `{ "hidden": boolean }`. Success `200/204`.

### 9.10 Resolve report — `PATCH …/players/{playerId}/reports/{reportId}` 🔴

| Field | Type | Req | Notes |
|---|---|---|---|
| `action` | `"resolve" \| "dismiss"` | ✔ | `resolve`→`resolved`, `dismiss`→`dismissed`. |
| `note` | string | — | Stored as `resolutionNote`. |

Side effect: recompute the player's `open_reports_count`. Success `200/204`.

### 9.11 Lift booking suspension — `PATCH …/players/{playerId}/lift-booking-suspension` 🔴

Body: `{}` (empty). Effect: `booking_suspended_until = null`, `no_show_violations = 0`. Success `200/204`.

**Cross-feature profile tabs:** Posts → `GET /admin/community-management/posts?authorId={playerId}`; Bookings → bookings list filtered by `playerId`; Club memberships → subscriptions list filtered by `playerId`.

> **Player reconciliation:** (2) subscription/rooms/ratings/reports are camelCase-only (highest-risk go-live item) — emit camelCase or add FE mappers. (4) FE sends **no region param** for players; if the backend scopes players regionally, reconcile.

---

## 10. Facilities

Base paths: **`/admin/facilities-management`**, **`/admin/facilities-management/facilities`**, **`/admin/facilities-management/pending-review`**. Callable by `super_admin` + `admin`. **Region scoping is applied client-side** today (super_admin sees all incl. orphans; a regional admin sees only in-region facilities). All reads additionally call `GET /admin/regions` for scope math — coupling this domain to the region-model reconciliation. Endpoints are SRS-derived and **not built** (🔴).

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | GET | `/admin/facilities-management/facilities` | List / pending queue | 🔴 (+ ⚠️ client paging, region coupling) |
| 2 | GET | `…/facilities/{id}` | Facility detail / edit-seed | 🔴 |
| 3 | PATCH | `…/pending-review/{id}` `{status:"approved"}` | Approve pending | 🔴 |
| 4 | PATCH | `…/pending-review/{id}` `{status:"rejected",reason}` | Reject pending | 🔴 |
| 5 | PATCH | `…/pending-review/bulk` | Bulk approve/reject | 🔴 |
| 6 | PATCH | `…/facilities/{id}/suspend` | Suspend active facility | 🔴 |
| 7 | PATCH | `…/facilities/{id}/reactivate` | Reactivate suspended | 🔴 |
| 8 | PATCH | `…/facilities/{facilityId}/documents/{documentId}` | Review one KYC doc | 🔴 |
| 9 | POST | `…/facilities` | Create facility (admin-authored) | 🔴 |
| 10 | PUT | `…/facilities/{id}` | Update facility | 🔴 |
| 11 | GET | `…/facilities?pageSize=1000` | Stats (derived) | 🔴 No stats endpoint |
| 12 | GET | `…/region-counts` | Facility count per region | 🔴 |
| 13 | GET | `…/owner-counts` | Facility count per owner | 🔴 |
| 14 | GET | `…/facilities?regionId={id}` | Facilities in one region | 🔴 |

### Facility object (canonical snake_case; discriminated by `type`)

```json
{
  "id": "f1",
  "name": "Mezzeh Sports Club",
  "type": "club",
  "status": "active",
  "source": "admin",
  "created_at": "2026-05-10T08:00:00.000Z",
  "rating": 4.5,
  "owner_id": "o1",
  "owner_name": "Sami Kanaan",
  "admin_notes": "",
  "suspension_reason": "",
  "location": { "lat": 33.51, "lng": 36.28, "address": "Mezzeh St", "city": "Damascus", "governorate": "damascus", "district": "Mezzeh" },
  "images": ["…"],
  "documents": [ { "id": "d1", "name": "License", "status": "approved", "rejection_reason": "", "url": "…", "mime_type": "application/pdf" } ],
  "statistics": { "occupancy_percent": 72, "revenue_syp": 3200000, "today_bookings": 14 },
  "description": "…",
  "logo_url": "…",
  "sports": ["padel", "tennis"],
  "contact_phone": "963933100201",
  "working_hours": { "1": { "is_open": true, "open_time": "09:00", "close_time": "23:00" } },
  "courts": [ { "id": "c1", "name": "Court 1", "sport": "padel", "price_per_hour": 40000, "surface": "artificial", "is_indoor": false, "has_lighting": true, "capacity": 4, "is_active": true } ]
}
```

- **Common:** `type ∈ club|pitch`; `status ∈ pending|active|rejected|suspended|owner_suspended` (unknown→`pending`); `source ∈ admin|owner` (unknown→`owner`); `admin_notes` = rejection reason; `suspension_reason`; `statistics` is read-only KPI.
- **`location.governorate`** = one of the 14 Syrian enum slugs.
- **`documents[].status ∈ pending|approved|rejected`** (aliases accepted/verified→approved, denied→rejected).
- **Club-only:** `description`, `logo_url`, `sports[]`, `contact_phone`, `working_hours` (weekday keys `"1".."7"`), `courts[]` (see §11).
- **Pitch-only:** `sport`, `price_per_hour`, `capacity`, `specs { surface, is_indoor, has_lighting, has_parking, has_locker_room, has_cafe }`, `cancel_policy { free_hours_before, penalty_percent }`.

### 10.1 List — `GET …/facilities` 🔴

**Query params** (client-side today): `q`, `status`, `kind` (`all`/`club`/`pitch`), `source` (`all`/`admin`/`owner`), `sport`, `regionId` (`all`/`orphans`/id), `ownerId` (`all`/id), `minRating`, `governorate`, `city`, `verification` (`all`/`verified`/`unverified`/`no_docs`), `amenities[]`, `dateRange`, `sortBy` (`createdAt`/`name`/`rating`), `sortDir`, `page`, `pageSize`. List key **`facilities`**. **The pending queue reuses this endpoint with `status=pending`.**
> ⚠️ Must return the **full scoped set** — the FE re-paginates client-side; a server page renders page 2+ empty.

### 10.2 Detail — `GET …/facilities/{id}` 🔴

Single full Facility (courts, working hours, documents with `url`+kind, statistics). **Not-found must be HTTP 404** (the FE hardened its detection to `status===404`). Out-of-scope admin is treated as 404.

### 10.3 Approve — `PATCH …/pending-review/{id}` 🔴

Body: `{ "status": "approved" }`. **Invariants (→ 409):** only from `pending`; **all verification documents must already be `approved`** (a doc-less facility can never be approved). Success `200/204` (void).

### 10.4 Reject — `PATCH …/pending-review/{id}` 🔴

Body: `{ "status": "rejected", "reason": string }` (reason required, stored as `admin_notes`). Shares the route with approve, discriminated by `status`. `400` empty reason; `409` if not `pending`.

### 10.5 Bulk — `PATCH …/pending-review/bulk` 🔴

Body: `{ "ids": string[], "status": "approved"|"rejected", "reason"? }` (`reason` required when rejecting). **Recommended response:**

```json
{ "success": true, "data": { "succeeded": 5, "skipped": ["f7", "f9"] } }
```

`skipped` = ids not in an actionable state (or, for approve, docs not all approved). (The real FE currently ignores `skipped` and assumes all succeeded — a partial-skip backend won't be reflected unless the FE is updated.)

### 10.6 Suspend — `PATCH …/facilities/{id}/suspend` 🔴

Body: `{ "reason": string }` (required, stored as `suspension_reason`). `409` if not `active`/`owner_suspended`.

### 10.7 Reactivate — `PATCH …/facilities/{id}/reactivate` 🔴

No body. Clears `suspension_reason` → `active`. `409` if not `suspended`.

### 10.8 Review document — `PATCH …/facilities/{facilityId}/documents/{documentId}` 🔴

Body: `{ "status": "approved"|"rejected", "reason"? }` (reason required on reject). This is the per-doc gate that unlocks approval. `400` empty reason on reject; `404` unknown doc.

### 10.9 Create — `POST …/facilities` 🔴

New facilities are `source: "admin"`, start `status: "pending"`. Body (`buildFacilityBody`, snake_case):

| Field | Type | Req | Notes |
|---|---|---|---|
| `owner_id` | string | ✔ | |
| `type` | `"club"\|"pitch"` | ✔ | |
| `name` | string | ✔ | 3–60 chars |
| `description` | string | — | ≤500 |
| `sports` | string[] | ✔ | ≥1 (pitch = `[sport]`) |
| `contact_phone` | string | — | `^[0-9+\s-]{8,}$` or empty |
| `location` | object | ✔ | `{ lat(−90..90), lng(−180..180), address(≥5), city(≥2), governorate(enum), district(≥2) }` |
| `working_hours` | object | club | weekday map; ≥1 open day |
| `courts` | Court[] | club | ≥1 court (see §11) |
| `price_per_hour` | number | pitch | > 0 |
| `capacity` | int | pitch | > 0 |
| `specs` | object | pitch | surface/indoor/lighting/parking/locker/cafe |
| `cancel_policy` | object | pitch | `{ free_hours_before(≥0), penalty_percent(0..100) }` |
| `images` | string[] | ✔ | 1–6 URLs |
| `documents` | `[{name,url}]` | ✔ | ≥1; status server-assigned `pending` |

**Success (200/201):** created Facility echoing server `id`, `status:"pending"`, `source:"admin"`, `created_at`, empty `statistics`.
> Open question: pre-uploaded URLs vs multipart upload for `images`/`documents`.

### 10.10 Update — `PUT …/facilities/{id}` 🔴

Body identical to Create. Server must **preserve** `status`, `created_at`, `statistics`, `rating`, and per-document review status (mock matches docs by `url`). The FE only exposes Edit for `source==='admin'` facilities (UI gate only; the endpoint is generic).

### 10.11 Stats — `GET …/facilities?pageSize=1000` 🔴

Derived `FacilityStats { total, active, pending, suspended, rejected, avgRating, aged, orphan }` (`aged` = pending older than 48h; `orphan` = outside every active region, super_admin only). **Recommended:** scope-aware `GET …/facilities/stats`.

### 10.12 Region counts — `GET …/region-counts` 🔴

Returns `{ "<regionId>": <count> }`. Keyed by whatever the backend's region identity is (region-model coupling).

### 10.13 Owner counts — `GET …/owner-counts` 🔴

Returns `{ "<ownerId>": <count> }`. Powers the owners list facility-count column/filter.

### 10.14 Facilities in one region — `GET …/facilities?regionId={id}` 🔴

Query `regionId`. **On the wire this reuses the exact same `…/facilities` list endpoint and returns the full snake_case `FacilityDto` list under key `facilities`** (identical shape to §10.1, just filtered by `regionId`) — the `{ id, name, kind, ownerId, ownerName, ownerPhotoUrl?, thumbnailUrl?, lat, lng, statistics }` camelCase projection is applied **client-side** (`.map(toFacility).map(toRegionFacility)`), NOT a distinct response. Do **not** build a separate projected response for this route. Requires server-side `regionId` filtering (region-model coupling).

> **Owner-block cascade:** the FE's `suspendFacilitiesByOwner` is a deliberate **no-op** — the cascade is assumed to happen **server-side** when the admin hits the owner-status endpoint (§8.4). Backend must ensure blocking/suspending an owner auto-suspends their active facilities and re-exposes them via the list with `status:'suspended'` + `suspension_reason`.

> **Facility reconciliation:** (1) region model (CRITICAL — reads depend on `GET /admin/regions` circles); (2) return full scoped set (client re-paginates); (3) 404, not string-match; (4) 409 with a code on invalid transitions; (5) exact enum wire values (status, kind, source, doc status, 14 governorate slugs, sports `tennis|padel|football|basketball|swimming|volleyball`, surfaces `grass|artificial|hardcourt|clay|sand`).

---

## 11. Courts

**There is no standalone Courts resource or endpoint.** Courts are modeled as **nested objects inside a facility**:

- A **club** facility owns a `courts[]` array (multiple courts).
- A **pitch** facility *is* its own single court — its court fields live directly on the facility (`sport`, `price_per_hour`, `capacity`, `specs`, `cancel_policy`), and its bookings carry no `court_name`.

Court lifecycle is therefore handled entirely through the Facility endpoints:

| Operation | How |
|---|---|
| Read courts | `GET /admin/facilities-management/facilities/{id}` (§10.2) → `courts[]` |
| Create/replace courts | `POST` / `PUT …/facilities` (§10.9/§10.10) — send the full `courts[]` in the body |
| A court's bookings | `GET /admin/bookings?facilityId={id}` (§13.1) — bookings carry `court_name` for club facilities |

### Court object (element of `courts[]`)

```json
{
  "id": "c1",
  "name": "Court 1",
  "sport": "padel",
  "price_per_hour": 40000,
  "surface": "artificial",
  "is_indoor": false,
  "has_lighting": true,
  "capacity": 4,
  "is_active": true
}
```

| Field | Type | Req (in create/update) | Notes |
|---|---|---|---|
| `id` | string | — | Omitted for new courts; server-assigned. |
| `name` | string | ✔ | ≥2 |
| `sport` | string | ✔ | |
| `price_per_hour` | number (SYP) | ✔ | > 0 |
| `surface` | string | ✔ | `grass\|artificial\|hardcourt\|clay\|sand` |
| `is_indoor` | boolean | ✔ | |
| `has_lighting` | boolean | ✔ | |
| `capacity` | int | — | > 0 |
| `is_active` | boolean | ✔ | |

> **Backend status:** 🔴 (inherits Facilities — not built). No dedicated court CRUD is needed; build courts as a nested collection persisted atomically with the facility. If the backend prefers per-court routes, it must still accept the full `courts[]` on facility create/update, since that is what the FE sends.

---

## 12. Community

Base paths: **`/admin/community-management`**, **`/admin/community-management/posts`**. Callable by `super_admin` + `admin`. **No region filter is sent** (backend decides regional visibility if any). **Moderation-only** surface (read + moderate; no create/react — those happen in the mobile app). Write bodies are **camelCase-free literals** (`action`, `reason`). Not built (🔴).

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | GET | `/admin/community-management/posts` | List posts | 🔴 |
| 2 | GET | `…/posts/{id}` | Post detail | 🔴 |
| 3 | GET | `…/posts/{postId}/comments` | Comments (incl. removed) | 🔴 |
| 4 | GET | `…/posts/{postId}/reactors` | Per-actor reactions | 🔴 |
| 5 | PATCH | `…/posts/{id}/moderation` | Remove/restore/delete post | 🔴 |
| 6 | PATCH | `…/posts/{postId}/comments/{commentId}/moderation` | Moderate comment | 🔴 |
| — | GET | `…/posts?pageSize=1000` | Stats (derived) | 🔴 No stats endpoint |

### Post object (canonical snake_case; list key **`posts`**)

```json
{
  "id": "post1",
  "author": { "id": "o1", "facility_id": "f1", "type": "facility", "name": "Mezzeh Club", "logo_url": "…" },
  "body": "Grand opening this weekend!",
  "media_urls": ["…"],
  "media_url": null,
  "media_type": null,
  "visibility": "public",
  "moderation_status": "published",
  "removed_reason": "",
  "removed_at": null,
  "removed_by": null,
  "interactions": { "like": 40, "love": 12, "celebrate": 5, "support": 2, "insightful": 1 },
  "total_comments": 8,
  "total_shares": 3,
  "created_at": "2026-07-01T12:00:00.000Z"
}
```

- **Author (`CommunityActor`):** `type ∈ player|facility`. For a **facility** author, `facility_id` deep-links the facility profile while `id`/`author_id` is the owner id.
- **Media:** `media_urls` (string[]) is the **preferred** wire key for the attached-images gallery (alias `images` accepted as fallback). `media_url` (string|null) is the optional **primary / video** URL. **`media_type` is derived from `media_url` ALONE:** `"video"` when `media_url` is a video, `"image"` when `media_url` is a primary image, and `null`/absent when `media_url` is `null` — **even if `media_urls` has images** (a text-only or gallery-only post carries `media_url: null` + `media_type: null`; the gallery still renders from `media_urls`). When a post is a video, `media_type` MUST be `"video"`.
- `visibility ∈ public|private`; `moderation_status ∈ published|removed`; `interactions` are the five reaction aggregate counts. FE derives `total_reactions = sum(interactions)`.

### 12.1 List posts — `GET …/posts` 🔴

**Query params** (camelCase today; client-side): `q`, `authorType` (`all`/`player`/`facility`), `status` (`all`/`published`/`removed`), `hasMedia` (`all`/`yes`/`no`), `visibility` (`all`/`public`/`private`), `dateRange` (object), `authorId` (internal author scope), `page`, `pageSize`. Return the full matching set (FE re-paginates).
> Reconcile param naming (FE sends camelCase; consider snake_case + flattened `date_from`/`date_to`).

### 12.2 Post detail — `GET …/posts/{id}` 🔴

Single Post. `404` if unknown.

### 12.3 Comments — `GET …/posts/{postId}/comments` 🔴

List key **`comments`**; includes removed comments. No pagination.

```json
{ "id": "c1", "post_id": "post1", "author": { "id": "p3", "type": "player", "name": "Nour" },
  "body": "Congrats!", "moderation_status": "published", "removed_reason": "", "removed_at": null, "removed_by": null,
  "created_at": "2026-07-01T13:00:00.000Z" }
```

### 12.4 Reactors — `GET …/posts/{postId}/reactors` 🔴

List key **`reactors`**; each item = a `CommunityActor` **plus** `reaction` (one of `like|love|celebrate|support|insightful`, default `like`). Fetched lazily when the "who reacted" modal opens.

### 12.5 Moderate post — `PATCH …/posts/{id}/moderation` 🔴

| Field | Type | Req | Notes |
|---|---|---|---|
| `action` | `"remove" \| "restore" \| "delete"` | ✔ | |
| `reason` | string | — | Used for `remove`. |

**Semantics:** `remove` → `moderation_status='removed'`, stamp `removed_at`/`removed_by` (current admin), store `removed_reason`; `restore` → `published`, clear removed_*; `delete` → **hard-delete post + cascade comments/reactors**. Removing/restoring/deleting must keep the post's published comment count and platform KPIs consistent. Success `200/204` (void).
> ⚠️ `delete` is a moderation **action**, not an HTTP `DELETE …/posts/{id}`. Reconcile if the backend prefers REST delete. Body fields are `action`/`reason` (not snake_case).

### 12.6 Moderate comment — `PATCH …/posts/{postId}/comments/{commentId}/moderation` 🔴

Same body as §12.5. `delete` hard-removes the comment row; **must recompute the parent post's published `total_comments`**. Success `200/204` (void).

### 12.7 Stats — `GET …/posts?pageSize=1000` 🔴

Derived `{ total_posts, total_comments, total_reactions, removed }`. **Recommended:** `GET /admin/community-management/posts/stats`.

---

## 13. Bookings

Base path: **`/admin/bookings`**. Callable by `super_admin` + `admin`. **Read-only** — zero mutations exist in the slice. **Region-scoped** (regional admin sees only in-region bookings), but the Booking entity carries **no region data**; scope, region names, and orphan flags are derived by cross-referencing the facilities + regions endpoints on the client. Not built (🔴).

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | GET | `/admin/bookings` | List bookings | 🔴 (+ ⚠️ client paging) |
| 2 | GET | `/admin/bookings/{id}` | Booking detail | 🔴 |
| — | GET | `/admin/bookings?pageSize=1000` | Stats (derived) | 🔴 No stats endpoint |
| — | — | (client-side XLSX export) | Export | N/A — no endpoint |

### Booking object (canonical snake_case; list key **`bookings`**)

```json
{
  "id": "b1",
  "reference": "BPL-2026-001234",
  "player_id": "p1",
  "player_name": "Nour Aziz",
  "player_photo_url": "…",
  "player_no_show_violations": 1,
  "guest": null,
  "block_title": null,
  "block_reason": null,
  "facility_id": "f1",
  "facility_name": "Mezzeh Club",
  "facility_kind": "club",
  "court_name": "Court 2",
  "sport": "padel",
  "date": "2026-07-12",
  "start_time": "18:00",
  "end_time": "19:30",
  "duration_hours": 1.5,
  "status": "confirmed",
  "source": "electronic",
  "payment_status": "paid",
  "payment_method": "cash",
  "money": { "applied_price_syp": 60000, "fees_syp": 0, "tax_syp": 0, "total_syp": 60000 },
  "check_in": { "checked_in_at": "2026-07-12T18:02:00.000Z", "method": "qr" },
  "recurring_series_id": null,
  "notes": "",
  "timeline": [ { "status": "under_review", "at": "2026-07-10T09:00:00.000Z" }, { "status": "confirmed", "at": "2026-07-10T09:05:00.000Z" } ],
  "created_at": "2026-07-10T09:00:00.000Z"
}
```

- **Party model:** `source:'private'` → block (has `block_title`/`block_reason`, no player/guest); `player_id` present → registered player; else `guest: { name?, phone? }` → walk-in.
- `status ∈ under_review|confirmed|completed|cancelled|rejected|no_show`; `source ∈ electronic|manual|private`; `payment_status ∈ unpaid|paid|refunded`; `payment_method ∈ cash|transfer`; `sport ∈ tennis|padel|football|basketball|swimming|volleyball`; `check_in.method ∈ qr|manual`.
- **`id` aliases: NONE for bookings.** Unlike the global §4.7 note, the Booking mapper reads exactly `id`, `facility_id`, `player_id` — a backend emitting `_id`/`booking_id` yields an empty booking id (breaks detail links). Emit these exact keys.
- Each `timeline` entry may carry an optional **`note`** string (the cancel/reject/no-show reason shown on the detail page), e.g. `{ "status": "cancelled", "at": "…", "note": "Player cancelled 24h before" }`.
- `court_name` present for club bookings, omitted for pitch. `money.*` all SYP. `block_reason ∈ maintenance|holiday|event`.
- **The list endpoint must return the complete object per booking** — the detail page consumes `timeline`, `money`, `check_in`, `notes`, `player_no_show_violations`; the FE does not make a second call to enrich list rows.

### 13.1 List — `GET /admin/bookings` 🔴

**Query params** (client-side today): `q`, `status`, `paymentStatus`, `facilityId`, `sport`, `source`, `regionId` (**a region NAME**, or `all`/`orphans`), `dateRange` (`{preset,from?,to?}` on the slot date), `playerId` (internal — player-profile tab), `sortBy` (`date`/`createdAt`/`totalSyp`/`reference`), `sortDir`, `page`, `pageSize`.
> ⚠️ Must return the **full scoped set** — the FE re-filters/sorts/paginates and discards server `total`/`pageCount`. Export re-runs the list with `pageSize=100000`, so the endpoint must honor very large page sizes (or return everything).

### 13.2 Detail — `GET /admin/bookings/{id}` 🔴

Single full Booking. **Scope-enforce server-side:** an out-of-scope booking must read as **404, never 403** (the FE also guards this by throwing "Booking not found" for a facility outside the admin's scope).

### 13.3 Stats — `GET /admin/bookings?pageSize=1000` 🔴

Derived `{ total, underReview, confirmed, completed, attention, revenueSyp }` (attention = cancelled+rejected+no_show; `revenueSyp` = sum of `total_syp` where `payment_status==='paid'`). **Recommended:** scope-aware `GET /admin/bookings/stats → { total, under_review, confirmed, completed, attention, revenue_syp }`.

**Scope dependencies:** `GET /admin/facilities-management/facilities?pageSize=1000` (scope oracle: visible ids, region names, orphan flags) and `GET /admin/regions` (region filter options, by **name**). If `/admin/bookings` ever does server-side region filtering, the `regionId`-is-a-name semantics must be reconciled with the region model.

---

## 14. Subscriptions (Club Memberships)

Base path: **`/admin/subscriptions`**. Callable by `super_admin` + `admin`. **Read-only** — zero mutations. **Visibility is derived from club scope** (not sent to this endpoint): the service also fetches `GET /admin/facilities-management/facilities?kind=club&page=1&pageSize=1000` (the FE sends `kind=club`, **not** `type=club`) and drops memberships whose `club_id` is not visible. Not built (🔴).

> This is the **club membership** a player buys from a club — distinct from the owner's **platform** subscription (§8) and the player's **platform** subscription (§9.4).

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | GET | `/admin/subscriptions` | List memberships | 🔴 (+ ⚠️ client paging) |
| 2 | GET | `/admin/subscriptions/{id}` | Membership detail | 🔴 |
| — | GET | `/admin/subscriptions?pageSize=1000` | Stats (derived) | 🔴 No stats endpoint |
| — | GET | `/admin/subscriptions/stats` | Recommended stats endpoint (not yet called) | 🔴 Optional |

### Membership object (canonical snake_case; list key **`subscriptions`**)

```json
{
  "id": "m1",
  "player_id": "p1",
  "player_name": "Nour Aziz",
  "player_photo_url": "…",
  "club_id": "f1",
  "club_name": "Mezzeh Club",
  "club_logo_url": "…",
  "plan": {
    "name": "Gold Monthly",
    "price_syp": 300000,
    "duration_days": 30,
    "plan_type": "individual",
    "billing_cycle": "monthly",
    "monthly_entry_limit": null,
    "features": ["locker", "sauna"]
  },
  "status": "active",
  "start_date": "2026-06-01T00:00:00.000Z",
  "end_date": "2026-07-01T00:00:00.000Z",
  "entries_used": 9,
  "payments": [ { "id": "pay1", "date": "2026-06-01", "amount_syp": 300000, "method": "cash", "status": "paid" } ],
  "check_ins": [ { "id": "ci1", "date": "2026-06-03", "method": "qr" } ],
  "created_at": "2026-06-01T00:00:00.000Z"
}
```

- `status ∈ pending_activation|active|paused|expired|cancelled` (unknown→`pending_activation`).
- `plan` is an **embedded immutable snapshot** (not a plan-id reference). `plan_type ∈ individual|family|corporate|trial`; `billing_cycle ∈ monthly|quarterly|yearly|day_pass`; `monthly_entry_limit` = `number|null` (null = unlimited).
- `payments[].method ∈ cash|transfer`, `payments[].status ∈ unpaid|paid|refunded`; `check_ins[].method ∈ qr|manual`.

### 14.1 List — `GET /admin/subscriptions` 🔴

**Query params** (client-side today): `q`, `status`, `clubId`, `planName`, `segment`, `regionId` (**region NAME**, or `all`/`orphans`), `dateRange`, `playerId` (internal), `sortBy` (`startDate`/`endDate`/`createdAt`/`priceSyp`), `sortDir`, `page`, `pageSize`. Return the full scoped set. The FE adds client-derived `segments[]`, `regionNames[]`, `isOrphan` (not on the wire).

### 14.2 Detail — `GET /admin/subscriptions/{id}` 🔴

Single Membership (with `payments[]` + `check_ins[]`). Return **404 for both missing and out-of-scope** (the FE masks out-of-scope as not-found).

### 14.3 Stats — `GET /admin/subscriptions?pageSize=1000` 🔴

Derived `{ total, active, pendingActivation, paused, expired, cancelled, nearExpiry, churnRisk, revenueSyp }` (`revenueSyp` = sum of `payments[].amount_syp` where paid). **Recommended:** `GET /admin/subscriptions/stats → { total, active, pending_activation, paused, expired, cancelled, near_expiry, churn_risk, revenue_syp }` (not yet called by the FE).

---

## 15. Profile (admin self)

Base path: **`/admin/profile`**. Any authenticated admin, acting on **self** (identity from the Bearer token; no `{id}`). Not region-scoped. Only **2 write endpoints** exist; there is **no GET** today.

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | PATCH | `/admin/profile` | Update name + avatar | ⚠️ Avatar transport + casing |
| 2 | POST | `/admin/profile/password` | Change password | ⚠️ Provisional |
| — | GET | `/admin/profile` (or `/admin/me`) | Read self profile | 🔴 **Missing — needed** |

### 15.1 Update profile — `PATCH /admin/profile` ⚠️

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | string | ✔ | 2–60 chars (trimmed). |
| `avatar_url` | string \| null | ✔ (nullable) | **`null` = remove photo.** Value is a **base64 `image/webp` data URL** (~256×256, client-downscaled) — **not** a file upload or hosted URL. |

**Success (200)** — ⚠️ the FE reads the response as **camelCase** with no mapper:

```json
{ "success": true, "data": { "name": "Layla Haddad", "avatarUrl": "data:image/webp;base64,…" } }
```

> ⚠️ **Casing asymmetry:** request sends `avatar_url` (snake), but the response must carry `avatarUrl` (camel) or the avatar drops to `undefined` after save. Either the backend echoes camelCase here, or the FE needs a mapper.
> ⚠️ **Avatar transport:** the FE sends the image inline as a data-URL JSON string (source files up to 5 MB pre-downscale; transmitted payload is a small webp). A backend expecting multipart → hosted CDN URL is incompatible. Decide: accept + store the data-URL, or rework the FE to multipart upload.

**Errors:** `422/400` if name outside 2–60; `401` → logout.

### 15.2 Change password — `POST /admin/profile/password` ⚠️

| Field | Type | Req | Notes |
|---|---|---|---|
| `current_password` | string | ✔ | Backend must verify. |
| `new_password` | string | ✔ | Strong-password rule; must differ from current. (`confirmPassword` is UI-only, never sent.) |

**Success:** `200/204` (body ignored). **Errors:** wrong current password → a **4xx with a human/field `message`** (the FE maps `error.message` onto the `currentPassword` field, falling back to a generic key); weak new password → `422/400`.

### 15.3 Read profile — `GET /admin/profile` 🔴 (missing)

There is **no read endpoint**; the profile page renders from the JWT-decoded auth store. Consequence: **`avatar_url` is never fetched from the server** — it only appears as the return value of §15.1 within a session and is persisted to localStorage. **After a fresh login on a new device, the saved avatar will not display.** The backend should expose a read returning at least:

```json
{ "name": "…", "email": "…", "role": "admin", "avatar_url": "…", "assigned_region_ids": ["c1"] }
```

…and the FE should hydrate from it on load.

---

## 16. Notifications

The admin's **inbound** notification centre (SRS module 14 branch ج — `FR-ADM-SET-006/007/008`). Callable by `super_admin` **and** `admin`. **Inbound only:** SRS §0.2 puts marketing, campaigns and multi-channel broadcast explicitly out of scope, so there is no compose, audience, schedule or template endpoint in this contract and none should be built for V1.

This is the **one domain that is largely already implemented**. The module lives at `bplay-backend/src/modules/notifications` and is mounted at `/notifications` behind `app.authenticate` alone — no role guard, no permission, no city scope. Every route is scoped to `request.user.sub`, so an admin JWT reads *that admin's own* rows, which is exactly the required behaviour.

> ⚠️ **This domain is `camelCase` on the wire, not `snake_case`** (`readAt`, `createdAt`, `subject:{type,id}`). It is the documented exception to §2's casing rule. The FE mapper accepts both, but the canonical shape below is what the server actually emits today (`notifications.service.js:382`).

> ⚠️ **Envelope:** `{ success, data }` — no `message`, no `meta`. The list returns a **bare array** under `data`, not a keyed object.

| # | Method | Path | Purpose | Role | Status |
|---|---|---|---|---|---|
| 1 | GET | `/notifications` | The caller's notifications (keyset) | any authenticated | ✅ **Built** |
| 2 | GET | `/notifications/unread-count` | Badge count | any authenticated | ✅ **Built** |
| 3 | POST | `/notifications/{id}/read` | Mark one read | any authenticated | ✅ **Built** |
| 4 | POST | `/notifications/read-all` | Mark all read | any authenticated | ✅ **Built** |
| 5 | GET | `/notifications/preferences` | Delivery matrix | any authenticated | ✅ **Built** |
| 6 | PUT | `/notifications/preferences` | Upsert one setting | any authenticated | ✅ **Built** |
| 7 | GET | `/realtime/stream?token=` | SSE live push | any authenticated | ✅ **Built** |
| 8 | — | *(producers for the 5 SRS events)* | Emit the rows | — | 🔴 **Not built — needed** |

### Notification object (canonical, **camelCase**)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid string | |
| `type` | string | **Free text `VARCHAR(64)`, no enum.** Defaults to the template key. The FE maps a closed set (below) and everything else to `other` — it never guesses. |
| `category` | string | Backend vocabulary (`admin`, `rooms`, …). **The FE derives its own category from `type` and ignores this on read**; it is used only as the preferences key. |
| `title` | string | Already rendered in the reader's locale from `notification_templates`. Plain text. |
| `body` | string \| null | Same. `{{var}}` placeholders interpolated from `vars`. |
| `data` | object | This is the row's **`vars`** JSONB, renamed on the wire. (A separate legacy `data` column exists and is not used.) |
| `subject` | `{ type, id }` \| null | **The deep link.** See the subject table below. |
| `groupKey` | string \| null | Not consumed by the admin FE. |
| `priority` | integer | `SMALLINT`, default 0. Only `> 0` is meaningful. |
| `readAt` | ISO 8601 \| null | Authoritative read state. |
| `createdAt` | ISO 8601 | |
| `regionId` | uuid string \| null | 🔴 **Not emitted today — required by FR-ADM-SET-008.** `null` = platform-wide (visible to every addressee, **not** an orphan). |
| `regionNames` | string[] | 🔴 Not emitted today. Display label for the region tag. |

### 16.1 List — `GET /notifications` ✅

**Query:** `unreadOnly` (bool, def `false`) · `category` (≤40 chars) · `limit` (1–100, def 50) · `before` (ISO date-time **keyset cursor**) · `locale` (`ar|en`).

```json
{ "success": true, "data": [ { "id": "…", "type": "admin.owner_request", "title": "…" } ] }
```

> ⚠️ **Two divergences the FE works around today.**
> **(a) Pagination is keyset, the FE is page-based.** There is no `total` and no `meta`. The FE fetches one `limit=100` window and re-paginates client-side. To fix properly, return `{ items, meta: { page, pageSize, total } }` (see §18 item 3 — the same decision as every other list).
> **(b) Unknown query params are silently dropped.** AJV runs `removeAdditional: 'all'`, so sending `q`, `type`, `regionId` or a date range *looks* like it worked and returns unfiltered rows. The FE therefore forwards **no filter params** and filters client-side. Any server-side filter added later must be declared in the route schema or it will be a silent no-op.

### 16.2 Unread count — `GET /notifications/unread-count` ✅

`{ "success": true, "data": { "unread": 3 } }` — excludes expired rows. Polled every 30 s by the topbar bell **only while the SSE stream is down**.

### 16.3 Mark one read — `POST /notifications/{id}/read` ✅

Idempotent (`read_at = COALESCE(read_at, NOW())`) and cross-user safe (`WHERE id = ? AND user_id = ?`). Returns `{ id, readAt }`. `404 ERR_NOTIFICATION_NOT_FOUND` for someone else's id — **keep it 404, never 403**, so ids cannot be probed.

### 16.4 Mark all read — `POST /notifications/read-all` ✅

Body `{ category? }` → `{ updated: int }`. The FE sends `{}`: its categories are client-derived and do not match the server's vocabulary.

### 16.5 Preferences — `GET` / `PUT /notifications/preferences` ✅

`GET` → `[{ category, channel, enabled }]`, **only rows that exist**; absence means "use the channel default", which the FE resolves. `PUT` body `{ category, channel, enabled }` upserts on `(user_id, category, channel)`.

| Channel | Default | User-disableable | Why |
|---|---|---|---|
| `inapp` | on | **No** | The row *is* the in-app delivery. |
| `realtime` | on | **No** | Just the live view of the in-app list. |
| `push` | on | Yes | FCM. Inert unless `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY` are set. |
| `email` | **off** | Yes | Opt-in; most notifications are in-app noise. |

**Categories the admin panel manages** (send these as the `category` value): `governance` · `service` · `community` · `billing` · `system`. Rows with the legacy value `admin` are read as `system`.

### 16.6 Live stream — `GET /realtime/stream?token=<jwt>` ✅

SSE, `text/event-stream`. Emits `data: {"type":"notification","notification":{…}}` plus a `: ping` comment every 25 s. Auth is `?token=` because `EventSource` cannot set headers. The FE **invalidates its queries** on a frame rather than injecting the payload, so a socket frame can never bypass the scope pipeline.

### 16.7 Event producers — 🔴 **NOT BUILT — the main gap**

`notifyRole()`, `notifyMany()`, `schedule()` all exist and work. What is missing is a **call site per event**. Today the only row an admin ever receives is `admin.location_coverage_gap`, written by a Postgres trigger that bypasses the JS dispatcher entirely (so it gets no push and no email). Without these five producers the notification centre is correct but **permanently empty in production**.

Each event needs: (1) a `notifyRole({ roles: ['admin','super_admin'], cityId, template, vars, subject })` call, (2) an `ar` + `en` pair in `notification_templates`, (3) a `subject_type`/`subject_id`.

| SRS event | Template key | `subject.type` | Source requirement |
|---|---|---|---|
| New owner account request | `admin.owner_request` | `owner` | `FR-ADM-OWNER-001` |
| New facility request | `admin.facility_request` | `facility` | `FR-ADM-FAC-001` |
| New feedback | `admin.feedback_new` | `feedback` | `FR-ADM-FEED-001` |
| Community activity/report to review | `admin.community_report` | `post` | `FR-ADM-COMM-001` |
| New paid-plan subscription | `admin.plan_subscription` | `plan` | `FR-ADM-PLAN-001` |
| ➕ Item pending too long | `admin.pending_reminder` | the pending record | SRS ➕, owner approval pending |
| ➕ Platform-level event (super-admin) | `admin.platform_event` | optional | SRS ➕, owner approval pending |

**Subject → route** the FE already resolves (an unmapped subject renders a row with **no** link rather than a wrong one): `owner` · `facility`/`venue` · `feedback` · `post`/`community_post` · `player` · `booking` · `membership`/`subscription` · `plan` · `region` · `admin` → the matching detail page; `coverage_gap` → the Regions list.

> ⚠️ **Route guards vs the SRS event list — an open product question.** Owners, Players, Plans, Regions and Admins are `super_admin`-only routes in this dashboard, but `FR-ADM-SET-007` sends a **regional admin** notifications about new owner requests and new paid subscriptions. The FE therefore resolves those links to `null` for a regional admin (a row with no destination) rather than navigating them into a silent redirect. **Either the route guards must widen to include `admin`, or the SRS must narrow which events a regional admin receives.** Until that is decided, a regional admin's owner-request and subscription notifications are informational only.

### 16.8 Region scoping — `FR-ADM-SET-008` 🔴

Must be enforced at **emit** time: `notifyRole({ roles, cityId })` already fans out over `admin_cities` and always includes the unscoped `super_admin`s. The row itself should additionally carry `regionId`/`regionNames` so the FE can render a region tag and offer a region filter; both degrade cleanly to "platform-wide" when absent.

> ⚠️ **Do not model `regionId: null` as an orphan.** In feedback, a row outside every region is an orphan only a super-admin may read. A **notification is addressed to a user**, so `null` here means "platform-wide notice" and must stay visible to the regional admin it was sent to.

---

## 17. Statistics / Dashboard

Base path for stats: **`/admin/statistics/overview`**. `super_admin` only. The whole "Platform Overview" screen is fed by **two** calls: the stats overview, and the region list (reused from §7 for the scope selector).

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| 1 | GET | `/admin/statistics/overview?range=&region=` | Full platform-overview snapshot | 🔴 **New — must build** |
| 2 | GET | `/admin/regions` | Region options for scope selector | ⚠️ (reuses §7; only `id`+`name` consumed) |

### 17.1 Overview — `GET /admin/statistics/overview` 🔴

**Query params** (exact wire names):

| Param | Type | Notes |
|---|---|---|
| `range` | `today\|7d\|30d\|90d\|month` | Default `30d`. |
| `region` | string | **Wire name is `region`, not `regionId`.** `all` (whole platform) · `orphan` (outside every region circle) · a region id (e.g. `c1`). |

**Success (200):** the `DashboardData` object (returned **raw or wrapped** in the standard `{ data: … }` / `{ data: { data: … } }` envelope — the FE unwraps either). One call renders the whole page. Shape with **real enum/token values**:

```json
{
  "asOf": "2026-07-14T10:30:00.000Z",
  "hero": { "bookings": 1240, "bookingsDeltaPct": 8.2, "targetPct": 76, "gmvSyp": 42500000, "gmvDeltaPct": 5.1, "bookingsSpark": [12,14,…], "gmvSpark": [1.1,1.3,…] },
  "kpis": [
    { "key": "gmv", "value": 48600000, "money": true, "deltaPct": 12, "accent": "secondary", "spark": [30,41,48.6], "to": "/app/booking-management" },
    { "key": "facilities", "value": 10, "denom": 24, "note": { "key": "newThisPeriod", "count": 2 }, "accent": "info", "to": "/app/facility-management?tab=directory" },
    { "key": "subscriptions", "value": 41, "denom": 55, "deltaPct": -4, "invert": true, "accent": "primary", "to": "/app/club-subscriptions" },
    { "key": "regions", "value": 6, "extra": { "key": "unassigned", "count": 3 }, "accent": "sage", "to": "/app/region-management" }
  ],
  "attention": [ { "key": "pendingFacilities", "tone": "danger", "count": 6, "metaKey": "oldest4d", "to": "/app/facility-management?tab=queue" } ],
  "attentionTotal": 9,
  "scatter": [ { "region": "Damascus", "supply": 32, "demand": 120, "gmv": 18.2 } ],
  "funnel": [ { "key": "requested", "value": 1580, "color": "blue" }, { "key": "confirmed", "value": 1240, "color": "mint" }, { "key": "paid", "value": 1120, "color": "amber" }, { "key": "completed", "value": 1040, "color": "green" } ],
  "trend": { "labels": ["W1","W2","W3","W4"], "series": [ { "key": "bookings", "color": "mint", "data": [980,1060,1130,1240] }, { "key": "gmv", "color": "amber", "data": [720,810,900,972] } ] },
  "composition": { "keys": [ { "key": "confirmed", "color": "green" }, { "key": "cancelled", "color": "red" }, { "key": "noShow", "color": "gray" } ], "points": [ { "label": "W1", "vals": [62,30,8] } ] },
  "bookingStatus": [ { "key": "confirmed", "value": 1240, "color": "green" }, { "key": "completed", "value": 1040, "color": "blue" }, { "key": "cancelled", "value": 132, "color": "red" }, { "key": "noShow", "value": 68, "color": "gray" }, { "key": "underReview", "value": 40, "color": "gold" } ],
  "heatmap": [ [0.21,0.39,0.41,0.24,0.10,0.02,0.31,0.70], "… 7 weekday rows × 8 hour buckets" ],
  "regions": [ { "id": "c1", "name": "Damascus", "players": 900, "facilities": 32, "bookings": 640, "gmvM": 18.2, "occupancy": 72, "rating": 4.4 } ],
  "facilityPipeline": [ { "key": "active", "value": 10, "color": "green" }, { "key": "pending", "value": 6, "color": "gold" }, { "key": "rejected", "value": 3, "color": "red" }, { "key": "suspended", "value": 3, "color": "orange" }, { "key": "ownerSuspended", "value": 2, "color": "gray" } ],
  "topFacilities": [ { "label": "Mezzeh Club", "value": 320 } ],
  "subStatus": [ { "key": "active", "value": 210, "color": "green" } ],
  "recurring": { "mrrSyp": 5200000, "churnPct": 3.1, "nearExpiry": 18 },
  "activity": [ { "key": "a1", "tone": "success", "kind": "booking_confirmed", "params": { "ref": "B-1240", "facility": "Elite Padel", "region": "Damascus" }, "minutesAgo": 2 } ]
}
```

**`kpis[]` field table (`KpiDatum`):**

| Field | Type | Notes |
|---|---|---|
| `key` | string (req) | i18n key for the label; also selects the tile icon. |
| `value` | number (req) | Raw value (SYP when `money`). |
| `money` | boolean? | Render compact + SYP suffix. |
| `denom` | number? | Denominator shown beside the value ("10 / **24**"). |
| `extra` | `{ key, count }`? | Qualifier beside the value ("· **3** unassigned" / "· **92** reactions"); `key` is an i18n key. |
| `deltaPct` | number \| null? | Signed % vs previous period; **`null`/absent hides the delta chip**. |
| `invert` | boolean? | Flip delta color (up = bad) for churn / no-show / cancellations. |
| `note` | `{ key, count? }`? | Bottom note when there is no delta ("+2 new", "3 under review"); `key` is an i18n key. |
| `accent` | `KpiAccent` (req) | Accent-bar color. |
| `spark` | number[]? | Sparkline series. |
| `to` | string (req) | Deep-link route the tile navigates to. |

**Enums / units:**
- `SeriesColor` (the `color` on funnel/trend/composition/bookingStatus/facilityPipeline/subStatus) ∈ `mint | amber | blue | gold | orange | red | gray | green | sage`.
- `KpiAccent` (`kpis[].accent`) ∈ `primary | secondary | info | sage`.
- `tone` (`attention[].tone`, `activity[].tone`) ∈ `danger | caution | warning | success | info`.
- `activity.kind` ∈ `booking_confirmed | facility_submitted | subscription_new | player_report | owner_approved | post_flagged`. Each kind's `params` object MUST carry the keys its i18n string interpolates — `booking_confirmed`/`facility_submitted` → `{ ref?, facility, region }`, `subscription_new` → `{ player }`, `owner_approved` → `{ owner }`, `player_report`/`post_flagged` → `{}`.
- **`heatmap`** = `number[7][8]` — 7 weekday rows (0 = Mon … 6 = Sun) × 8 hour buckets, each an intensity in `[0,1]`.
- **`gmvM`** (`regions[]`, `scatter[]`) is in **millions** SYP; **`gmvSyp`** (`hero`) is **raw** SYP — keep both internally consistent.
- **`regions` scoping:** for `region=orphan` → `regions` is `[]`; for `region=<id>` → `regions` contains **only that one region's row**; only `region=all` returns the **full multi-region comparison set**.

**Errors:** `401` (logout), `403` (non-super_admin), `5xx` → retryable error state.

> **This endpoint is new and heavily FE-shaped.** The payload bakes in FE concerns a real analytics service normally wouldn't emit: route strings (`to`), i18n message keys (`key`, `metaKey`, `note.key`), and design tokens (`color`, `accent`, `tone`). **Decision needed:** either the backend returns stable **enum codes** and the FE derives `to`/`color`/`accent`/i18n locally (preferred), or the FE's `getDashboard` mapper translates a leaner DTO into this shape (the intended seam). Also define: region-scope semantics for `all`/`orphan`/`<id>`; pinned time-range windows (calendar-month vs rolling-30d, timezone) so `deltaPct` "previous equal period" is well-defined.

### 17.2 Region options — `GET /admin/regions` ⚠️

No params sent; the FE reads only `id` + `name` (coerced to strings) via list key `regions`, then prepends `all` and appends `orphan`. Reuses §7. Low-risk here since only id+name are used, but the region ids must match whatever `region=<id>` the stats endpoint expects.

---

## 18. Reconciliation / Open Questions for Backend

Every known FE↔BE divergence and the decision it forces, grouped by severity.

### CRITICAL — must resolve before any dependent domain can be wired

1. **Region model: circle vs city/neighbourhood.** The FE models a region as a **geographic circle** (`name + center_lat + center_lng + radius_km`) and resolves facility/player/booking membership by point-in-circle math on the client. The backend (per the 2026-07 audit) models regions as cities/neighbourhoods. This affects: Regions create/update bodies, admin `region_ids`, facility scoping, `region-counts`, orphan detection, region-detail facility lists, bookings/subscriptions region filters (which pass a region **name**), and the dashboard `region` param. **Decide the canonical region model first.** If circles are not adopted, define how the FE's `center_*`/`radius_km` and name-based filters map onto backend region identity.

2. **Admin API rejected by current backend schema.** The entire `/admin/admin-management` surface (and by extension `owners-management`, `players-management`, `facilities-management`, `subscriptions`, `community-management`) was flagged as not accepted by the current backend schema. Confirm exact base paths, list keys, and every action sub-path before treating any of §6–§14 as verified.

3. **Server-side vs client-side pagination (all list endpoints).** No list service reads any server pagination meta today — every list is fetched whole and sliced client-side. **Decide per endpoint: (a)** return the full scoped set (FE works unchanged, won't scale), or **(b)** implement true server pagination + refactor the FE to trust `total`/`page`/`pageCount` (otherwise page 2+ renders empty — the known "facility page-2 empty" bug). Applies to admins, owners, players, facilities, community, bookings, subscriptions.

### HIGH — will silently break a feature if not addressed

4. **Reset-password field name.** Backend expects `{ token, newPassword }`; FE sends `{ token, password }`. Rename on one side (§5.4).

5. **Admin JWT claims (camelCase).** The admin JWT must include `role` (present), plus `name` and **`assignedRegionIds`** (camelCase, absent today) — the FE decodes these straight off the JWT payload, so the claim casing must be **camelCase** (unlike the snake_case `assigned_region_ids` on the Admin entity DTO). Absent → the header shows no name and regional scoping is lost. **Insufficient alone:** the real `login()` decodes only `{ role, email, name }` (`auth.api.ts:10`) and never populates `assignedRegionIds` — either extend that decode or add `GET /admin/profile` and hydrate from it (§4.2, §15.3).

6. **Player sub-resources are camelCase-only (no mapper).** Player subscription, rooms, ratings, reports (§9.4–§9.7) are consumed raw as camelCase. The backend must emit camelCase for these four, or the FE must add mappers. (Every other player field is snake_case via `toPlayer`.)

7. **Profile update response casing + avatar transport.** Response must carry `avatarUrl` (camel) despite the request sending `avatar_url` (snake) (§15.1). And the avatar is an inline base64 `image/webp` data-URL string, not a multipart upload — decide store-the-data-URL vs rework-to-multipart. Also add `GET /admin/profile` so avatars survive a fresh login (§15.3).

8. **Owner `facilities_count` in the list payload.** The real list mapper does not derive it; if it's missing, the has/none facilities filter treats everyone as `none` (§8.1).

9. **Owner `trust_score` (int 0–100) vs backend `trust_tier` (enum).** The FE DTO expects an int and derives the tier label client-side (displayed as a tier label only). The backend stores an enum. Pick one wire type (§8).

10. **Admin↔region link direction.** The FE reads `assigned_region_ids`/`assigned_region_names` off each admin object, but also derives them by inverting the region store. Pick a canonical source and ensure `getAdmins`/`getAdminById` return them populated (§6, reconcile #1).

### MEDIUM — semantics / route shape to confirm

11. **RPC-style action paths.** Non-REST verb-in-path routes the FE expects verbatim: admin `/is_active/{id}`, `/scope/{id}`, `/assign-regions/{id}`, `/reset-password/{id}`, `/restore/{id}`; region `/is_active/{id}`, `/assign/{id}`, `/restore/{id}`. Confirm these exact shapes or update the FE.

12. **`delete` as a moderation action, not HTTP DELETE.** Community post/comment deletion is `PATCH …/moderation { action:'delete' }` (§12.5/12.6). Reconcile if the backend prefers REST delete.

13. **Owner block/unblock ban model + cascades.** `is_blocked`/`blocked_reason` may not exist server-side. Implement the ban model and the **suspend/block → disable-all-facilities cascade** server-side (§8.4, §10). The FE's facility-cascade call is a deliberate no-op.

14. **Owner subscription downgrade/cancel semantics undefined.** `change_type=downgrade` is accepted but the mock refuses to downgrade; define real downgrade/cancel behavior (§8.10).

15. **Bulk facility response `skipped`.** The FE currently ignores partial-skip info and assumes all succeeded; a partial-skip backend won't be reflected unless the FE is updated (§10.5). Return `{ succeeded, skipped }`.

16. **Invalid-transition guards → 409 with a code.** Approve non-pending, approve with unapproved docs, suspend non-active, reactivate non-suspended, illegal owner-status transitions — return `409` with a machine-readable `code`, not just a message (§10, §8).

17. **Not-found must be HTTP 404.** Detail endpoints (facility, booking, membership, owner, admin, region, post) must return real 404s; the FE's string-match fallback is unreliable on a real backend (§4.4).

### LOW / efficiency — optional but recommended

18. **Dedicated stats endpoints.** Every KPI row today re-hits the list with `pageSize=1000` and counts client-side. Recommended additions: `GET /admin/admin-management/stats`, `/admin/regions/stats`, `/admin/owners-management/owners/stats`, `/admin/players-management/players/stats`, `/admin/facilities-management/facilities/stats`, `/admin/community-management/posts/stats`, `/admin/bookings/stats`, `/admin/subscriptions/stats`, and a scope-aware `/admin/statistics/overview`. The FE calls none of these today (except the overview seam) but they are the correct fix for the over-fetch.

19. **Token refresh.** No `/auth/refresh` is wired; admins are hard-logged-out at token expiry. Decide whether to add admin refresh tokens (§5.5).

20. **Dashboard payload shape.** `/admin/statistics/overview` currently carries FE routing/i18n/theming data a real service should not own. Prefer returning leaner enum-coded data and letting the FE derive routes/colors/i18n (§17.1).

21. **Server-side region filtering param semantics.** Bookings and subscriptions send `regionId` as a region **name**; facilities send it as an id/`orphans`. If server-side region filtering is implemented, align these with the chosen region identity model (reconcile #1).

22. **Phone / national-id formats.** Phone is `963` + 9 digits, **no `+`**; national id is exactly 11 digits. Accept these exact forms on all create/update endpoints.

23. **Notification event producers (§16.7).** `notifyRole()` works; nothing calls it for the five `FR-ADM-SET-007` events. Until each module emits its notification, the admin notification centre is correct but permanently empty in production — the only row ever delivered is `admin.location_coverage_gap`, and that one is written by a Postgres trigger that bypasses the JS dispatcher entirely (so no push, no email). **This is the single highest-value backend item for the notifications feature.**

24. **Notification region stamping (§16.8).** `FR-ADM-SET-008` requires a regional admin to receive only their region's events. Scoping must be applied at **emit** time via `notifyRole({ cityId })`; additionally stamping `regionId`/`regionNames` on the row unlocks the region tag and region filter in the FE. Note the semantic trap: for a notification, `regionId: null` means **platform-wide and visible to every addressee**, *not* an orphan — the opposite of how feedback and facilities read it.

25. **Notifications are camelCase and keyset-paginated (§16.1).** The only domain in this document that is neither `snake_case` nor page-paginated, and the only one where unknown query params are **silently dropped** (`removeAdditional: 'all'`) instead of rejected — so a filter added to the URL without a matching route schema entry will look like it works and quietly return unfiltered rows. Decide whether to normalise this domain to the house conventions or to keep it as the documented exception.

26. **A notification permission slug (§16).** None of the 25 seeded slugs is notification-related, so any future notification route gated by `requirePermission` would be usable by `super_admin` only (which bypasses granular checks). The current routes are correctly gated by `user_id` alone and need no slug; add one only if a cross-user notification endpoint is ever built.

---

*End of contract. All paths, fields, and enum values above are extracted from the finished `bplay-admin` service layer (`src/features/*/api/*.api.ts`, `*.types.ts`, `*.schema.ts`) and are the exact contract the frontend will use when `VITE_USE_MOCKS` is turned off.*