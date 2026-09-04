import type { TFunction } from 'i18next';
import { exportToXlsx, type XlsxColumn } from '@shared/lib/exportXlsx';
import type { BookingListItem } from '../api/booking.types';

/**
 * Export the already-filtered, already-scoped booking rows to an `.xlsx`
 * spreadsheet with localized headers. Read-only oversight ships view + export
 * only, so this is the single write-side action the feature has.
 */
export function exportBookings(
  items: BookingListItem[],
  t: TFunction,
  locale: string,
): Promise<void> {
  const nf = new Intl.NumberFormat(locale);
  const columns: XlsxColumn<BookingListItem>[] = [
    { header: t('booking.col.reference'), value: (row) => row.reference },
    { header: t('booking.col.party'), value: (row) => row.partyName },
    { header: t('booking.col.facility'), value: (row) => row.facilityName },
    { header: t('booking.col.court'), value: (row) => row.courtName ?? '' },
    { header: t('booking.col.sport'), value: (row) => t(`booking.sport.${row.sport}`) },
    {
      header: t('booking.col.dateTime'),
      value: (row) =>
        `${new Date(row.date).toLocaleDateString(locale)} ${row.startTime}–${row.endTime}`,
    },
    { header: t('booking.col.status'), value: (row) => t(`booking.status.${row.status}`) },
    {
      header: t('booking.col.payment'),
      value: (row) => t(`booking.paymentStatus.${row.paymentStatus}`),
    },
    {
      header: `${t('booking.col.total')} (${t('booking.currency')})`,
      value: (row) => nf.format(row.totalSyp),
    },
  ];
  return exportToXlsx('bplay-bookings', t('booking.title'), columns, items);
}
