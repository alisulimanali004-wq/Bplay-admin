import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DownloadIcon,
  EmptyState,
  InboxIcon,
  PageContainer,
  PageHeader,
  Pagination,
  EMPTY_DATE_RANGE,
  type SortDir,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { useBookingsQuery } from '../hooks/useBookingsQuery';
import { useBookingStatsQuery } from '../hooks/useBookingStatsQuery';
import { useExportBookings } from '../hooks/useExportBookings';
import { BookingStatCards } from '../components/BookingStatCards';
import { BookingFiltersBar } from '../components/BookingFiltersBar';
import { BookingRowActions } from '../components/BookingRowActions';
import { useBookingColumns } from '../components/useBookingColumns';
import type { BookingListItem, BookingListParams, BookingSortBy } from '../api/booking.types';
import styles from './BookingManagementPage.module.css';

/** Column key ⇄ domain sort field. */
const SORT_BY_COLUMN: Record<string, BookingSortBy> = {
  reference: 'reference',
  dateTime: 'date',
  total: 'totalSyp',
};
const COLUMN_BY_SORT = Object.fromEntries(
  Object.entries(SORT_BY_COLUMN).map(([column, sortBy]) => [sortBy, column]),
) as Record<BookingSortBy, string>;

const INITIAL: BookingListParams = {
  q: '',
  status: 'all',
  paymentStatus: 'all',
  facilityId: 'all',
  sport: 'all',
  source: 'all',
  regionId: 'all',
  dateRange: EMPTY_DATE_RANGE,
  sortBy: 'date',
  sortDir: 'desc',
  page: 1,
};

/**
 * Booking oversight (super-admin, STRICTLY READ-ONLY): a KPI header, filters and
 * a sortable directory of every scoped booking. The only write-side action is
 * exporting the current view to `.xlsx` — there are no mutations.
 */
export default function BookingManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useState<BookingListParams>(INITIAL);

  const statsQuery = useBookingStatsQuery();
  const listQuery = useBookingsQuery(params);
  const exportMutation = useExportBookings();

  const openDetail = useCallback(
    (item: BookingListItem) => navigate(`${PATHS.bookingManagement}/${item.id}`),
    [navigate],
  );
  const openPlayer = useCallback(
    (playerId: string) => navigate(`${PATHS.playerManagement}/${playerId}`),
    [navigate],
  );
  const columns = useBookingColumns({ onPlayerClick: openPlayer });

  const patch = (next: Partial<BookingListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: 1 }));

  const onSort = (columnKey: string) => {
    const sortBy = SORT_BY_COLUMN[columnKey];
    if (!sortBy) return;
    setParams((prev) => {
      const sortDir: SortDir = prev.sortBy === sortBy && prev.sortDir === 'asc' ? 'desc' : 'asc';
      return { ...prev, sortBy, sortDir, page: 1 };
    });
  };

  const sort = useMemo(
    () =>
      params.sortBy
        ? { key: COLUMN_BY_SORT[params.sortBy], dir: params.sortDir ?? 'asc' }
        : undefined,
    [params.sortBy, params.sortDir],
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('booking.title')}
        subtitle={t('booking.subtitle')}
        actions={
          <Button
            variant="secondary"
            leftIcon={<DownloadIcon />}
            isLoading={exportMutation.isPending}
            onClick={() => exportMutation.mutate(params)}
            data-testid="booking-export"
          >
            {t('common.export')}
          </Button>
        }
      />

      <BookingStatCards stats={statsQuery.data} />

      <section className={styles.panel}>
        <BookingFiltersBar params={params} onChange={patch} />

        <DataTable<BookingListItem>
          columns={columns}
          data={listQuery.data?.items ?? []}
          isLoading={listQuery.isLoading}
          error={listQuery.isError ? t('common.loadError') : undefined}
          onRetry={() => void listQuery.refetch()}
          getRowId={(item) => item.id}
          onRowClick={openDetail}
          sort={sort}
          onSortChange={onSort}
          actionsLabel={t('common.actions')}
          emptyState={
            <EmptyState
              icon={<InboxIcon />}
              title={t('booking.empty.title')}
              description={t('booking.empty.desc')}
            />
          }
          rowActions={(item) => <BookingRowActions item={item} onView={openDetail} />}
        />

        <Pagination
          page={listQuery.data?.page ?? 1}
          pageCount={listQuery.data?.pageCount ?? 1}
          onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
        />
      </section>
    </PageContainer>
  );
}
