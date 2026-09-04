import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BellIcon,
  Button,
  CalendarIcon,
  CheckIcon,
  ClearFiltersBar,
  DataTable,
  DateRange,
  EMPTY_DATE_RANGE,
  EmptyState,
  FilterField,
  GlobeIcon,
  InboxIcon,
  LayersIcon,
  PageContainer,
  PageHeader,
  Pagination,
  SearchIcon,
  SearchInput,
  Select,
  Tabs,
  Toolbar,
  isDateRangeActive,
  type SortDir,
} from '@ui';
import { useNotificationsQuery, useNotificationStats } from '../hooks/useNotificationsQuery';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '../hooks/useNotificationMutations';
import { useAdminScope } from '../hooks/useAdminScope';
import { useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import { NotificationStatCards } from '../components/NotificationStatCards';
import { NotificationRowActions } from '../components/NotificationRowActions';
import { NotificationPreferences } from '../components/NotificationPreferences';
import { ScopeBanner } from '../components/ScopeBanner';
import { SORT_BY_COLUMN, useNotificationColumns } from '../components/useNotificationColumns';
import { PLATFORM_SCOPE } from '../api/notification.filter';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
  type Notification,
  type NotificationListParams,
} from '../api/notification.types';

const INITIAL: NotificationListParams = {
  q: '',
  type: 'all',
  category: 'all',
  readState: 'all',
  regionId: 'all',
  dateRange: EMPTY_DATE_RANGE,
  sortBy: 'createdAt',
  sortDir: 'desc',
  page: 1,
};

type TabKey = 'inbox' | 'preferences';

/**
 * The admin notification centre (SRS module 14 branch ج, FR-ADM-SET-006/008).
 *
 * Two tabs rather than two routes: delivery preferences are a setting ABOUT this
 * inbox, not a separate destination, and the SRS files both under one module.
 */
export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('inbox');
  const [params, setParams] = useState<NotificationListParams>(INITIAL);

  const { data, isLoading, isError, refetch } = useNotificationsQuery(params);
  const { data: stats } = useNotificationStats();
  const { isSuperAdmin, assignedRegionIds } = useAdminScope();
  const regionsQuery = useScopeRegionsQuery();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.items ?? [];
  const unread = stats?.unread ?? 0;

  /**
   * Opening a notification marks it read and follows its deep link — the two
   * halves of FR-ADM-SET-006. A notification with no resolvable subject is still
   * marked read; it just has nowhere to go, and pretending otherwise would send
   * the admin to the wrong record.
   */
  const openNotification = (notification: Notification) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    if (notification.link) navigate(notification.link);
  };

  const patch = (next: Partial<NotificationListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: 1 }));

  const hasActiveFilters =
    (params.q ?? '') !== '' ||
    (params.type ?? 'all') !== 'all' ||
    (params.category ?? 'all') !== 'all' ||
    (params.readState ?? 'all') !== 'all' ||
    (params.regionId ?? 'all') !== 'all' ||
    isDateRangeActive(params.dateRange ?? EMPTY_DATE_RANGE);

  // Only offer the regions this admin can actually see; the platform bucket is
  // offered to everyone because everyone can receive platform-level notices.
  const scopedRegions = (regionsQuery.data ?? []).filter(
    (region) =>
      !assignedRegionIds || assignedRegionIds.length === 0 || assignedRegionIds.includes(region.id),
  );
  const showRegionFilter = isSuperAdmin || scopedRegions.length > 1;

  const columns = useNotificationColumns({ onOpen: openNotification, showRegion: showRegionFilter });

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
      <PageHeader
        title={t('notification.title')}
        subtitle={t('notification.subtitle')}
        actions={
          tab === 'inbox' && unread > 0 ? (
            <Button
              variant="secondary"
              leftIcon={<CheckIcon />}
              isLoading={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              data-testid="notification-mark-all-read"
            >
              {t('notification.actions.markAllRead')}
            </Button>
          ) : undefined
        }
      />

      <Tabs
        items={[
          { key: 'inbox', label: t('notification.tab.inbox'), badge: unread || undefined },
          { key: 'preferences', label: t('notification.tab.preferences') },
        ]}
        value={tab}
        onChange={(key) => setTab(key as TabKey)}
        aria-label={t('notification.title')}
      />

      {tab === 'preferences' ? (
        <NotificationPreferences />
      ) : (
        <>
          <ScopeBanner />

          <NotificationStatCards stats={stats} />

          <Toolbar
            end={
              hasActiveFilters ? (
                <ClearFiltersBar
                  count={data?.total ?? 0}
                  onClear={() => setParams(INITIAL)}
                  testId="notification-clear-filters"
                />
              ) : null
            }
          >
            <FilterField label={t('common.search')} icon={<SearchIcon />}>
              <SearchInput
                value={params.q ?? ''}
                onChange={(q) => patch({ q })}
                placeholder={t('notification.search')}
              />
            </FilterField>
            <FilterField label={t('notification.col.type')} icon={<BellIcon />}>
              <Select
                aria-label={t('notification.col.type')}
                value={params.type ?? 'all'}
                onChange={(value) => patch({ type: value as NotificationListParams['type'] })}
                options={[
                  { value: 'all', label: t('notification.filter.allTypes') },
                  ...NOTIFICATION_TYPES.map((type) => ({
                    value: type,
                    label: t(`notification.type.${type}`),
                  })),
                ]}
              />
            </FilterField>
            <FilterField label={t('notification.col.category')} icon={<LayersIcon />}>
              <Select
                aria-label={t('notification.col.category')}
                value={params.category ?? 'all'}
                onChange={(value) =>
                  patch({ category: value as NotificationListParams['category'] })
                }
                options={[
                  { value: 'all', label: t('notification.filter.allCategories') },
                  ...NOTIFICATION_CATEGORIES.map((category) => ({
                    value: category,
                    label: t(`notification.category.${category}`),
                  })),
                ]}
              />
            </FilterField>
            <FilterField label={t('notification.filter.readState')} icon={<CheckIcon />}>
              <Select
                aria-label={t('notification.filter.readState')}
                value={params.readState ?? 'all'}
                onChange={(value) =>
                  patch({ readState: value as NotificationListParams['readState'] })
                }
                options={[
                  { value: 'all', label: t('notification.filter.allStates') },
                  { value: 'unread', label: t('notification.state.unread') },
                  { value: 'read', label: t('notification.state.read') },
                ]}
              />
            </FilterField>
            {showRegionFilter && (
              <FilterField label={t('notification.col.region')} icon={<GlobeIcon />}>
                <Select
                  aria-label={t('notification.col.region')}
                  value={params.regionId ?? 'all'}
                  onChange={(value) => patch({ regionId: value })}
                  options={[
                    { value: 'all', label: t('notification.filter.allRegions') },
                    ...scopedRegions.map((region) => ({ value: region.id, label: region.name })),
                    { value: PLATFORM_SCOPE, label: t('notification.filter.platform') },
                  ]}
                />
              </FilterField>
            )}
            <FilterField label={t('notification.filter.date')} icon={<CalendarIcon />}>
              <DateRange
                value={params.dateRange ?? EMPTY_DATE_RANGE}
                onChange={(dateRange) => patch({ dateRange })}
                ariaLabel={t('notification.filter.date')}
                allLabel={t('notification.filter.dateAll')}
                last7Label={t('notification.filter.date7d')}
                last30Label={t('notification.filter.date30d')}
                last90Label={t('notification.filter.date90d')}
                customLabel={t('notification.filter.dateCustom')}
                fromLabel={t('notification.filter.dateFrom')}
                toLabel={t('notification.filter.dateTo')}
                testId="notification-date-range"
              />
            </FilterField>
          </Toolbar>

          <DataTable<Notification>
            columns={columns}
            data={items}
            isLoading={isLoading}
            error={isError ? t('common.loadError') : undefined}
            onRetry={() => void refetch()}
            getRowId={(item) => item.id}
            onRowClick={openNotification}
            actionsLabel={t('common.actions')}
            sort={
              sortKey ? { key: sortKey, dir: (params.sortDir ?? 'desc') as SortDir } : undefined
            }
            onSortChange={onSortChange}
            emptyState={
              hasActiveFilters ? (
                <EmptyState
                  icon={<InboxIcon />}
                  title={t('notification.state.filteredTitle')}
                  description={t('notification.state.filteredDesc')}
                  action={
                    <Button variant="secondary" onClick={() => setParams(INITIAL)}>
                      {t('common.clearFilters')}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<BellIcon />}
                  title={t('notification.state.emptyTitle')}
                  description={t('notification.state.emptyDesc')}
                />
              )
            }
            rowActions={(item) => (
              <NotificationRowActions
                notification={item}
                onOpen={openNotification}
                onMarkRead={(row) => markRead.mutate(row.id)}
                // Scoped to THIS row: `markRead` is one shared mutation instance,
                // so a bare `isPending` would grey out every row's button while
                // any single one is in flight.
                isMarking={markRead.isPending && markRead.variables === item.id}
              />
            )}
          />

          <Pagination
            page={data?.page ?? 1}
            pageCount={data?.pageCount ?? 1}
            onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
          />
        </>
      )}
    </PageContainer>
  );
}
