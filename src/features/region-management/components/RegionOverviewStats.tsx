import { useTranslation } from 'react-i18next';
import { StatCard, GlobeIcon, PowerIcon, AlertTriangleIcon, BuildingIcon } from '@ui';
import type { RegionStats } from '../api/region.types';
import styles from './RegionOverviewStats.module.css';

interface Props {
  stats?: RegionStats;
  /** Total facilities across all regions (summed from the per-region counts). */
  facilities: number;
}

/** The KPI row on the regions list: total, active, without-admin, facilities. */
export function RegionOverviewStats({ stats, facilities }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} data-testid="region-stats">
      <StatCard
        label={t('region.stats.total')}
        value={stats?.total ?? 0}
        icon={<GlobeIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('region.stats.active')}
        value={stats?.active ?? 0}
        icon={<PowerIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('region.stats.unassigned')}
        value={stats?.unassigned ?? 0}
        icon={<AlertTriangleIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={t('region.stats.facilities')}
        value={facilities}
        icon={<BuildingIcon />}
        accent="secondary"
        countUp
      />
    </div>
  );
}
