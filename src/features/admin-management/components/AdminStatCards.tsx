import { useTranslation } from 'react-i18next';
import { StatCard, GlobeIcon, BuildingIcon, StadiumIcon } from '@ui';
import type { RegionFacility } from '@features/facility-management/api';
import styles from './AdminStatCards.module.css';

interface Props {
  regionCount: number;
  facilities: RegionFacility[];
}

/**
 * The KPI row for a regional admin: regions managed, facilities across those
 * regions, and the active / pending facility split.
 */
export function AdminStatCards({ regionCount, facilities }: Props) {
  const { t } = useTranslation();
  const total = facilities.length;
  const activeCount = facilities.filter((facility) => facility.status === 'active').length;
  const pendingCount = facilities.filter((facility) => facility.status === 'pending').length;

  return (
    <div className={styles.grid} data-testid="admin-detail-stats">
      <StatCard
        label={t('admin.detail.stats.regions')}
        value={regionCount}
        icon={<GlobeIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('admin.detail.stats.facilities')}
        value={total}
        icon={<BuildingIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('admin.detail.stats.activeFacilities')}
        value={activeCount}
        icon={<StadiumIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={t('admin.detail.stats.pendingFacilities')}
        value={pendingCount}
        icon={<StadiumIcon />}
        accent="warning"
        countUp
      />
    </div>
  );
}
