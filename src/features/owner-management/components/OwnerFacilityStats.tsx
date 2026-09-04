import { useTranslation } from 'react-i18next';
import { StatCard, BuildingIcon, StadiumIcon, ClockIcon, StarIcon } from '@ui';
import type { FacilityListItem } from '@features/facility-management/api';
import styles from './ownerStats.module.css';

interface Props {
  facilities: FacilityListItem[];
}

/** The KPI row on the owner detail page, computed from the owner's facilities. */
export function OwnerFacilityStats({ facilities }: Props) {
  const { t } = useTranslation();

  const total = facilities.length;
  const active = facilities.filter((facility) => facility.status === 'active').length;
  const pending = facilities.filter((facility) => facility.status === 'pending').length;
  const rated = facilities.filter(
    (facility): facility is FacilityListItem & { rating: number } =>
      typeof facility.rating === 'number',
  );
  const rating =
    rated.length > 0
      ? (rated.reduce((sum, facility) => sum + facility.rating, 0) / rated.length).toFixed(1)
      : '—';

  return (
    <div className={styles.grid} data-testid="owner-facility-stats">
      <StatCard
        label={t('owner.detail.stats.facilities')}
        value={total}
        icon={<BuildingIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('owner.detail.stats.active')}
        value={active}
        icon={<StadiumIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('owner.detail.stats.pending')}
        value={pending}
        icon={<ClockIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={t('owner.detail.stats.rating')}
        value={rating}
        icon={<StarIcon />}
        accent="secondary"
      />
    </div>
  );
}
