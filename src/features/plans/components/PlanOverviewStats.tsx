import { useTranslation } from 'react-i18next';
import { LayersIcon, PowerIcon, StatCard, UsersIcon, WalletIcon } from '@ui';
import type { PlanStats } from '../api/plan.types';
import styles from './planOverviewStats.module.css';

interface Props {
  stats?: PlanStats;
}

/** Catalog KPI row — counts the whole catalog, not the filtered page. */
export function PlanOverviewStats({ stats }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} data-testid="plan-stats-overview">
      <StatCard
        label={t('plan.stats.total')}
        value={stats?.total ?? 0}
        icon={<LayersIcon />}
        countUp
      />
      <StatCard
        label={t('plan.stats.active')}
        value={stats?.active ?? 0}
        icon={<PowerIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={t('plan.stats.paid')}
        value={stats?.paid ?? 0}
        icon={<WalletIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('plan.stats.subscribers')}
        value={stats?.subscribers ?? 0}
        icon={<UsersIcon />}
        accent="warning"
        countUp
      />
    </div>
  );
}
