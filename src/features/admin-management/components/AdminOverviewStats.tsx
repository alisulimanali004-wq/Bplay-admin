import { useTranslation } from 'react-i18next';
import { StatCard, UsersIcon, PowerIcon, MapPinIcon, AlertTriangleIcon } from '@ui';
import type { AdminStats } from '../api/admin.types';
import styles from './AdminOverviewStats.module.css';

interface Props {
  stats?: AdminStats;
}

/** The KPI row on the admins list: total, active, region admins, unassigned. */
export function AdminOverviewStats({ stats }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} data-testid="admin-stats-overview">
      <StatCard
        label={t('admin.stats.total')}
        value={stats?.total ?? 0}
        icon={<UsersIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('admin.stats.active')}
        value={stats?.active ?? 0}
        icon={<PowerIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('admin.stats.regional')}
        value={stats?.regional ?? 0}
        icon={<MapPinIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={t('admin.stats.unassigned')}
        value={stats?.unassigned ?? 0}
        icon={<AlertTriangleIcon />}
        accent="warning"
        countUp
      />
    </div>
  );
}
