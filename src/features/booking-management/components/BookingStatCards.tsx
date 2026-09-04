import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StatCard,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  AlertTriangleIcon,
  BuildingIcon,
} from '@ui';
import type { BookingStats } from '../api/booking.types';
import styles from './BookingStatCards.module.css';

interface Props {
  stats?: BookingStats;
}

/** The KPI row: total / under-review / confirmed / completed / attention / revenue. */
export function BookingStatCards({ stats }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  // Compact notation ("6.86M") keeps big SYP sums short; the currency lives in the
  // label so the tile never wraps a number mid-digit. Normalise Intl's non-breaking
  // space (U+00A0 / U+202F) so the tile can wrap at the word boundary if needed.
  const revenue = useMemo(
    () =>
      stats
        ? new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 })
            .format(stats.revenueSyp)
            .replace(/[  ]/g, ' ')
        : '—',
    [stats, locale],
  );

  return (
    <div className={styles.grid} data-testid="booking-stats">
      <StatCard
        label={t('booking.stats.total')}
        value={stats?.total ?? 0}
        icon={<CalendarIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('booking.stats.underReview')}
        value={stats?.underReview ?? 0}
        icon={<ClockIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={t('booking.stats.confirmed')}
        value={stats?.confirmed ?? 0}
        icon={<CheckIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('booking.stats.completed')}
        value={stats?.completed ?? 0}
        icon={<CheckIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('booking.stats.attention')}
        value={stats?.attention ?? 0}
        icon={<AlertTriangleIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={`${t('booking.stats.revenue')} · ${t('booking.currency')}`}
        value={revenue}
        icon={<BuildingIcon />}
        accent="secondary"
      />
    </div>
  );
}
