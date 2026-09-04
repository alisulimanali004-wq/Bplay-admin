# 09 — Conventions: Locked Defaults, Formatting, Mocks & Extended Primitives

The file that removes the last ambiguities so two engineers — or two Claude runs — build the **same** thing. Where 02 gives tokens, 03 the primitives, and 08 the page shells, this file locks every value that would otherwise be chosen ad-hoc (modal sizes, footer order, debounce, page size) and adds the primitives features still need (Tabs, Drawer, Avatar, FileUpload, date input) so nothing is hand-rolled. Everything here is tokens-only, RTL-safe (logical properties), and accessible — consistent with 02/03/08.

---

## 1. Locked defaults

**Rule:** These values are canonical. A feature never picks a modal size, footer order, card padding, debounce, page size, or stale time by feel — it uses the locked value below. Overriding one requires an inline comment justifying it, and even then only the numeric value changes, never the pattern.

| Concern | Locked default | Alternatives (when justified) | Where |
|---|---|---|---|
| Modal / ConfirmDialog size | `ConfirmDialog` → `sm`; create/edit form → `md`; detail-heavy → `lg` | — | `--modal-sm/md/lg` |
| Modal width | `sm=420px`, `md=560px`, `lg=800px` | — | tokens |
| Footer button order | Cancel (`secondary`) inline-**start**, confirm/danger inline-**end** | never swapped | Modal/ConfirmDialog `.footer` |
| Footer gap | `var(--space-3)` | — | `.footer` |
| Card padding | `md` (=`--space-6`=24px) | `lg`(32px) full-page section cards; `sm`(16px) nested/secondary | `Card` `padding` |
| Search debounce | `SEARCH_DEBOUNCE_MS = 300` | override only with a justifying comment | `shared/hooks` |
| Query staleTime | `30_000` | per-hook override with comment | `queryClient` |
| Query retry | `1` | per-hook override with comment | `queryClient` |
| Query refetchOnWindowFocus | `false` | per-hook override with comment | `queryClient` |
| Pagination pageSize | `20` | — | query key |
| Toast position | bottom + inline-end, no prop | — | `ToastProvider` |
| Field focus ring | single `:focus-within` ring | — | Input/Select `.wrap` |
| Sidebar active link | `border-inline-start: 3px solid --color-primary` + `--color-surface-2` bg | — | `.linkActive` |

### 1.1 Modal size tokens

Add these three width tokens to `tokens.css` so the sizes are named, not magic px (they match the `max-width` values already in `03`'s `Modal.module.css`):

```css
/* src/styles/tokens.css — modal widths (named; consumed by Modal .sm/.md/.lg) */
:root {
  --modal-sm: 420px;   /* ConfirmDialog + short (≤2 field) forms */
  --modal-md: 560px;   /* the default create / edit form */
  --modal-lg: 800px;   /* detail-heavy: multi-section, side-by-side, preview */
}
```

```css
/* shared/ui/Modal/Modal.module.css — reference the tokens, not literals */
.sm { max-width: var(--modal-sm); }
.md { max-width: var(--modal-md); }
.lg { max-width: var(--modal-lg); }
```

**Rule:** `ConfirmDialog` is always `sm`. A create/edit form modal is `md`. A modal that shows several sections, a preview, or a side-by-side layout is `lg`. Never eyeball a width.

### 1.2 Footer order — Cancel start, confirm end (NEVER swap)

```css
/* shared/ui/ConfirmDialog/ConfirmDialog.module.css (same rule for every Modal footer) */
.footer {
  display: flex;
  justify-content: flex-end;   /* both buttons pushed to the inline-END; flips for RTL */
  gap: var(--space-3);
}
```

Because the footer is `justify-content: flex-end` and the buttons render in source order **Cancel then confirm**, Cancel sits inline-start and the primary/danger action sits inline-end. In RTL the whole row mirrors automatically (flex + logical flow), so Cancel stays on the reading-start side in both languages.

```tsx
// Canonical footer — Cancel first (secondary), confirm/danger last. Order is load-bearing.
footer={
  <>
    <Button variant="secondary" onClick={onClose} disabled={isLoading}>{t('common.cancel')}</Button>
    <Button variant={variant} isLoading={isLoading} onClick={() => onConfirm()}>{confirmText}</Button>
  </>
}
```

**Never:** put the confirm button before Cancel, or use `justify-content: space-between`, or a different gap. The destructive/primary action is always inline-end.

### 1.3 Card padding

`Card` (03) already exposes `padding: 'sm' | 'md' | 'lg'`. Lock which one goes where:

- `md` (`--space-6`, 24px) — **default**. Toolbar cards, list-page section wrappers, stat cards.
- `lg` (`--space-8`, 32px) — full-page **section cards** on detail pages (the `.sectionGrid` `<Card>`s in 08 §3).
- `sm` (`--space-4`, 16px) — **nested / secondary** cards inside another card, dense side panels.

### 1.4 Search debounce — one constant

```ts
// shared/hooks/searchDebounce.ts
export const SEARCH_DEBOUNCE_MS = 300; // canonical; override elsewhere ONLY with a justifying comment
```

`SearchInput` (03) defaults its `debounceMs` from this constant; toolbars never pass a bespoke number.

```tsx
import { SEARCH_DEBOUNCE_MS } from '@/shared/hooks/searchDebounce';
<SearchInput value={params.q} onChange={onSearch} debounceMs={SEARCH_DEBOUNCE_MS} />
```

### 1.5 TanStack Query global defaults are canonical

```ts
// shared/api/queryClient.ts — the ONE place these are set. Do not re-specify per hook.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s — data is "fresh" this long; no refetch storm
      retry: 1,                   // one silent retry, then surface the error state
      refetchOnWindowFocus: false // admin dashboards don't need focus refetch
    },
  },
});
```

**Rule:** Never repeat `staleTime` / `retry` / `refetchOnWindowFocus` in a `useQuery` unless that endpoint genuinely differs (e.g. a live metric wants `staleTime: 0`) — and then leave a one-line comment saying why.

### 1.6 Pagination default

**Rule:** `pageSize = 20`. `page` and `pageSize` are part of the **query key** (so paging is cached per page). Paging is **server-side** by default (`params.page` → key → API). `Pagination` is a **separate** component rendered **after** `DataTable` — never inside it (see `08-page-patterns.md §2`).

```ts
export const DEFAULT_PAGE_SIZE = 20;
// key: ['admins', { q, status, page, pageSize: DEFAULT_PAGE_SIZE }]
```

### 1.7 Toast placement — one stack, no position prop

**Rule:** There is **no** `position` prop. Every toast stacks at bottom + inline-end (end-aware, so it flips to bottom-left in RTL). This is already the `.stack` in `03`:

```css
/* shared/ui/Toast/Toast.module.css — the ONLY toast anchor */
.stack {
  position: fixed;
  inset-block-end: var(--space-6);
  inset-inline-end: var(--space-6);   /* flips to bottom-start in RTL — no prop needed */
  z-index: var(--z-toast);
}
```

### 1.8 Input / Select focus — a single ring, no double outline

The field wrappers use **one** `:focus-within` ring and suppress the global outline on the inner control, so a focused input never shows the global `:focus-visible` outline **and** the wrapper ring at once (that "double ring" is the bug this locks out).

```css
/* Input/Select/Textarea wrapper — the single visible ring */
.wrap:focus-within {
  border-color: var(--color-primary-accent);
  box-shadow: 0 0 0 3px var(--color-focus);   /* the one ring */
}
.input:focus-visible { outline: none; }        /* suppress the global 02 outline on the inner control */
```

**Relationship with 02:** the global `:focus-visible` outline in `globals.css` is the fallback for *custom controls* (tabs, roving-tabindex widgets, links). Native form controls wrapped in a `Field` opt **out** of it (`outline: none` on the control) and rely on the wrapper's `:focus-within` ring instead. **Never** keep both on the same element.

### 1.9 Sidebar active NavLink

```css
/* DashboardLayout / Sidebar .module.css */
.link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-2);
  padding-inline: var(--space-4);
  border-inline-start: 3px solid transparent;   /* reserves the space so text never shifts */
  border-radius: var(--radius-md);
  color: var(--color-text-subtle);
  text-align: start;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.link:hover { background: var(--color-surface-2); color: var(--color-text); }
.linkActive {
  border-inline-start-color: var(--color-primary);   /* 3px start rail — flips in RTL */
  background: var(--color-surface-2);
  color: var(--color-text);
  font-weight: var(--weight-semibold);
}
```

```tsx
<NavLink to="/admins" className={({ isActive }) => cx(styles.link, isActive && styles.linkActive)}>
  <span className={cx(styles.icon, 'flipInRtl')} aria-hidden>{icon}</span>{label}
</NavLink>
```

---

## 2. Status → Badge variant mapping

Status strings arrive from many features with overlapping meaning. A single mapper keeps every badge in the app on the same five semantic colors — aligned 1:1 with the `--status-*` tokens in `02 §1`.

```ts
// shared/utils/status.ts
import type { BadgeProps } from '@ui';

export type BadgeVariant = BadgeProps['variant']; // 'success' | 'danger' | 'warning' | 'neutral' | 'info'

/** Map the app's real status vocabulary → one Badge variant. Case-insensitive; unknown → 'neutral'. */
export function statusToBadgeVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'paid':
    case 'confirmed':
      return 'success';                 // mint  — --status-success-*
    case 'pending':
    case 'under-review':
    case 'under_review':
      return 'warning';                 // amber — --status-warning-*
    case 'rejected':
    case 'suspended':
    case 'blocked':
    case 'failed':
      return 'danger';                  // red   — --status-danger-*
    case 'inactive':
    case 'maintenance':
    case 'cancelled':
    case 'canceled':
      return 'neutral';                 // gray  — --status-neutral-*
    case 'new':
    case 'recurring':
    case 'info':
      return 'info';                    // blue  — --status-info-*
    default:
      return 'neutral';                 // safe fallback for an unmapped status
  }
}
```

**Rule:** Every status render is `<Badge variant={statusToBadgeVariant(x)}>{t(\`status.${x}\`)}</Badge>`. **Never** inline-pick a variant (`variant={x === 'active' ? 'success' : 'danger'}`) or invent a per-feature `STATUS_VARIANT` map — extend this switch instead, once, and every feature inherits it.

```tsx
// In a DataTable column:
{ key: 'status', header: t('admin.col.status'),
  render: (a: Admin) => <Badge variant={statusToBadgeVariant(a.status)}>{t(`status.${a.status}`)}</Badge> }
```

---

## 3. Empty / Error copy convention

Consistent i18n keys and copy tone so no page ships a bare "No data". Cross-links `08 §6` (placement) and `03` (`EmptyState` / `ErrorState`).

**Rule:** every feature defines exactly these state keys:

| Key | Copy style | Example (EN) |
|---|---|---|
| `<feature>.state.emptyTitle` | "No `<items>` yet" | `"No admins yet"` |
| `<feature>.state.emptyDesc` | one line, what to do next | `"Invite your first admin to get started."` |
| `<feature>.state.errorTitle` | "Failed to load `<items>`" | `"Failed to load admins"` |
| `<feature>.state.filteredTitle` | "No matches" | `"No admins match your filters"` |
| `<feature>.state.filteredDesc` | "Try adjusting…" + clear action | `"Try adjusting your search or filters."` |

```json
// features/admin-management/i18n/en.json
{ "admin": { "state": {
  "emptyTitle": "No admins yet",
  "emptyDesc": "Invite your first admin to get started.",
  "errorTitle": "Failed to load admins",
  "filteredTitle": "No admins match your filters",
  "filteredDesc": "Try adjusting your search or filters."
} } }
```

**Rule:** an empty state **caused by a filter/search** is visually distinct — it uses `filteredTitle/Desc` and offers a **"clear filters"** action, not the first-run `emptyTitle`. Detect it by "the query returned zero rows AND at least one filter is non-default".

```tsx
const isFiltered = params.q !== '' || params.status !== 'all';
const empty = isFiltered
  ? <EmptyState title={t('admin.state.filteredTitle')} description={t('admin.state.filteredDesc')}
      action={<Button variant="secondary" onClick={resetFilters}>{t('common.clearFilters')}</Button>} />
  : <EmptyState title={t('admin.state.emptyTitle')} description={t('admin.state.emptyDesc')}
      action={<Button onClick={invite.open}>{t('admin.invite')}</Button>} />;
```

**Rule:** `ErrorState` **always** wires the query's `refetch` to `onRetry`. An error panel without a retry is a defect.

```tsx
<ErrorState title={t('admin.state.errorTitle')} message={t('common.tryAgain')} onRetry={refetch} />
```

---

## 4. Formatting — numbers, currency, dates, timezones

All display formatting goes through `Intl.*`, keyed to the active `i18n.language`, so numbers, currency, and dates are correct in both EN and AR without hand-concatenation.

```ts
// shared/hooks/useLocaleFormat.ts
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const CURRENCY = 'SYP'; // the app's currency; central so a change is one line

export function useLocaleFormat() {
  const { i18n } = useTranslation();
  const lng = i18n.language || 'en';

  return useMemo(() => {
    const num = new Intl.NumberFormat(lng);
    const cur = new Intl.NumberFormat(lng, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
    const pct = new Intl.NumberFormat(lng, { style: 'percent', maximumFractionDigits: 1 });
    const d = new Intl.DateTimeFormat(lng, { dateStyle: 'medium' });
    const dt = new Intl.DateTimeFormat(lng, { dateStyle: 'medium', timeStyle: 'short' });
    const rtf = new Intl.RelativeTimeFormat(lng, { numeric: 'auto' });

    return {
      number: (n: number) => num.format(n),
      currency: (n: number) => cur.format(n),
      percent: (fraction: number) => pct.format(fraction),          // pass 0.42 → "42%"
      date: (iso: string) => d.format(new Date(iso)),
      dateTime: (iso: string) => dt.format(new Date(iso)),
      relativeTime: (iso: string) => {
        const diffMs = new Date(iso).getTime() - Date.now();
        const min = Math.round(diffMs / 60000);
        if (Math.abs(min) < 60) return rtf.format(min, 'minute');
        const hr = Math.round(min / 60);
        if (Math.abs(hr) < 24) return rtf.format(hr, 'hour');
        return rtf.format(Math.round(hr / 24), 'day');
      },
    };
  }, [lng]);
}
```

A pure (hook-free) helper for non-component code (mappers, tests, table `render` outside a hook scope):

```ts
// shared/utils/datetime.ts
/** Pure UTC-ISO → localized date-time string. No React; safe anywhere. */
export function formatDateTime(iso: string, lng: string): string {
  return new Intl.DateTimeFormat(lng || 'en', { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(iso));
}
```

**Rules:**
- **API timestamps are UTC ISO strings** (`2026-07-01T09:30:00Z`). Store/pass them as-is; format **only** at the display edge via these helpers.
- **Never** hand-concatenate a date (`${d}/${m}/${y}`) or call `toLocaleString()` without the active language — that ignores AR and produces the wrong calendar/numerals.
- **Numeric metrics stay LTR even in RTL.** Wrap a number/currency/date that must not reorder in `<bdi>` (or `dir="ltr"`), so an Arabic paragraph never flips digit groups or the currency sign.

```tsx
// A currency cell that stays LTR inside an RTL table:
const fmt = useLocaleFormat();
{ key: 'total', header: t('finance.col.total'), align: 'end',
  render: (r: Invoice) => <bdi>{fmt.currency(r.totalMinor / 100)}</bdi> }
```

---

## 5. Mock-data lifecycle & wire-readiness

The dashboard must run **fully** on mock data — pro-grade, with real loading/error/empty and working mutations — and swap to the live backend with **near-zero** edits. Cross-links `04-data-layer.md`.

**Rules:**
- Each feature's mock module mirrors the real **DTO exactly** (same field names and types) so the `toX()` mappers are **unchanged** when the backend lands.
- The mock keeps an **in-memory mutable `db`** so create/update/delete/approve actually mutate it and a later query/refetch reflects the change. State persists for the session, resets on reload.
- Provide `mockDelay()` and an occasional `maybeFail()` so loading and error states are exercised for real.
- Toggle with `VITE_USE_MOCKS`; the **api barrel** swaps `*.api.ts` ↔ `*.api.mock.ts`, so components and hooks **never** change. Going live = flip the flag to `false` (or delete the mock import). Keep mocks for tests.

```ts
// shared/api/mock.ts — shared mock helpers
export const mockDelay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));

/** Throw ~8% of the time so error states are actually reachable in mock mode. */
export function maybeFail(rate = 0.08): void {
  if (Math.random() < rate) throw new Error('Mock network error');
}
```

```ts
// features/admin-management/api/admin-management.api.mock.ts
import { mockDelay, maybeFail } from '@/shared/api/mock';
import type { AdminDto, CreateAdminDto } from './admin-management.types'; // SAME DTO the real API returns

// Mutable in-memory db — mutations persist for the session, reset on reload.
let db: AdminDto[] = [
  { id: '1', full_name: 'Lena Haddad', email: 'lena@bplay.app', status: 'active',  created_at: '2026-06-01T08:00:00Z' },
  { id: '2', full_name: 'Omar Nasser', email: 'omar@bplay.app', status: 'suspended', created_at: '2026-06-12T10:30:00Z' },
];

export const adminApiMock = {
  async list(params: { q: string; page: number; pageSize: number }): Promise<{ items: AdminDto[]; total: number }> {
    await mockDelay(); maybeFail();
    const q = params.q.toLowerCase();
    const filtered = db.filter((a) => a.full_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
    const start = (params.page - 1) * params.pageSize;
    return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
  },
  async create(input: CreateAdminDto): Promise<AdminDto> {
    await mockDelay();
    const row: AdminDto = { id: crypto.randomUUID(), status: 'active', created_at: new Date().toISOString(), ...input };
    db = [row, ...db];             // real mutation → next list() sees it
    return row;
  },
  async toggleStatus(id: string): Promise<AdminDto> {
    await mockDelay();
    db = db.map((a) => (a.id === id ? { ...a, status: a.status === 'active' ? 'suspended' : 'active' } : a));
    const row = db.find((a) => a.id === id);
    if (!row) throw new Error('Not found');
    return row;
  },
};
```

The **barrel** is the single swap point — components/hooks import from it and never learn which implementation they got:

```ts
// features/admin-management/api/index.ts
import { adminApi } from './admin-management.api';
import { adminApiMock } from './admin-management.api.mock';

// One flag flips the whole feature. Real API shares the exact signature, so nothing downstream changes.
export const api = import.meta.env.VITE_USE_MOCKS === 'true' ? adminApiMock : adminApi;
```

**Going live** = set `VITE_USE_MOCKS=false` (or delete the mock import from the barrel). Because the mock DTO === the real DTO and both implement the same signature, hooks, mappers, and components stay untouched.

---

## 6. Accessibility additions (beyond the kit)

### 6.1 Skip-to-content link

```tsx
// DashboardLayout.tsx — first focusable element in the DOM
<a href="#main" className={styles.skipLink}>{t('common.skipToContent')}</a>
<Sidebar />
<main id="main" className={styles.content} tabIndex={-1}>{children}</main>
```

```css
/* DashboardLayout.module.css — off-screen until focused */
.skipLink {
  position: absolute;
  inset-block-start: var(--space-2);
  inset-inline-start: var(--space-2);
  z-index: var(--z-toast);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface-2);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transform: translateY(-200%);   /* hidden */
  transition: transform var(--transition-fast);
}
.skipLink:focus-visible { transform: translateY(0); }   /* revealed on Tab */
```

### 6.2 Focus the first invalid field on submit

```ts
// RHF focuses the first field that fails validation on submit — no manual scrolling.
const form = useForm<CreateAdminInput>({
  resolver: zodResolver(createAdminSchema),
  shouldFocusError: true,   // default true; keep it. Or call form.setFocus('email') after a server error.
});
```

### 6.3 DataTable header scope

`<th>` cells declare `scope="col"` so screen readers associate columns with cells. Add it in the kit's `DataTable` `<thead>` (03):

```tsx
<th key={c.key} scope="col" style={{ width: c.width }}
    className={clsx(styles.th, c.align && styles[`al-${c.align}`])}>
  {c.header}
</th>
```

### 6.4 Central RTL glyph-flip class

One file, imported once, mirrors directional glyphs (chevrons, back arrows, "next" caret) under RTL — so components add a class instead of each writing its own `[dir='rtl']` rule (matches `02 §5`).

```css
/* shared/ui/glyph-flips.css — imported ONCE from main.tsx after globals.css */
[dir='rtl'] .flipInRtl { transform: scaleX(-1); }
```

```tsx
// Any directional icon opts in with the class:
<span className="flipInRtl" aria-hidden><ChevronIcon /></span>
```

**Never** flip a whole component with `scaleX(-1)` (that mirrors text and icons wrongly) — flip **only** the glyph via `flipInRtl`.

---

## 7. Extended primitives

Add these to `shared/ui` (export from the barrel, import from `@ui`) so features never hand-roll a tab bar, drawer, avatar, uploader, or date field. Each follows `03`'s conventions: `forwardRef` where it wraps a native control, `data-testid` passthrough, `aria-*`, tokens-only, logical properties.

### 7.1 Tabs + Tab

```ts
// shared/ui/Tabs/Tabs.tsx — prop contracts
export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;               // <Tab> children
  ariaLabel?: string;
}
export interface TabProps {
  value: string;
  label: string;
}
```

```tsx
// shared/ui/Tabs/Tabs.tsx — roving tabindex + arrow-key nav + roles
import { Children, isValidElement, useRef, type ReactNode, type KeyboardEvent } from 'react';
import styles from './Tabs.module.css';
import { clsx } from '../clsx';

export function Tab(_: TabProps) { return null; } // config-only; Tabs reads its props

export function Tabs({ value, onChange, children, ariaLabel }: TabsProps) {
  const tabs = Children.toArray(children).filter(isValidElement) as Array<{ props: TabProps }>;
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent) => {
    const idx = tabs.findIndex((t) => t.props.value === value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      // inline-END is next; ArrowRight advances in LTR, retreats in RTL — read dir at runtime
      const rtl = document.documentElement.dir === 'rtl';
      const fwd = rtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
      const next = (idx + (fwd ? 1 : tabs.length - 1)) % tabs.length;
      onChange(tabs[next].props.value);
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }
  };

  return (
    <div ref={listRef} role="tablist" aria-label={ariaLabel} className={styles.list} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const selected = t.props.value === value;
        return (
          <button
            key={t.props.value} role="tab" type="button"
            aria-selected={selected} tabIndex={selected ? 0 : -1}   // roving tabindex
            data-testid={`tab-${t.props.value}`}
            className={clsx(styles.tab, selected && styles.active)}
            onClick={() => onChange(t.props.value)}
          >
            {t.props.label}
          </button>
        );
      })}
    </div>
  );
}
```

```css
/* shared/ui/Tabs/Tabs.module.css */
.list { display: flex; gap: var(--space-2); border-block-end: 1px solid var(--color-border); }
.tab {
  padding-block: var(--space-2); padding-inline: var(--space-3);
  background: transparent; border: none; cursor: pointer;
  color: var(--color-text-subtle); font-weight: var(--weight-semibold); font-size: var(--text-sm);
  border-block-end: 3px solid transparent;   /* reserves space so the active rail never shifts text */
  transition: color var(--transition-fast), border-color var(--transition-fast);
}
.tab:hover { color: var(--color-text); }
.tab:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
.active { color: var(--color-text); border-block-end-color: var(--color-primary); }
```

```tsx
// Usage — wrap panels in role="tabpanel"
<Tabs value={tab} onChange={setTab} ariaLabel={t('owner.tabs')}>
  <Tab value="profile" label={t('owner.tab.profile')} />
  <Tab value="documents" label={t('owner.tab.documents')} />
</Tabs>
<div role="tabpanel">{tab === 'profile' ? <ProfilePanel /> : <DocumentsPanel />}</div>
```

### 7.2 Drawer

Reuses `Modal`'s focus-trap + Esc + portal + overlay; slides from inline-start/end. Used for the mobile nav and side filter panels.

```ts
export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: 'start' | 'end';   // slides from inline-start (default) or inline-end
  title?: string;
  children: ReactNode;
}
```

```tsx
// shared/ui/Drawer/Drawer.tsx
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IconButton } from '../IconButton';
import { useFocusTrap } from '../Modal/useFocusTrap'; // extracted from Modal (Esc + trap + scroll-lock)
import styles from './Drawer.module.css';
import { clsx } from '../clsx';

export function Drawer({ isOpen, onClose, side = 'start', title, children }: DrawerProps) {
  const ref = useFocusTrap<HTMLDivElement>(isOpen, onClose);
  const offscreen = side === 'start' ? '-100%' : '100%'; // logical: script direction handled by CSS anchor

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div className={styles.overlay} onMouseDown={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.aside
            ref={ref} role="dialog" aria-modal="true" aria-label={title}
            className={clsx(styles.panel, side === 'end' ? styles.end : styles.start)}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ x: offscreen }} animate={{ x: 0 }} exit={{ x: offscreen }}
            transition={{ duration: 0.25 }}
          >
            {title && (
              <header className={styles.header}>
                <h2 className={styles.title}>{title}</h2>
                <IconButton icon={<span aria-hidden>×</span>} label="Close" onClick={onClose} />
              </header>
            )}
            <div className={styles.body}>{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
```

```css
/* shared/ui/Drawer/Drawer.module.css */
.overlay { position: fixed; inset: 0; z-index: var(--z-modal); background: var(--color-overlay); backdrop-filter: blur(2px); }
.panel {
  position: fixed; inset-block: 0; inline-size: min(360px, 90vw);
  background: var(--color-surface); box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column;
}
.start { inset-inline-start: 0; border-inline-end: 1px solid var(--color-border); }
.end   { inset-inline-end: 0;   border-inline-start: 1px solid var(--color-border); }
.header { display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-5); border-block-end: 1px solid var(--color-border); }
.title { margin: 0; font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--color-text); text-align: start; }
.body { padding: var(--space-5); overflow-y: auto; }
```

```tsx
<Drawer isOpen={filters.isOpen} onClose={filters.close} side="end" title={t('common.filters')}>{/* filter form */}</Drawer>
```

### 7.3 Avatar

```ts
export interface AvatarProps {
  src?: string;
  name: string;                 // required — drives initials fallback and alt text
  size?: 'sm' | 'md' | 'lg';
}
```

```tsx
// shared/ui/Avatar/Avatar.tsx
import { useState } from 'react';
import styles from './Avatar.module.css';
import { clsx } from '../clsx';

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  return (
    <span className={clsx(styles.avatar, styles[size])} data-testid="avatar">
      {showImg
        ? <img className={styles.img} src={src} alt={name} onError={() => setFailed(true)} />
        : <span className={styles.initials} aria-label={name}>{initials(name)}</span>}
    </span>
  );
}
```

```css
/* shared/ui/Avatar/Avatar.module.css */
.avatar {
  display: inline-flex; align-items: center; justify-content: center; overflow: hidden;
  border-radius: var(--radius-full); background: var(--color-surface-3); color: var(--color-text);
  font-weight: var(--weight-semibold); flex: none;
}
.img { inline-size: 100%; block-size: 100%; object-fit: cover; }
.initials { font-size: var(--text-sm); }
.sm { inline-size: 28px; block-size: 28px; } .md { inline-size: 40px; block-size: 40px; } .lg { inline-size: 56px; block-size: 56px; }
```

```tsx
<Avatar src={owner.avatarUrl} name={owner.name} size="lg" />
```

### 7.4 FileUpload

Click + drag-and-drop, keyboard accessible, shows selected files, validates size/type.

```ts
export interface FileUploadProps {
  accept?: string;              // e.g. "image/*,.pdf"
  multiple?: boolean;
  maxSizeMB?: number;           // rejects larger files with a localized error
  onSelect: (files: File[]) => void;
  error?: string;
  label?: string;
}
```

```tsx
// shared/ui/FileUpload/FileUpload.tsx
import { useId, useRef, useState, type DragEvent } from 'react';
import { Field } from '../Field';
import styles from './FileUpload.module.css';
import { clsx } from '../clsx';

export function FileUpload({ accept, multiple, maxSizeMB = 5, onSelect, error, label }: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [localErr, setLocalErr] = useState<string>();

  const handle = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list);
    const tooBig = files.find((f) => f.size > maxSizeMB * 1024 * 1024);
    if (tooBig) { setLocalErr(`"${tooBig.name}" exceeds ${maxSizeMB}MB`); return; }
    setLocalErr(undefined); setNames(files.map((f) => f.name)); onSelect(files);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); };

  return (
    <Field label={label} error={error ?? localErr} htmlFor={inputId}>
      <div
        role="button" tabIndex={0} aria-label={label}
        data-testid="file-upload"
        className={clsx(styles.dropzone, dragging && styles.dragging)}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input ref={inputRef} id={inputId} type="file" accept={accept} multiple={multiple}
          className={styles.hidden} onChange={(e) => handle(e.target.files)} />
        <p className={styles.prompt}>{names.length ? names.join(', ') : 'Drop files or click to browse'}</p>
      </div>
    </Field>
  );
}
```

```css
/* shared/ui/FileUpload/FileUpload.module.css */
.dropzone {
  display: flex; align-items: center; justify-content: center; text-align: center;
  padding: var(--space-8) var(--space-6); cursor: pointer;
  background: var(--color-surface); color: var(--color-text-muted);
  border: 2px dashed var(--color-border); border-radius: var(--radius-lg);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.dropzone:hover, .dragging { border-color: var(--color-primary-accent); background: var(--color-surface-2); }
.dropzone:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
.hidden { position: absolute; inline-size: 1px; block-size: 1px; opacity: 0; pointer-events: none; }
.prompt { margin: 0; font-size: var(--text-sm); }
```

```tsx
<FileUpload label={t('owner.docs')} accept="image/*,.pdf" multiple maxSizeMB={5}
  onSelect={(files) => setFieldValue('documents', files)} error={errors.documents?.message} />
```

### 7.5 DateInput / DateRange

**Rule:** For a **simple filter**, wrap a native `<input type="date">` in `Field` — it is accessible, localized, and keyboard-friendly out of the box. Reach for a rich calendar only when the design calls for month-grid selection; the sanctioned library is **react-day-picker** (tokens + RTL + keyboard), styled via the tightly-scoped `:global` escape hatch (see `02 §3`).

```ts
export interface DateInputProps {
  value: string;               // 'YYYY-MM-DD' (empty = unset)
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  label?: string;
  error?: string;
}
```

```tsx
// shared/ui/DateInput/DateInput.tsx
import { forwardRef, useId } from 'react';
import { Field } from '../Field';
import styles from './DateInput.module.css';
import { clsx } from '../clsx';

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { value, onChange, min, max, label, error }, ref,
) {
  const id = useId();
  return (
    <Field label={label} error={error} htmlFor={id}>
      <input ref={ref} id={id} type="date" value={value} min={min} max={max}
        aria-invalid={!!error} className={clsx(styles.input, error && styles.invalid)}
        onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
});
```

```css
/* shared/ui/DateInput/DateInput.module.css */
.input {
  inline-size: 100%; background: var(--color-surface); color: var(--color-text);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  padding-block: var(--space-2); padding-inline: var(--space-3);
  font-family: var(--font-sans); font-size: var(--text-base);
}
.input:focus-visible { outline: none; border-color: var(--color-primary-accent); box-shadow: 0 0 0 3px var(--color-focus); }
.invalid { border-color: var(--color-danger); }
```

```tsx
// A date-range filter = two DateInputs sharing min/max
<DateInput label={t('finance.from')} value={from} max={to || undefined} onChange={setFrom} />
<DateInput label={t('finance.to')}   value={to}   min={from || undefined} onChange={setTo} />
```

---

## 8. Existing-code migration priority

The order that keeps the app **building at every step** while the legacy JS is replaced. Do them top-to-bottom.

1. **Delete dead files** — remove what nothing imports so the migration isn't chasing ghosts: `auth.api.js`, `auth.endpoints.js`, the unused `decodeToken`, `AuthLayout.jsx`, `DashboardHome.jsx`, `interceptors.js`. Verify with a repo-wide reference search before each deletion.
2. **Foundation** — `tokens.css` + `globals.css` (02); `apiClient` (env base URL + interceptors); `queryClient` (§1.5 defaults); `authStore` (JWT role) + route guards; `i18n` (EN/AR + RTL dir sync); `providers` / `App`; `router` (lazy routes). Nothing renders features yet, but the shell compiles.
3. **UI Kit + page shells** — build every primitive in `03` and the shells in `08` (`PageContainer`, `PageHeader`, `Toolbar`, `Skeleton`) plus the §7 extras. Now features have everything to compose from.
4. **Migrate each feature's data layer** — `types` → `api` (+ `api.mock` §5) → query `keys` → `hooks`. Pure TS; no UI change yet, fully testable.
5. **Swap feature components** to kit primitives + CSS Modules + tokens, composed via the `08` shells. Delete the hand-rolled modals/tables/buttons as each screen is converted.
6. **Extract i18n** EN/AR for the feature (including the `state.*` keys from §3) and **verify RTL** (dir flip, logical props, `flipInRtl` glyphs).
7. **Verify each feature** — `tsc` + lint + build pass, and smoke **all four states** (loading, error+retry, empty/filtered-empty, populated) in mock mode.

**Rule:** keep the app building after **every** step — migrate one feature end-to-end (steps 4→7) before starting the next, rather than half-converting many. A broken `main` mid-migration is not allowed.

---

## Do / Never recap

**Do**
- Use the locked defaults: modal `sm/md/lg` by role, Cancel-start/confirm-end footer, `Card` padding `md` default, `SEARCH_DEBOUNCE_MS`, `pageSize=20`, the global query defaults.
- Render every status via `statusToBadgeVariant(x)`; extend that one switch, never inline-pick.
- Ship the five `state.*` keys per feature; distinct filtered-empty with a "clear filters" action; `ErrorState` always wired to `refetch`.
- Format all numbers/currency/dates through `useLocaleFormat` / `formatDateTime`; wrap LTR metrics in `<bdi>`.
- Mirror the real DTO in mocks, keep a mutable `db`, use `mockDelay`/`maybeFail`, and swap live via the api barrel + `VITE_USE_MOCKS`.
- Add the skip-link, `shouldFocusError`, `<th scope="col">`, and the central `flipInRtl` class.
- Compose from the §7 primitives (Tabs/Drawer/Avatar/FileUpload/DateInput) — tokens-only, logical props, `forwardRef` + `data-testid` + `aria`.
- Migrate one feature end-to-end; keep `main` building at every step.

**Never**
- Pick a modal size/footer order/card padding/debounce/page size/stale time by feel, or swap the Cancel↔confirm order.
- Inline-pick a Badge variant or fork a per-feature status map.
- Ship a bare "No data", or an error panel without retry.
- Hand-concatenate a date or call `toLocaleString()` without the active language; let a metric reorder in RTL.
- Diverge the mock DTO from the real DTO, or make components aware of mock-vs-real.
- Double up the global `:focus-visible` outline and the field `:focus-within` ring on one element.
- Hand-roll a tab bar, drawer, avatar, uploader, or date field — extend the kit instead.
