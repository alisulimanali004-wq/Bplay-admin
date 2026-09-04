import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StatCard,
  CreditCardIcon,
  CheckIcon,
  ClockIcon,
  AlertTriangleIcon,
  BanIcon,
  BuildingIcon,
} from '@ui';
import type { MembershipStats } from '../api';
import styles from './MembershipStatCards.module.css';

export interface MembershipStatCardsProps {
  stats?: MembershipStats;
}

/** The KPI row: total / active / near-expiry / churn-risk / expired / revenue. */
export function MembershipStatCards({ stats }: MembershipStatCardsProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  // Compact notation ("38.23M") keeps big SYP sums short; the currency lives in the
  // label so the tile never wraps a number mid-digit. Normalise Intl's non-breaking
  // space (U+00A0 / U+202F) so the tile can wrap at the word boundary if needed.
  const revenue = useMemo(
    () =>
      stats
        ? new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 })
            .format(stats.revenueSyp)
            .replace(/[  ]/g, ' ')
        : '—',
    [stats, locale],
  );

  return (
    <div className={styles.grid} data-testid="membership-stats">
      <StatCard
        label={t('membership.stats.total')}
        value={stats?.total ?? 0}
        icon={<CreditCardIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('membership.stats.active')}
        value={stats?.active ?? 0}
        icon={<CheckIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('membership.stats.nearExpiry')}
        value={stats?.nearExpiry ?? 0}
        icon={<ClockIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={t('membership.stats.churnRisk')}
        value={stats?.churnRisk ?? 0}
        icon={<AlertTriangleIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={t('membership.stats.expired')}
        value={stats?.expired ?? 0}
        icon={<BanIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={`${t('membership.stats.revenue')} · ${t('membership.currency')}`}
        value={revenue}
        icon={<BuildingIcon />}
        accent="secondary"
      />
    </div>
  );
}
