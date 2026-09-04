# 08 — Page Patterns: Canonical Shells for Total Consistency

The rule that makes **every page look like one designer built it**. A feature author never invents page structure, spacing, or header layout — they drop content into these fixed shells. This is what guarantees the dashboard is visually identical from Admin Management to Owners to Finance to any new feature. Tokens come from `02-design-system.md`; primitives from `03-ui-kit.md`. **If a screen doesn't use these shells, it is a defect — even if it "works".**

---

## 0. The three page archetypes

Every screen in bplay-admin is one of three shapes. Pick the archetype, then fill the slots.

| Archetype | Used for | Shell |
|---|---|---|
| **List page** | Admin/Owner/Region/Facility/Booking management | `PageContainer > PageHeader + Toolbar + DataTable + Pagination` |
| **Detail page** | Owner profile, facility detail | `PageContainer > PageHeader(back) + Card grid (sections)` |
| **Form/confirm modal** | Invite/Edit/Approve/Reject | `Modal > Field grid + footer actions` (from the kit) |

The **spacing rhythm, header, and empty/error/loading treatment are identical** across all three. Nothing below is optional styling — it is the layout contract.

---

## 1. `PageContainer` + `PageHeader` (add to the kit)

These two primitives live in `shared/ui` alongside the rest of the kit and are used by **every** page. Import from `@ui`.

```tsx
// shared/ui/PageContainer/PageContainer.tsx — the vertical rhythm wrapper every page uses
import type { ReactNode } from 'react';
import styles from './PageContainer.module.css';

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className={styles.container}>{children}</div>;
}
```

```css
/* shared/ui/PageContainer/PageContainer.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);          /* the ONE canonical inter-section gap — never ad-hoc */
  inline-size: 100%;
  max-inline-size: 1280px;      /* --bp-xl content cap; centered on ultrawide */
  margin-inline: auto;
}
```

```tsx
// shared/ui/PageHeader/PageHeader.tsx — the ONLY page title/actions row
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '../IconButton';
import { ArrowStartIcon } from '../icons';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;   // right-aligned CTAs (Button/…). Auto-wraps below the title on mobile.
  onBack?: () => void;   // when set, renders a start-anchored back button (detail pages)
  backLabel?: string;    // aria-label for the back button
}

export function PageHeader({ title, subtitle, actions, onBack, backLabel }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={styles.header}>
      <div className={styles.titleWrap}>
        {onBack !== undefined && (
          <IconButton
            variant="ghost"
            label={backLabel ?? 'Back'}
            icon={<ArrowStartIcon />}
            onClick={onBack ?? (() => navigate(-1))}
          />
        )}
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
```

```css
/* shared/ui/PageHeader/PageHeader.module.css */
.header {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: var(--space-4);
}
.titleWrap { display: flex; align-items: center; gap: var(--space-3); min-inline-size: 0; }
.title {
  margin: 0; font-size: var(--text-3xl); font-weight: var(--weight-bold);
  line-height: var(--leading-tight); color: var(--color-text);
}
.subtitle { margin: var(--space-1) 0 0; font-size: var(--text-sm); color: var(--color-text-muted); }
.actions { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }

/* Mobile: title stacks, actions go full-width under it */
@media (max-width: 640px) {
  .header { flex-direction: column; align-items: stretch; }
  .actions { justify-content: stretch; }
}
```

**Rule:** A page's `<h1>` exists **only** inside `PageHeader`. Never place a bare title/actions row in a feature. One header, one type scale, one spacing — everywhere.

---

## 2. List page — the canonical CRUD shell

The shape of Admin/Owner/Region management and every future management screen. Header → toolbar (search + filters) → table → pagination. `DataTable` owns loading/empty/error internally (see `03-ui-kit.md`), so the page has **no** manual state branches.

```tsx
// features/admin-management/pages/AdminManagementPage.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader, Toolbar, SearchInput, Select, DataTable, Pagination, Badge, Button } from '@ui';
import { PlusIcon } from '@ui/icons';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useAdminsQuery } from '../hooks/useAdminsQuery';
import { InviteAdminModal } from '../components/InviteAdminModal';
import type { Admin } from '../api/admin-management.types';

const STATUS_VARIANT = { active: 'success', suspended: 'danger' } as const;

export function AdminManagementPage() {
  const { t } = useTranslation();
  const invite = useDisclosure();
  const [params, setParams] = useState({ q: '', status: 'all', page: 1 });
  const { data, isLoading, error, refetch } = useAdminsQuery(params);

  const columns = [
    { key: 'name', header: t('admin.col.name') },
    { key: 'email', header: t('admin.col.email') },
    { key: 'status', header: t('admin.col.status'),
      render: (a: Admin) => <Badge variant={STATUS_VARIANT[a.status]}>{t(`status.${a.status}`)}</Badge> },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.title')}
        subtitle={t('admin.subtitle')}
        actions={<Button leftIcon={<PlusIcon />} onClick={invite.open}>{t('admin.invite')}</Button>}
      />

      <Toolbar>
        <SearchInput
          value={params.q}
          onChange={(q) => setParams((p) => ({ ...p, q, page: 1 }))}
          placeholder={t('admin.search')}
        />
        <Select
          aria-label={t('admin.filter.status')}
          value={params.status}
          onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          options={[
            { value: 'all', label: t('status.all') },
            { value: 'active', label: t('status.active') },
            { value: 'suspended', label: t('status.suspended') },
          ]}
        />
      </Toolbar>

      <DataTable<Admin>
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        error={error ? t('common.loadError') : undefined}
        onRetry={refetch}
        getRowId={(a) => a.id}
        rowActions={(a) => <AdminRowActions admin={a} />}
      />

      <Pagination
        page={params.page}
        pageCount={data?.pageCount ?? 1}
        onPageChange={(page) => setParams((p) => ({ ...p, page }))}
      />

      <InviteAdminModal isOpen={invite.isOpen} onClose={invite.close} />
    </PageContainer>
  );
}
```

`Toolbar` is a thin layout primitive (search grows, filters sit at the inline-end; wraps on mobile):

```css
/* shared/ui/Toolbar/Toolbar.module.css */
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.toolbar > :first-child { flex: 1 1 260px; }   /* search grows; filters keep intrinsic size */
```

**Rules for every list page:**
- **Filters/search state lives in the page** and is passed to the query hook as `params` (so refetch + URL-sync are trivial). Never filter the array client-side after fetch unless the whole dataset is already local.
- **Pagination is server-side by default** (`params.page` → query key → API). Client-side paging is allowed only for a known-small, fully-loaded list, and must be called out.
- **`DataTable` renders its own loading skeleton / empty / error+retry.** The page never writes `if (isLoading) return <Spinner/>`.
- Resetting `page` to 1 on any search/filter change is mandatory.

---

## 3. Detail page — the section-card shell

Back button in the header, then a responsive grid of `Card` sections. Same `PageContainer` rhythm.

```tsx
// features/owner-management/pages/OwnerProfilePage.tsx
export function OwnerProfilePage() {
  const { t } = useTranslation();
  const { ownerId } = useParams();
  const { data: owner, isLoading, error, refetch } = useOwnerQuery(ownerId!);

  if (isLoading) return <PageContainer><SkeletonPage /></PageContainer>;
  if (error || !owner) return <PageContainer><ErrorState onRetry={refetch} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={owner.name} subtitle={owner.email} onBack backLabel={t('common.back')}
        actions={<OwnerStatusActions owner={owner} />} />
      <div className={styles.sectionGrid}>
        <Card padding="lg"><OwnerIdentitySection owner={owner} /></Card>
        <Card padding="lg"><OwnerDocumentsSection owner={owner} /></Card>
        <Card padding="lg"><OwnerFacilitiesSection owner={owner} /></Card>
      </div>
    </PageContainer>
  );
}
```

```css
/* section grid: 1 column on mobile, 2 from md, spacing = --space-6 */
.sectionGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}
@media (min-width: 1024px) {
  .sectionGrid { grid-template-columns: repeat(2, 1fr); }
}
```

---

## 4. Form modal — the canonical form shell

Every create/edit/confirm is a `Modal` from the kit, its body a **form grid**, its footer standard Cancel/Submit. RHF+Zod wiring is in `05-state-i18n-forms.md`; this is the *layout* contract.

```tsx
// features/admin-management/components/InviteAdminModal.tsx
export function InviteAdminModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useInviteAdminForm(onClose);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('admin.invite.title')} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="invite-admin" isLoading={isSubmitting}>{t('admin.invite.submit')}</Button>
        </>
      }
    >
      <form id="invite-admin" className={styles.formGrid} onSubmit={handleSubmit}>
        <Field className={styles.full} label={t('admin.invite.name')} error={errors.name && t(errors.name.message!)}>
          <Input {...register('name')} />
        </Field>
        <Field className={styles.full} label={t('admin.invite.email')} error={errors.email && t(errors.email.message!)}>
          <Input type="email" {...register('email')} />
        </Field>
      </form>
    </Modal>
  );
}
```

```css
/* the canonical form grid — 1 col on mobile, 2 from md; .full spans both */
.formGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}
.full { grid-column: 1 / -1; }
@media (min-width: 768px) {
  .formGrid { grid-template-columns: repeat(2, 1fr); }
}
```

**Rules:** submit button is `isLoading` while pending and lives in the modal `footer`; the `<form id>` + `<Button form={id}>` pattern keeps the submit in the footer while the fields stay in the body. Short forms (≤2 fields) use `size="sm"` and can keep every field `.full`.

---

## 5. Skeleton — the loading primitive (add to the kit)

`DataTable` renders skeleton rows internally, but detail pages and cards need a reusable shimmer. Tokens-only, respects `prefers-reduced-motion`.

```tsx
// shared/ui/Skeleton/Skeleton.tsx
import styles from './Skeleton.module.css';

export interface SkeletonProps { width?: string; height?: string; radius?: string; }
export function Skeleton({ width = '100%', height = 'var(--space-4)', radius = 'var(--radius-sm)' }: SkeletonProps) {
  return <span className={styles.skeleton} style={{ inlineSize: width, blockSize: height, borderRadius: radius }} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return <div className={styles.stack}>{Array.from({ length: lines }, (_, i) => <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} />)}</div>;
}
```

```css
/* shared/ui/Skeleton/Skeleton.module.css */
.skeleton {
  display: block;
  background: linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-3) 37%, var(--color-surface-2) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
.stack { display: flex; flex-direction: column; gap: var(--space-2); }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```

> `width`/`height`/`radius` are the one sanctioned inline-style exception: they are **runtime geometry**, not design values (same rule as `DataTable` column widths). The colors/animation stay in the module.

`SkeletonPage` (a detail-page placeholder) is just `<Card><SkeletonText lines={4} /></Card>` repeated in the `.sectionGrid`.

---

## 6. Empty / error state placement

`EmptyState` and `ErrorState` must **fill the content area**, not float at the top of a tall page. Give the wrapper a minimum block size so they center.

```css
.stateHost { display: grid; place-items: center; min-block-size: 320px; }
```

- **Empty** copy is specific and localized: `t('admin.empty.title')` / `t('admin.empty.desc')` — never a bare "No data". If a filter/search caused it, the empty state says so and offers a "clear filters" action.
- **Error** always offers `onRetry` (the query's `refetch`).
- Inside `DataTable` these are handled for you; only free-form pages wire `stateHost` manually.

---

## 7. The consistency checklist (every page)

- [ ] Wrapped in `PageContainer` (never a bare `<div>` with ad-hoc padding).
- [ ] Exactly one `PageHeader` with the localized title (+ subtitle/actions/back as needed).
- [ ] List pages: `Toolbar` (SearchInput + filters) → `DataTable` → `Pagination`, params in page state, server-side paging, page→1 on filter change.
- [ ] Detail pages: back button + `.sectionGrid` of `Card`s.
- [ ] Forms: `Modal` + `.formGrid` (2-col md, 1-col mobile, `.full` spanners) + footer Cancel/Submit(`isLoading`).
- [ ] Loading = `Skeleton`/DataTable skeleton (never a bare centered spinner on a full page).
- [ ] Empty/error fill the area (`stateHost` min-block-size), localized copy, retry on error.
- [ ] Section gap is always `--space-6`; card padding via `Card` `padding` prop; no ad-hoc margins.

---

## Do / Never recap

**Do**
- Compose every screen from `PageContainer` + `PageHeader` + (`Toolbar`/`DataTable`/`Pagination` | `.sectionGrid` | `Modal`+`.formGrid`).
- Keep list/detail/form layout, spacing rhythm, and header identical across all features.
- Use `Skeleton` for load states; localized, specific empty/error copy with retry.

**Never**
- Hand-roll a page title row, a bespoke toolbar, or ad-hoc section spacing.
- Branch on `isLoading`/empty/error on a list page — `DataTable` owns those.
- Vary header type scale, section gap, or form-grid columns between features.
