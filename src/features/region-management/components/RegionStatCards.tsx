import { useTranslation } from 'react-i18next';
import { StatCard, BuildingIcon, MapPinIcon, UsersIcon, StarIcon } from '@ui';
import type { RegionFacility } from '@features/facility-management/api';
import type { Region } from '../api/region.types';
import styles from './RegionStatCards.module.css';

interface Props {
  region: Region;
  facilities: RegionFacility[];
}

/**
 * The KPI row for a region: total facilities, managing admins, summed monthly
 * revenue (pre-formatted per locale) and the mean rating across facilities that
 * carry one. The active/pending split lives in the "Facilities by status"
 * breakdown below — kept out of here to avoid duplicating those counts.
 */
export function RegionStatCards({ region, facilities }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  const total = facilities.length;
  const adminCount = region.assignedAdminIds.length;

  // `revenueSyp` is optional: the live facility endpoint does not compute it, so
  // it is absent outside mocks. Coerced to 0 per facility rather than letting one
  // undefined turn the whole sum into NaN.
  const revenue = facilities.reduce((sum, facility) => sum + (facility.statistics.revenueSyp ?? 0), 0);
  // Compact notation ("14.25M") keeps big SYP sums short; the currency lives in
  // the label so the tile never wraps a currency word mid-line. Intl inserts a
  // non-breaking space before the compact word ("14.25M" / "١٤٫٢٥ مليون") —
  // normalise it (U+00A0 / U+202F) to a plain space so the tile can wrap at the
  // word boundary rather than splitting the word.
  const revenueValue = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 2,
  })
    .format(revenue)
    .replace(/[  ]/g, ' ');

  const rated = facilities.filter(
    (facility): facility is RegionFacility & { rating: number } => typeof facility.rating === 'number',
  );
  const ratingLabel =
    rated.length > 0
      ? (rated.reduce((sum, facility) => sum + facility.rating, 0) / rated.length).toFixed(1)
      : '—';

  return (
    <div className={styles.grid} data-testid="region-detail-stats">
      <StatCard
        label={t('region.detail.stats.facilities')}
        value={total}
        icon={<BuildingIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('region.detail.stats.admins')}
        value={adminCount}
        icon={<UsersIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={`${t('region.detail.stats.revenue')} · ${t('region.detail.currency')}`}
        value={revenueValue}
        icon={<MapPinIcon />}
        accent="secondary"
      />
      <StatCard
        label={t('region.detail.stats.rating')}
        value={ratingLabel}
        icon={<StarIcon />}
        accent="warning"
      />
    </div>
  );
}
