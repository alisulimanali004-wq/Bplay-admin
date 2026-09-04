import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, Badge, DataTable, EmptyState, InboxIcon, type Column } from '@ui';
import { PATHS } from '@app/router/paths';
import {
  getBookings,
  bookingStatusBadgeVariant,
  paymentStatusBadgeVariant,
  type BookingListItem,
} from '@features/booking-management/api';
import styles from './playerCards.module.css';

interface Props {
  playerId: string;
}

/** The player's booking history — facility/court, sport, date, status, payment, amount. */
export function PlayerBookingsCard({ playerId }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['player-bookings', playerId],
    queryFn: () =>
      getBookings({ playerId, page: 1, pageSize: 100, sortBy: 'date', sortDir: 'desc' }),
    select: (result) => result.items,
  });

  const columns = useMemo<Column<BookingListItem>[]>(
    () => [
      {
        key: 'facility',
        header: t('player.bookings.facility'),
        render: (b) => (
          <span className={styles.nameCell}>
            <span>{b.facilityName}</span>
            {b.courtName && <span className={styles.nameSub}>{b.courtName}</span>}
          </span>
        ),
      },
      { key: 'sport', header: t('player.bookings.sport'), render: (b) => t(`booking.sport.${b.sport}`) },
      {
        key: 'date',
        header: t('player.bookings.date'),
        render: (b) => (
          <span className={styles.nameCell}>
            <span>{new Date(b.date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className={styles.nameSub} dir="ltr">
              {b.startTime} – {b.endTime}
            </span>
          </span>
        ),
      },
      {
        key: 'amount',
        header: t('player.bookings.amount'),
        align: 'end',
        render: (b) => (
          <span className={styles.invoiceAmount}>
            {nf.format(b.totalSyp)} {t('booking.currency')}
          </span>
        ),
      },
      {
        key: 'payment',
        header: t('player.bookings.payment'),
        render: (b) => (
          <Badge variant={paymentStatusBadgeVariant(b.paymentStatus)}>
            {t(`booking.paymentStatus.${b.paymentStatus}`)}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: t('player.bookings.status'),
        render: (b) => (
          <Badge variant={bookingStatusBadgeVariant(b.status)}>{t(`booking.status.${b.status}`)}</Badge>
        ),
      },
    ],
    [t, locale, nf],
  );

  return (
    <Card padding="lg" className={styles.card} data-testid="player-bookings-card">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('player.tabs.bookings')}</h2>
      </div>
      <DataTable<BookingListItem>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(b) => b.id}
        onRowClick={(b) => navigate(`${PATHS.bookingManagement}/${b.id}`)}
        emptyState={<EmptyState icon={<InboxIcon />} title={t('player.bookings.empty')} />}
      />
    </Card>
  );
}
