import { useTranslation } from 'react-i18next';
import {
  StatCard,
  BuildingIcon,
  CheckIcon,
  ClockIcon,
  BanIcon,
  StarIcon,
  AlertTriangleIcon,
} from '@ui';
import type { FacilityStats } from '../api/facility.types';
import styles from './facilityStats.module.css';

interface Props {
  stats?: FacilityStats;
}

/** The KPI row on the facilities directory: total / active / pending / suspended / rating / aged. */
export function FacilityStatCards({ stats }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} data-testid="facility-stats">
      <StatCard
        label={t('facility.stats.total')}
        value={stats?.total ?? 0}
        icon={<BuildingIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('facility.stats.active')}
        value={stats?.active ?? 0}
        icon={<CheckIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('facility.stats.pending')}
        value={stats?.pending ?? 0}
        icon={<ClockIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={t('facility.stats.suspended')}
        value={stats?.suspended ?? 0}
        icon={<BanIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={t('facility.stats.rating')}
        value={stats ? stats.avgRating.toFixed(1) : '—'}
        icon={<StarIcon />}
        accent="primary"
      />
      <StatCard
        label={t('facility.stats.aged')}
        value={stats?.aged ?? 0}
        icon={<AlertTriangleIcon />}
        accent="warning"
        countUp
      />
    </div>
  );
}
