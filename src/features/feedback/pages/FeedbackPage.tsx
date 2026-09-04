import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  CalendarIcon,
  ClearFiltersBar,
  DataTable,
  DateRange,
  EMPTY_DATE_RANGE,
  EmptyState,
  FilterField,
  GlobeIcon,
  InboxIcon,
  MessageCircleIcon,
  PageContainer,
  PageHeader,
  Pagination,
  PowerIcon,
  SearchIcon,
  SearchInput,
  Select,
  Toolbar,
  UsersIcon,
  isDateRangeActive,
  type SortDir,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { useFeedbackListQuery, useFeedbackStats } from '../hooks/useFeedbackQuery';
import { useAdminScope } from '../hooks/useAdminScope';
import { useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import { FeedbackStatCards } from '../components/FeedbackStatCards';
import { FeedbackRowActions } from '../components/FeedbackRowActions';
import { ScopeBanner } from '../components/ScopeBanner';
import { SORT_BY_COLUMN, useFeedbackColumns } from '../components/useFeedbackColumns';
import { ORPHAN_REGION } from '../api/feedback.filter';
import { FEEDBACK_KINDS } from '../api/feedback.types';
import type { Feedback, FeedbackListParams } from '../api/feedback.types';

const INITIAL: FeedbackListParams = {
  q: '',
  senderType: 'all',
  kind: 'all',
  status: 'all',
  regionId: 'all',
  dateRange: EMPTY_DATE_RANGE,
  sortBy: 'createdAt',
  sortDir: 'desc',
  page: 1,
};

export default function FeedbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useState<FeedbackListParams>(INITIAL);
  const { data, isLoading, isError, refetch } = useFeedbackListQuery(params);
  const { data: stats } = useFeedbackStats();
  const { isSuperAdmin, assignedRegionIds } = useAdminScope();
  const regionsQuery = useScopeRegionsQuery();

  const items = data?.items ?? [];
  const openDetail = (feedback: Feedback) => navigate(`${PATHS.feedback}/${feedback.id}`);
  const patch = (next: Partial<FeedbackListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: 1 }));

  const hasActiveFilters =
    (params.q ?? '') !== '' ||
    (params.senderType ?? 'all') !== 'all' ||
    (params.kind ?? 'all') !== 'all' ||
    (params.status ?? 'all') !== 'all' ||
    (params.regionId ?? 'all') !== 'all' ||
    isDateRangeActive(params.dateRange ?? EMPTY_DATE_RANGE);

  // Only offer the regions this admin can actually see; the orphan bucket is a
  // super-admin concept (nobody else is ever shown an out-of-region sender).
  const scopedRegions = (regionsQuery.data ?? []).filter(
    (region) =>
      !assignedRegionIds || assignedRegionIds.length === 0 || assignedRegionIds.includes(region.id),
  );
  const showRegionFilter = isSuperAdmin || scopedRegions.length > 1;

  const columns = useFeedbackColumns({ onOpen: openDetail, showRegion: showRegionFilter });

  const sortKey = Object.entries(SORT_BY_COLUMN).find(([, value]) => value === params.sortBy)?.[0];

  const onSortChange = (key: string) => {
    const sortBy = SORT_BY_COLUMN[key];
    if (!sortBy) return;
    setParams((prev) => ({
      ...prev,
      sortBy,
      sortDir: prev.sortBy === sortBy && prev.sortDir === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  return (
    <PageContainer>
      <PageHeader title={t('feedback.title')} subtitle={t('feedback.subtitle')} />

      <ScopeBanner />

      <FeedbackStatCards stats={stats} />

      <Toolbar
        end={
          hasActiveFilters ? (
            <ClearFiltersBar
              count={data?.total ?? 0}
              onClear={() => setParams(INITIAL)}
              testId="feedback-clear-filters"
            />
          ) : null
        }
      >
        <FilterField label={t('common.search')} icon={<SearchIcon />}>
          <SearchInput
            value={params.q ?? ''}
            onChange={(q) => patch({ q })}
            placeholder={t('feedback.search')}
          />
        </FilterField>
        <FilterField label={t('feedback.col.sender')} icon={<UsersIcon />}>
          <Select
            aria-label={t('feedback.col.sender')}
            value={params.senderType ?? 'all'}
            onChange={(value) => patch({ senderType: value as FeedbackListParams['senderType'] })}
            options={[
              { value: 'all', label: t('feedback.filter.allSenders') },
              { value: 'player', label: t('feedback.senderType.player') },
              { value: 'owner', label: t('feedback.senderType.owner') },
            ]}
          />
        </FilterField>
        <FilterField label={t('feedback.col.kind')} icon={<MessageCircleIcon />}>
          <Select
            aria-label={t('feedback.col.kind')}
            value={params.kind ?? 'all'}
            onChange={(value) => patch({ kind: value as FeedbackListParams['kind'] })}
            options={[
              { value: 'all', label: t('feedback.filter.allKinds') },
              ...FEEDBACK_KINDS.map((kind) => ({
                value: kind,
                label: t(`feedback.kind.${kind}`),
              })),
            ]}
          />
        </FilterField>
        <FilterField label={t('feedback.col.status')} icon={<PowerIcon />}>
          <Select
            aria-label={t('feedback.col.status')}
            value={params.status ?? 'all'}
            onChange={(value) => patch({ status: value as FeedbackListParams['status'] })}
            options={[
              { value: 'all', label: t('status.all') },
              { value: 'new', label: t('feedback.status.new') },
              { value: 'replied', label: t('feedback.status.replied') },
              { value: 'closed', label: t('feedback.status.closed') },
            ]}
          />
        </FilterField>
        {showRegionFilter && (
          <FilterField label={t('feedback.col.region')} icon={<GlobeIcon />}>
            <Select
              aria-label={t('feedback.col.region')}
              value={params.regionId ?? 'all'}
              onChange={(value) => patch({ regionId: value })}
              options={[
                { value: 'all', label: t('feedback.filter.allRegions') },
                ...scopedRegions.map((region) => ({ value: region.id, label: region.name })),
                ...(isSuperAdmin
                  ? [{ value: ORPHAN_REGION, label: t('feedback.filter.orphans') }]
                  : []),
              ]}
            />
          </FilterField>
        )}
        <FilterField label={t('feedback.filter.date')} icon={<CalendarIcon />}>
          <DateRange
            value={params.dateRange ?? EMPTY_DATE_RANGE}
            onChange={(dateRange) => patch({ dateRange })}
            ariaLabel={t('feedback.filter.date')}
            allLabel={t('feedback.filter.dateAll')}
            last7Label={t('feedback.filter.date7d')}
            last30Label={t('feedback.filter.date30d')}
            last90Label={t('feedback.filter.date90d')}
            customLabel={t('feedback.filter.dateCustom')}
            fromLabel={t('feedback.filter.dateFrom')}
            toLabel={t('feedback.filter.dateTo')}
            testId="feedback-date-range"
          />
        </FilterField>
      </Toolbar>

      <DataTable<Feedback>
        columns={columns}
        data={items}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(item) => item.id}
        onRowClick={openDetail}
        actionsLabel={t('common.actions')}
        sort={sortKey ? { key: sortKey, dir: (params.sortDir ?? 'desc') as SortDir } : undefined}
        onSortChange={onSortChange}
        emptyState={
          hasActiveFilters ? (
            <EmptyState
              icon={<InboxIcon />}
              title={t('feedback.state.filteredTitle')}
              description={t('feedback.state.filteredDesc')}
              action={
                <Button variant="secondary" onClick={() => setParams(INITIAL)}>
                  {t('common.clearFilters')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<InboxIcon />}
              title={t('feedback.state.emptyTitle')}
              description={t('feedback.state.emptyDesc')}
            />
          )
        }
        rowActions={(item) => <FeedbackRowActions feedback={item} onView={openDetail} />}
      />

      <Pagination
        page={data?.page ?? 1}
        pageCount={data?.pageCount ?? 1}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
      />
    </PageContainer>
  );
}
