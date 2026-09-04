import { useTranslation } from 'react-i18next';
import { Badge, BuildingIcon, CheckIcon, GlobeIcon } from '@ui';
import type { CancelPolicy, PitchSpecs } from '../api/facility.types';
import styles from './PitchSpecsGrid.module.css';

export interface PitchSpecsGridProps {
  specs: PitchSpecs;
  pricePerHour: number;
  capacity?: number;
  cancelPolicy: CancelPolicy;
}

/**
 * A pitch's fact sheet: surface + amenity chips, the hourly price, optional
 * capacity, and the cancellation policy lines. Used on the profile overview
 * and as the pitch's "own single court" card.
 */
export function PitchSpecsGrid({ specs, pricePerHour, capacity, cancelPolicy }: PitchSpecsGridProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid}>
      <div className={styles.chips}>
        <Badge variant="info" size="sm">
          {t(`facility.surface.${specs.surface}`)}
        </Badge>
        <span className={styles.chip}>
          {specs.isIndoor ? <BuildingIcon /> : <GlobeIcon />}
          {t(specs.isIndoor ? 'facility.profile.indoor' : 'facility.profile.outdoor')}
        </span>
        {specs.hasLighting && (
          <span className={styles.chip}>
            <CheckIcon />
            {t('facility.profile.lighting')}
          </span>
        )}
        {specs.hasParking && (
          <span className={styles.chip}>
            <CheckIcon />
            {t('facility.profile.parking')}
          </span>
        )}
        {specs.hasLockerRoom && (
          <span className={styles.chip}>
            <CheckIcon />
            {t('facility.profile.lockerRoom')}
          </span>
        )}
        {specs.hasCafe && (
          <span className={styles.chip}>
            <CheckIcon />
            {t('facility.profile.cafe')}
          </span>
        )}
      </div>

      <dl className={styles.lines}>
        <div className={styles.line}>
          <dt className={styles.term}>{t('facility.profile.pricePerHour')}</dt>
          <dd className={styles.value}>
            {pricePerHour.toLocaleString()} {t('facility.profile.stats.currency')}
          </dd>
        </div>
        {typeof capacity === 'number' && (
          <div className={styles.line}>
            <dt className={styles.term}>{t('facility.profile.capacity')}</dt>
            <dd className={styles.value}>{capacity}</dd>
          </div>
        )}
      </dl>

      <div className={styles.policy}>
        <span className={styles.policyTitle}>{t('facility.profile.cancelPolicy')}</span>
        <span className={styles.policyLine}>
          {t('facility.profile.freeHours', { count: cancelPolicy.freeHoursBefore })}
        </span>
        <span className={styles.policyLine}>
          {t('facility.profile.penalty', { percent: cancelPolicy.penaltyPercent })}
        </span>
      </div>
    </div>
  );
}
