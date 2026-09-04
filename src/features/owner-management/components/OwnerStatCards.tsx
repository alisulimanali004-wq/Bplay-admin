import { useTranslation } from 'react-i18next';
import { StatCard, UsersIcon, ClockIcon, PowerIcon, BanIcon } from '@ui';
import type { OwnerStats } from '../api/owner.types';
import styles from './ownerStats.module.css';

interface Props {
  stats?: OwnerStats;
}

/** The KPI row on the owners list: total, pending verification, active, blocked. */
export function OwnerStatCards({ stats }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} data-testid="owner-stats">
      <StatCard
        label={t('owner.stats.total')}
        value={stats?.total ?? 0}
        icon={<UsersIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('owner.stats.pending')}
        value={stats?.underReview ?? 0}
        icon={<ClockIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={t('owner.stats.active')}
        value={stats?.active ?? 0}
        icon={<PowerIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('owner.stats.blocked')}
        value={stats?.blocked ?? 0}
        icon={<BanIcon />}
        accent="secondary"
        countUp
      />
    </div>
  );
}
