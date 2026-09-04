import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PageContainer,
  PageHeader,
  Toolbar,
  SearchInput,
  Select,
  FilterField,
  DataTable,
  Pagination,
  Button,
  ClearFiltersBar,
  EmptyState,
  DateRange,
  DownloadIcon,
  InboxIcon,
  SearchIcon,
  PowerIcon,
  BuildingIcon,
  CreditCardIcon,
  StarIcon,
  MapPinIcon,
  CalendarIcon,
  EMPTY_DATE_RANGE,
  isDateRangeActive,
  type DateRangeValue,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { useMembershipsQuery } from '../hooks/useMembershipsQuery';
import { useMembershipStatsQuery } from '../hooks/useMembershipStatsQuery';
import { useClubsForPicker } from '../hooks/useClubsForPicker';
import { useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import { useAdminScope } from '../hooks/useAdminScope';
import { useExportMemberships } from '../hooks/useExportMemberships';
import { MembershipStatCards } from '../components/MembershipStatCards';
import { MembershipRowActions } from '../components/MembershipRowActions';
import { SORT_BY_COLUMN, useMembershipColumns } from '../components/useMembershipColumns';
import {
  MEMBERSHIP_STATUSES,
  MEMBER_SEGMENTS,
  PLAN_CATALOG,
  type MembershipListItem,
  type MembershipListParams,
} from '../api';

const INITIAL: MembershipListParams = {
  q: '',
  status: 'all',
  clubId: 'all',
  planName: 'all',
  segment: 'all',
  regionId: 'all',
  dateRange: EMPTY_DATE_RANGE,
  page: 1,
};

export default function ClubSubscriptionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isSuperAdmin, assignedRegionIds } = useAdminScope();
  const [params, setParams] = useState<MembershipListParams>(INITIAL);

  const { data, isLoading, isError, refetch } = useMembershipsQuery(params);
  const { data: stats } = useMembershipStatsQuery();
  const { data: clubs } = useClubsForPicker();
  const { data: regions } = useScopeRegionsQuery();
  const exportMemberships = useExportMemberships();

  const openDetail = (membership: MembershipListItem) =>
    navigate(`${PATHS.clubSubscriptions}/${membership.id}`);
  const openPlayer = (playerId: string) => navigate(`${PATHS.playerManagement}/${playerId}`);
  const openClub = (clubId: string) => navigate(`${PATHS.facilityManagement}/${clubId}`);

  const patch = (next: Partial<MembershipListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: 1 }));

  const columns = useMembershipColumns({ onPlayerClick: openPlayer, onClubClick: openClub });

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

  const activeSortColumn = Object.keys(SORT_BY_COLUMN).find(
    (key) => SORT_BY_COLUMN[key] === params.sortBy,
  );
  const sort =
    activeSortColumn && params.sortDir
      ? { key: activeSortColumn, dir: params.sortDir }
      : undefined;

  // A regional admin only filters by their own regions; a super-admin (or a
  // general-oversight admin with no assigned regions) sees them all.
  const scopedRegions = (regions ?? []).filter(
    (region) =>
      !assignedRegionIds || assignedRegionIds.length === 0 || assignedRegionIds.includes(region.id),
  );

  const dateRange = params.dateRange ?? EMPTY_DATE_RANGE;
  const hasActiveFilters =
    (params.q ?? '') !== '' ||
    (params.status ?? 'all') !== 'all' ||
    (params.clubId ?? 'all') !== 'all' ||
    (params.planName ?? 'all') !== 'all' ||
    (params.segment ?? 'all') !== 'all' ||
    (params.regionId ?? 'all') !== 'all' ||
    isDateRangeActive(dateRange);

  return (
    <PageContainer>
      <PageHeader
        title={t('membership.title')}
        subtitle={t('membership.subtitle')}
        actions={
          <Button
            variant="secondary"
            leftIcon={<DownloadIcon />}
            isLoading={exportMemberships.isPending}
            onClick={() => exportMemberships.mutate(params)}
            data-testid="membership-export"
          >
            {t('common.export')}
          </Button>
        }
      />

      <MembershipStatCards stats={stats} />

      <Toolbar
        end={
          hasActiveFilters ? (
            <ClearFiltersBar
              count={data?.total ?? 0}
              onClear={() => setParams(INITIAL)}
              testId="membership-clear-filters"
            />
          ) : null
        }
      >
        <FilterField label={t('common.search')} icon={<SearchIcon />}>
          <SearchInput
            value={params.q ?? ''}
            onChange={(q) => patch({ q })}
            placeholder={t('membership.search')}
          />
        </FilterField>
        <FilterField label={t('membership.col.status')} icon={<PowerIcon />}>
          <Select
            aria-label={t('membership.col.status')}
            value={params.status ?? 'all'}
            onChange={(value) => patch({ status: value as MembershipListParams['status'] })}
            options={[
              { value: 'all', label: t('membership.filters.allStatus') },
              ...MEMBERSHIP_STATUSES.map((status) => ({
                value: status,
                label: t(`membership.status.${status}`),
              })),
            ]}
          />
        </FilterField>
        <FilterField label={t('membership.col.club')} icon={<BuildingIcon />}>
          <Select
            aria-label={t('membership.col.club')}
            value={params.clubId ?? 'all'}
            onChange={(value) => patch({ clubId: value })}
            options={[
              { value: 'all', label: t('membership.filters.allClubs') },
              ...(clubs ?? []).map((club) => ({ value: club.id, label: club.name })),
            ]}
          />
        </FilterField>
        <FilterField label={t('membership.col.plan')} icon={<CreditCardIcon />}>
          <Select
            aria-label={t('membership.col.plan')}
            value={params.planName ?? 'all'}
            onChange={(value) => patch({ planName: value })}
            options={[
              { value: 'all', label: t('membership.filters.allPlans') },
              ...PLAN_CATALOG.map((plan) => ({ value: plan.name, label: plan.name })),
            ]}
          />
        </FilterField>
        <FilterField label={t('membership.col.segments')} icon={<StarIcon />}>
          <Select
            aria-label={t('membership.col.segments')}
            value={params.segment ?? 'all'}
            onChange={(value) => patch({ segment: value as MembershipListParams['segment'] })}
            options={[
              { value: 'all', label: t('membership.filters.allSegments') },
              ...MEMBER_SEGMENTS.map((segment) => ({
                value: segment,
                label: t(`membership.segment.${segment}`),
              })),
            ]}
          />
        </FilterField>
        <FilterField label={t('membership.filters.region')} icon={<MapPinIcon />}>
          <Select
            aria-label={t('membership.filters.region')}
            value={params.regionId ?? 'all'}
            onChange={(value) => patch({ regionId: value })}
            options={[
              { value: 'all', label: t('membership.filters.allRegions') },
              ...(isSuperAdmin
                ? [{ value: 'orphans', label: t('membership.filters.orphansOption') }]
                : []),
              ...scopedRegions.map((region) => ({ value: region.name, label: region.name })),
            ]}
          />
        </FilterField>
        <FilterField label={t('membership.filters.dateStarted')} icon={<CalendarIcon />}>
          <DateRange
            value={dateRange}
            onChange={(value: DateRangeValue) => patch({ dateRange: value })}
            ariaLabel={t('membership.filters.dateStarted')}
            allLabel={t('membership.filters.dateAll')}
            last7Label={t('membership.filters.date7')}
            last30Label={t('membership.filters.date30')}
            last90Label={t('membership.filters.date90')}
            customLabel={t('membership.filters.dateCustom')}
            fromLabel={t('membership.filters.dateFrom')}
            toLabel={t('membership.filters.dateTo')}
            testId="membership-date-range"
          />
        </FilterField>
      </Toolbar>

      <DataTable<MembershipListItem>
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(item) => item.id}
        onRowClick={openDetail}
        sort={sort}
        onSortChange={onSortChange}
        actionsLabel={t('common.actions')}
        emptyState={
          <EmptyState
            icon={<InboxIcon />}
            title={t('membership.empty.title')}
            description={t('membership.empty.desc')}
          />
        }
        rowActions={(item) => <MembershipRowActions membership={item} onView={openDetail} />}
      />

      <Pagination
        page={data?.page ?? 1}
        pageCount={data?.pageCount ?? 1}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
      />
    </PageContainer>
  );
}
