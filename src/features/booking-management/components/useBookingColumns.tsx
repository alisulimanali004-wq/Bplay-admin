import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BuildingIcon, RegionTag, StadiumIcon, type Column } from '@ui';
import { BookingStatusBadge } from './BookingStatusBadge';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { BookingPartyCell } from './BookingPartyCell';
import type { BookingListItem } from '../api/booking.types';
import styles from './useBookingColumns.module.css';

export interface UseBookingColumnsOptions {
  /** Open a registered player's profile (the party cell stops row-click propagation). */
  onPlayerClick: (playerId: string) => void;
}

/**
 * The directory table's columns: reference (+ created sub-line), party, facility
 * (+ court sub-line + kind glyph), sport, region, date/time, status, payment and
 * an end-aligned total. Reference / date / total are sortable.
 */
export function useBookingColumns({
  onPlayerClick,
}: UseBookingColumnsOptions): Column<BookingListItem>[] {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return useMemo<Column<BookingListItem>[]>(
    () => [
      {
        key: 'reference',
        header: t('booking.col.reference'),
        sortable: true,
        render: (item) => (
          <span className={styles.stack}>
            <span className={styles.code} dir="ltr">
              {item.reference}
            </span>
            <span className={styles.sub}>
              {new Date(item.createdAt).toLocaleDateString(locale, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </span>
        ),
      },
      {
        key: 'party',
        header: t('booking.col.party'),
        render: (item) => <BookingPartyCell item={item} onPlayerClick={onPlayerClick} />,
      },
      {
        key: 'facility',
        header: t('booking.col.facility'),
        render: (item) => (
          <span className={styles.facility}>
            <span className={styles.kindGlyph} aria-hidden>
              {item.facilityKind === 'club' ? <BuildingIcon /> : <StadiumIcon />}
            </span>
            <span className={styles.stack}>
              <span className={styles.name}>{item.facilityName}</span>
              {item.courtName && <span className={styles.sub}>{item.courtName}</span>}
            </span>
          </span>
        ),
      },
      {
        key: 'sport',
        header: t('booking.col.sport'),
        render: (item) => t(`booking.sport.${item.sport}`),
      },
      {
        key: 'region',
        header: t('booking.col.region'),
        render: (item) => (
          <RegionTag regionNames={item.regionNames} isOrphan={item.isOrphan} compact />
        ),
      },
      {
        key: 'dateTime',
        header: t('booking.col.dateTime'),
        sortable: true,
        render: (item) => (
          <span className={styles.stack}>
            <span>
              {new Date(item.date).toLocaleDateString(locale, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className={styles.sub} dir="ltr">
              {item.startTime}–{item.endTime}
            </span>
          </span>
        ),
      },
      {
        key: 'status',
        header: t('booking.col.status'),
        render: (item) => <BookingStatusBadge status={item.status} />,
      },
      {
        key: 'payment',
        header: t('booking.col.payment'),
        render: (item) => <PaymentStatusBadge status={item.paymentStatus} />,
      },
      {
        key: 'total',
        header: t('booking.col.total'),
        align: 'end',
        sortable: true,
        render: (item) => (
          <span className={styles.total}>
            {nf.format(item.totalSyp)} {t('booking.currency')}
          </span>
        ),
      },
    ],
    [t, locale, nf, onPlayerClick],
  );
}
