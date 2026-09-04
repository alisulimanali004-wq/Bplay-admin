import { useTranslation } from 'react-i18next';
import { GlobeIcon, MapPinIcon } from '../icons';
import { clsx } from '../clsx';
import styles from './RegionTag.module.css';

export interface RegionTagProps {
  /** Names of the active scope regions containing the entity. */
  regionNames: string[];
  /** True when no active scope region contains the entity. */
  isOrphan: boolean;
  /** Compact = first region + "+N" (directory table cells). */
  compact?: boolean;
}

/**
 * Where a scoped entity (facility, booking, subscription) lives in the region
 * model: its containing region(s), or an amber "outside regions" tag for
 * orphans (only super_admin ever sees those).
 */
export function RegionTag({ regionNames, isOrphan, compact = false }: RegionTagProps) {
  const { t } = useTranslation();

  if (isOrphan || regionNames.length === 0) {
    return (
      <span className={clsx(styles.tag, styles.orphan)}>
        <GlobeIcon className={styles.icon} />
        {t('common.outsideRegions')}
      </span>
    );
  }

  const [first, ...rest] = regionNames;
  return (
    <span className={styles.tag} title={regionNames.join(' · ')}>
      <MapPinIcon className={styles.icon} />
      {compact ? first : regionNames.join(' · ')}
      {compact && rest.length > 0 && <span className={styles.more}>+{rest.length}</span>}
    </span>
  );
}
