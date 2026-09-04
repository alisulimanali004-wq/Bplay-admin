import { useTranslation } from 'react-i18next';
import { Badge, BuildingIcon, CheckIcon, GlobeIcon, clsx } from '@ui';
import type { Court } from '../api/facility.types';
import styles from './CourtCard.module.css';

export interface CourtCardProps {
  court: Court;
}

/**
 * One in-club court: name + active badge, sport, formatted hourly price, and
 * surface / indoor-outdoor / lighting chips. Inactive courts render dimmed.
 */
export function CourtCard({ court }: CourtCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(styles.card, !court.isActive && styles.inactive)}
      data-testid={`court-card-${court.id}`}
    >
      <div className={styles.head}>
        <span className={styles.name}>{court.name}</span>
        <Badge variant={court.isActive ? 'success' : 'neutral'} size="sm">
          {t(court.isActive ? 'facility.profile.courtActive' : 'facility.profile.courtInactive')}
        </Badge>
      </div>

      <span className={styles.sport}>{t(`facility.sport.${court.sport}`)}</span>

      <div className={styles.price}>
        <span className={styles.priceValue}>
          {court.pricePerHour.toLocaleString()} {t('facility.profile.stats.currency')}
        </span>
        <span className={styles.priceLabel}>{t('facility.profile.pricePerHour')}</span>
      </div>

      <div className={styles.chips}>
        <Badge variant="info" size="sm">
          {t(`facility.surface.${court.surface}`)}
        </Badge>
        <span className={styles.chip}>
          {court.isIndoor ? <BuildingIcon /> : <GlobeIcon />}
          {t(court.isIndoor ? 'facility.profile.indoor' : 'facility.profile.outdoor')}
        </span>
        {court.hasLighting && (
          <span className={styles.chip}>
            <CheckIcon />
            {t('facility.profile.lighting')}
          </span>
        )}
        {typeof court.capacity === 'number' && (
          <span className={styles.chip}>
            {t('facility.profile.capacity')}: {court.capacity}
          </span>
        )}
      </div>
    </div>
  );
}
