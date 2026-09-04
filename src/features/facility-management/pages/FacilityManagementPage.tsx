import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Button,
  CheckIcon,
  DataTable,
  EmptyState,
  ErrorState,
  InboxIcon,
  PageContainer,
  PageHeader,
  Pagination,
  PlusIcon,
  ReasonDialog,
  Skeleton,
  Tabs,
  EMPTY_DATE_RANGE,
  type SortDir,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { useAdminScope } from '../hooks/useAdminScope';
import { useFacilitiesQuery } from '../hooks/useFacilitiesQuery';
import { usePendingQueueQuery } from '../hooks/usePendingQueueQuery';
import { useFacilityStatsQuery } from '../hooks/useFacilityStatsQuery';
import { useBulkFacilityAction } from '../hooks/useBulkFacilityAction';
import { ScopeBanner } from '../components/ScopeBanner';
import { FacilityStatCards } from '../components/FacilityStatCards';
import { FacilityReviewCard, queueGridVariants } from '../components/FacilityReviewCard';
import { FacilityActionDialogs } from '../components/FacilityStatusActions';
import { FacilityFiltersBar } from '../components/FacilityFiltersBar';
import { FacilityRowActions } from '../components/FacilityRowActions';
import { useFacilityColumns } from '../components/useFacilityColumns';
import type {
  FacilityAction,
  FacilityListItem,
  FacilityListParams,
  FacilitySortBy,
} from '../api/facility.types';
import styles from './FacilityManagementPage.module.css';

type FacilityTab = 'queue' | 'directory';

interface QueueDialog {
  item: FacilityListItem;
  action: FacilityAction | null;
}

const QUEUE_PAGE_SIZE = 12;
const SKELETON_CARDS = 6;

/** Column key ⇄ domain sort field. */
const SORT_BY_COLUMN: Record<string, FacilitySortBy> = {
  name: 'name',
  rating: 'rating',
  created: 'createdAt',
};
const COLUMN_BY_SORT = Object.fromEntries(
  Object.entries(SORT_BY_COLUMN).map(([column, sortBy]) => [sortBy, column]),
) as Record<FacilitySortBy, string>;

const INITIAL_DIRECTORY: FacilityListParams = {
  q: '',
  status: 'all',
  kind: 'all',
  source: 'all',
  sport: 'all',
  regionId: 'all',
  ownerId: 'all',
  governorate: 'all',
  verification: 'all',
  city: '',
  amenities: [],
  dateRange: EMPTY_DATE_RANGE,
  page: 1,
};

/**
 * The Review Desk: a KPI header, a pending-submissions queue with bulk review,
 * and the full facility directory (filters + sortable table), as two
 * URL-addressable tabs (?tab=queue|directory). Counts come from one lightweight
 * stats query; each tab keeps its own params so switching never clobbers filters.
 */
export default function FacilityManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: FacilityTab = searchParams.get('tab') === 'directory' ? 'directory' : 'queue';

  const [queueParams, setQueueParams] = useState<FacilityListParams>({
    q: '',
    page: 1,
    pageSize: QUEUE_PAGE_SIZE,
    sortBy: 'createdAt',
    sortDir: 'asc',
  });
  const [directoryParams, setDirectoryParams] = useState<FacilityListParams>(INITIAL_DIRECTORY);
  const [queueDialog, setQueueDialog] = useState<QueueDialog | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const { isSuperAdmin } = useAdminScope();
  const statsQuery = useFacilityStatsQuery();
  const queueQuery = usePendingQueueQuery(queueParams);
  const directoryQuery = useFacilitiesQuery(directoryParams);
  const bulk = useBulkFacilityAction();

  const queueItems = queueQuery.data?.items ?? [];

  const openProfile = useCallback(
    (item: FacilityListItem) => navigate(`${PATHS.facilityManagement}/${item.id}`),
    [navigate],
  );
  const openOwner = useCallback(
    (ownerId: string) => navigate(`${PATHS.ownerManagement}/${ownerId}`),
    [navigate],
  );
  const columns = useFacilityColumns({ onOwnerClick: openOwner });

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const onTabChange = (key: string) => {
    clearSelection();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', key);
        return next;
      },
      { replace: true },
    );
  };

  const patchQueue = (patch: Partial<FacilityListParams>) => {
    clearSelection();
    setQueueParams((prev) => ({ ...prev, ...patch }));
  };

  const closeQueueDialog = () =>
    setQueueDialog((prev) => (prev ? { ...prev, action: null } : prev));

  const toggleSelect = useCallback((item: FacilityListItem) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const allSelected = queueItems.length > 0 && queueItems.every((item) => selected.has(item.id));
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selected.size > 0 && !allSelected;
    }
  }, [selected.size, allSelected]);
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (queueItems.every((item) => next.has(item.id))) {
        queueItems.forEach((item) => next.delete(item.id));
      } else {
        queueItems.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const selectedIds = useMemo(() => [...selected], [selected]);
  const runBulkApprove = () =>
    bulk.mutate({ ids: selectedIds, action: 'approve' }, { onSuccess: clearSelection });
  const runBulkReject = (reason: string) =>
    bulk.mutate(
      { ids: selectedIds, action: 'reject', reason },
      {
        onSuccess: () => {
          clearSelection();
          setBulkRejectOpen(false);
        },
      },
    );

  const onSort = (columnKey: string) => {
    const sortBy = SORT_BY_COLUMN[columnKey];
    if (!sortBy) return;
    setDirectoryParams((prev) => {
      const sortDir: SortDir = prev.sortBy === sortBy && prev.sortDir === 'asc' ? 'desc' : 'asc';
      return { ...prev, sortBy, sortDir, page: 1 };
    });
  };

  const renderQueue = () => {
    if (queueQuery.isLoading) {
      return (
        <div className={styles.grid} aria-hidden data-testid="facility-queue-loading">
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <div key={index} className={styles.skeletonCard}>
              <Skeleton height="150px" radius="0" />
              <div className={styles.skeletonBody}>
                <Skeleton width="70%" height="var(--space-5)" />
                <Skeleton width="45%" />
                <Skeleton width="60%" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (queueQuery.isError) {
      return (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void queueQuery.refetch()}
        />
      );
    }
    if (queueItems.length === 0) {
      return (
        <div className={styles.emptyCard}>
          <EmptyState
            icon={<CheckIcon />}
            title={t('facility.queue.empty.title')}
            description={t('facility.queue.empty.desc')}
          />
        </div>
      );
    }
    return (
      <>
        <div className={styles.bulkBar} data-testid="facility-bulk-bar">
          <label className={styles.bulkSelectAll}>
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              aria-label={t('facility.bulk.selectAll')}
              data-testid="facility-select-all"
            />
            <span>
              {selected.size > 0
                ? t('facility.bulk.selectedCount', { count: selected.size })
                : t('facility.bulk.selectAll')}
            </span>
          </label>
          {selected.size > 0 && (
            <div className={styles.bulkActions}>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                {t('facility.bulk.clear')}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setBulkRejectOpen(true)}
                data-testid="facility-bulk-reject"
              >
                {t('facility.bulk.reject')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<CheckIcon />}
                isLoading={bulk.isPending}
                onClick={runBulkApprove}
                data-testid="facility-bulk-approve"
              >
                {t('facility.bulk.approve')}
              </Button>
            </div>
          )}
        </div>

        <motion.div
          className={styles.grid}
          variants={reduceMotion ? undefined : queueGridVariants}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
        >
          {queueItems.map((item) => (
            <FacilityReviewCard
              key={item.id}
              item={item}
              selectable
              selected={selected.has(item.id)}
              onToggleSelect={toggleSelect}
              onView={openProfile}
              onApprove={(target) => setQueueDialog({ item: target, action: 'approve' })}
              onReject={(target) => setQueueDialog({ item: target, action: 'reject' })}
            />
          ))}
        </motion.div>
        <Pagination
          page={queueQuery.data?.page ?? 1}
          pageCount={queueQuery.data?.pageCount ?? 1}
          onPageChange={(page) => patchQueue({ page })}
        />
      </>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('facility.title')}
        subtitle={t('facility.subtitle')}
        actions={
          <Button
            leftIcon={<PlusIcon />}
            onClick={() => navigate(PATHS.facilityManagementNew)}
            data-testid="facility-add"
          >
            {t('facility.actions.add')}
          </Button>
        }
      />

      <FacilityStatCards stats={statsQuery.data} />

      <ScopeBanner
        pendingCount={statsQuery.data?.pending}
        agedCount={statsQuery.data?.aged}
        orphanCount={isSuperAdmin ? statsQuery.data?.orphan : undefined}
      />

      <Tabs
        items={[
          { key: 'queue', label: t('facility.tabs.queue'), badge: statsQuery.data?.pending },
          { key: 'directory', label: t('facility.tabs.directory') },
        ]}
        value={tab}
        onChange={onTabChange}
        aria-label={t('facility.title')}
      />

      {tab === 'queue' ? (
        <section
          className={styles.panel}
          role="tabpanel"
          aria-label={t('facility.tabs.queue')}
          data-testid="facility-queue-grid"
        >
          <FacilityFiltersBar
            params={queueParams}
            onChange={(patch) => patchQueue({ ...patch, page: 1 })}
            hideStatus
          />
          {renderQueue()}
        </section>
      ) : (
        <section
          className={styles.panel}
          role="tabpanel"
          aria-label={t('facility.tabs.directory')}
          data-testid="facility-directory-table"
        >
          <FacilityFiltersBar
            params={directoryParams}
            onChange={(patch) => setDirectoryParams((prev) => ({ ...prev, ...patch, page: 1 }))}
          />
          <DataTable<FacilityListItem>
            columns={columns}
            data={directoryQuery.data?.items ?? []}
            isLoading={directoryQuery.isLoading}
            error={directoryQuery.isError ? t('common.loadError') : undefined}
            onRetry={() => void directoryQuery.refetch()}
            getRowId={(item) => item.id}
            onRowClick={openProfile}
            sort={
              directoryParams.sortBy
                ? {
                    key: COLUMN_BY_SORT[directoryParams.sortBy],
                    dir: directoryParams.sortDir ?? 'asc',
                  }
                : undefined
            }
            onSortChange={onSort}
            actionsLabel={t('common.actions')}
            emptyState={
              <EmptyState
                icon={<InboxIcon />}
                title={t('facility.empty.title')}
                description={t('facility.empty.desc')}
              />
            }
            rowActions={(item) => <FacilityRowActions item={item} onView={openProfile} />}
          />
          <Pagination
            page={directoryQuery.data?.page ?? 1}
            pageCount={directoryQuery.data?.pageCount ?? 1}
            onPageChange={(page) => setDirectoryParams((prev) => ({ ...prev, page }))}
          />
        </section>
      )}

      {queueDialog && (
        <FacilityActionDialogs
          facility={queueDialog.item}
          action={queueDialog.action}
          onClose={closeQueueDialog}
        />
      )}

      <ReasonDialog
        isOpen={bulkRejectOpen}
        onClose={() => setBulkRejectOpen(false)}
        onConfirm={runBulkReject}
        title={t('facility.bulk.rejectTitle', { count: selected.size })}
        reasonLabel={t('facility.bulk.reasonLabel')}
        reasonPlaceholder={t('facility.bulk.reasonPlaceholder')}
        confirmText={t('facility.bulk.reject')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={bulk.isPending}
      />
    </PageContainer>
  );
}
