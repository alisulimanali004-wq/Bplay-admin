import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ClearFiltersBar,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FilterField,
  InboxIcon,
  LayersIcon,
  MessageCircleIcon,
  PageContainer,
  PageHeader,
  Pagination,
  PlusIcon,
  PowerIcon,
  SearchIcon,
  SearchInput,
  Select,
  Spinner,
  Toolbar,
  UsersIcon,
  ViewToggle,
  WalletIcon,
  type SortDir,
  type ViewMode,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { PATHS } from '@app/router/paths';
import { usePlansQuery } from '../hooks/usePlansQuery';
import { usePlanStats } from '../hooks/usePlanStats';
import { PlanOverviewStats } from '../components/PlanOverviewStats';
import { PlanCard } from '../components/PlanCard';
import { PlanFormModal } from '../components/PlanFormModal';
import { PlanDeleteDialog } from '../components/PlanDeleteDialog';
import { PlanRowActions } from '../components/PlanRowActions';
import { SORT_BY_COLUMN, usePlanColumns } from '../components/usePlanColumns';
import { useSetPlanActive } from '../hooks/usePlanMutations';
import { PLAN_AUDIENCES, type Plan, type PlanListParams } from '../api/plan.types';
import styles from './PlansPage.module.css';

const INITIAL: PlanListParams = {
  q: '',
  audience: 'all',
  kind: 'all',
  status: 'all',
  community: 'all',
  sortBy: 'displayOrder',
  sortDir: 'asc',
  page: 1,
  pageSize: 12,
};

/**
 * The catalog is a handful of rows, so one unfiltered fetch gives the exact
 * position of every plan inside its audience — that's what the reorder guards
 * need, and paging must not make "move up" lie.
 */
const ORDER_PARAMS: PlanListParams = { sortBy: 'displayOrder', sortDir: 'asc', pageSize: 500 };

export default function PlansPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useState<PlanListParams>(INITIAL);
  const [view, setView] = useState<ViewMode>('grid');
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [deactivating, setDeactivating] = useState<Plan | null>(null);
  const create = useDisclosure();
  const setActive = useSetPlanActive();

  const { data, isLoading, isError, refetch } = usePlansQuery(params);
  const { data: stats } = usePlanStats();
  const { data: catalog } = usePlansQuery(ORDER_PARAMS);

  const plans = data?.items ?? [];
  const openDetail = (plan: Plan) => navigate(`${PATHS.plans}/${plan.id}`);
  const patch = (next: Partial<PlanListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: 1 }));

  const hasActiveFilters =
    (params.q ?? '') !== '' ||
    (params.audience ?? 'all') !== 'all' ||
    (params.kind ?? 'all') !== 'all' ||
    (params.status ?? 'all') !== 'all' ||
    (params.community ?? 'all') !== 'all';

  /** First/last plan id of each audience, from the full catalog order. */
  const boundaries = useMemo(() => {
    const edges = new Map<string, { firstId: string; lastId: string }>();
    for (const audience of PLAN_AUDIENCES) {
      const group = (catalog?.items ?? [])
        .filter((plan) => plan.audience === audience)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      if (group.length > 0) {
        edges.set(audience, { firstId: group[0].id, lastId: group[group.length - 1].id });
      }
    }
    return edges;
  }, [catalog]);

  const isFirstInAudience = (plan: Plan) => boundaries.get(plan.audience)?.firstId === plan.id;
  const isLastInAudience = (plan: Plan) => boundaries.get(plan.audience)?.lastId === plan.id;

  const columns = usePlanColumns({ onOpen: openDetail });

  const sortKey = Object.entries(SORT_BY_COLUMN).find(
    ([, value]) => value === params.sortBy,
  )?.[0];

  const onSortChange = (key: string) => {
    const sortBy = SORT_BY_COLUMN[key];
    if (!sortBy) return;
    setParams((prev) => ({
      ...prev,
      sortBy,
      sortDir: prev.sortBy === sortBy && prev.sortDir === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const emptyState = hasActiveFilters ? (
    <EmptyState
      icon={<InboxIcon />}
      title={t('plan.state.filteredTitle')}
      description={t('plan.state.filteredDesc')}
      action={
        <Button variant="secondary" onClick={() => setParams(INITIAL)}>
          {t('common.clearFilters')}
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={<LayersIcon />}
      title={t('plan.state.emptyTitle')}
      description={t('plan.state.emptyDesc')}
      action={<Button onClick={create.open}>{t('plan.create')}</Button>}
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('plan.title')}
        subtitle={t('plan.subtitle')}
        actions={
          <Button leftIcon={<PlusIcon />} onClick={create.open} data-testid="plan-create">
            {t('plan.create')}
          </Button>
        }
      />

      <PlanOverviewStats stats={stats} />

      <Toolbar
        end={
          hasActiveFilters ? (
            <ClearFiltersBar
              count={data?.total ?? 0}
              onClear={() => setParams(INITIAL)}
              testId="plan-clear-filters"
            />
          ) : null
        }
      >
        <FilterField label={t('common.search')} icon={<SearchIcon />}>
          <SearchInput
            value={params.q ?? ''}
            onChange={(q) => patch({ q })}
            placeholder={t('plan.search')}
          />
        </FilterField>
        <FilterField label={t('plan.col.audience')} icon={<UsersIcon />}>
          <Select
            aria-label={t('plan.col.audience')}
            value={params.audience ?? 'all'}
            onChange={(value) => patch({ audience: value as PlanListParams['audience'] })}
            options={[
              { value: 'all', label: t('plan.filter.allAudiences') },
              { value: 'player', label: t('plan.audience.player') },
              { value: 'owner', label: t('plan.audience.owner') },
            ]}
          />
        </FilterField>
        <FilterField label={t('plan.col.kind')} icon={<WalletIcon />}>
          <Select
            aria-label={t('plan.col.kind')}
            value={params.kind ?? 'all'}
            onChange={(value) => patch({ kind: value as PlanListParams['kind'] })}
            options={[
              { value: 'all', label: t('plan.filter.allKinds') },
              { value: 'free', label: t('plan.kind.free') },
              { value: 'paid', label: t('plan.kind.paid') },
            ]}
          />
        </FilterField>
        <FilterField label={t('plan.col.status')} icon={<PowerIcon />}>
          <Select
            aria-label={t('plan.col.status')}
            value={params.status ?? 'all'}
            onChange={(value) => patch({ status: value as PlanListParams['status'] })}
            options={[
              { value: 'all', label: t('status.all') },
              { value: 'active', label: t('plan.status.active') },
              { value: 'inactive', label: t('plan.status.inactive') },
            ]}
          />
        </FilterField>
        <FilterField label={t('plan.filter.community')} icon={<MessageCircleIcon />}>
          <Select
            aria-label={t('plan.filter.community')}
            value={params.community ?? 'all'}
            onChange={(value) => patch({ community: value as PlanListParams['community'] })}
            options={[
              { value: 'all', label: t('plan.filter.allCommunity') },
              { value: 'unlocks', label: t('plan.filter.communityUnlocks') },
              { value: 'locked', label: t('plan.filter.communityLocked') },
            ]}
          />
        </FilterField>
        <ViewToggle
          value={view}
          onChange={setView}
          groupLabel={t('plan.view.label')}
          gridLabel={t('plan.view.grid')}
          tableLabel={t('plan.view.table')}
          testIdPrefix="plan"
        />
      </Toolbar>

      {view === 'grid' ? (
        isLoading ? (
          <div className={styles.center}>
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <ErrorState
            title={t('plan.state.errorTitle')}
            message={t('common.loadError')}
            retryLabel={t('common.retry')}
            onRetry={() => void refetch()}
          />
        ) : plans.length === 0 ? (
          <div className={styles.stateHost}>{emptyState}</div>
        ) : (
          <div className={styles.sections}>
            {PLAN_AUDIENCES.map((audience) => {
              const group = plans.filter((plan) => plan.audience === audience);
              if (group.length === 0) return null;
              return (
                <section key={audience} className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    {t(`plan.audience.${audience}Plural`)}
                    <span className={styles.sectionCount}>{group.length}</span>
                  </h2>
                  <p className={styles.sectionHint}>{t(`plan.audience.${audience}Hint`)}</p>
                  <div className={styles.grid}>
                    {group.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        onOpen={openDetail}
                        onEdit={setEditing}
                        onDelete={setDeleting}
                        // Activating is safe and immediate; deactivating hides the
                        // plan from the apps, so it takes the same confirm the
                        // table and detail views use.
                        onToggleActive={(target) =>
                          target.isActive
                            ? setDeactivating(target)
                            : setActive.mutate({ id: target.id, isActive: true })
                        }
                        isToggling={setActive.isPending && setActive.variables?.id === plan.id}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )
      ) : (
        <DataTable<Plan>
          columns={columns}
          data={plans}
          isLoading={isLoading}
          error={isError ? t('common.loadError') : undefined}
          onRetry={() => void refetch()}
          getRowId={(plan) => plan.id}
          actionsLabel={t('common.actions')}
          sort={sortKey ? { key: sortKey, dir: (params.sortDir ?? 'asc') as SortDir } : undefined}
          onSortChange={onSortChange}
          emptyState={emptyState}
          rowActions={(plan) => (
            <PlanRowActions
              plan={plan}
              onView={openDetail}
              onEdit={setEditing}
              onDelete={setDeleting}
              isFirst={isFirstInAudience(plan)}
              isLast={isLastInAudience(plan)}
            />
          )}
        />
      )}

      <Pagination
        page={data?.page ?? 1}
        pageCount={data?.pageCount ?? 1}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
      />

      <PlanFormModal isOpen={create.isOpen} onClose={create.close} plan={null} />
      <PlanFormModal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        plan={editing}
      />
      <PlanDeleteDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        plan={deleting}
      />
      <ConfirmDialog
        isOpen={deactivating !== null}
        onClose={() => setDeactivating(null)}
        title={t('plan.confirm.deactivateTitle')}
        message={t('plan.confirm.deactivateMessage', { name: deactivating?.name ?? '' })}
        confirmText={t('plan.actions.deactivate')}
        cancelText={t('common.cancel')}
        variant="caution"
        isLoading={setActive.isPending}
        onConfirm={async () => {
          if (!deactivating) return;
          await setActive.mutateAsync({ id: deactivating.id, isActive: false });
          setDeactivating(null);
        }}
      />
    </PageContainer>
  );
}
