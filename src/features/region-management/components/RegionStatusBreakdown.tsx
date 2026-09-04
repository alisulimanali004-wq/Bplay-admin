import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Card, clsx } from '@ui';
import { useCountUp } from '@shared/hooks/useCountUp';
import type { FacilityStatus, RegionFacility } from '@features/facility-management/api';
import styles from './RegionStatusBreakdown.module.css';

interface Props {
  facilities: RegionFacility[];
}

/** Display order (active first) + the token color class per status. */
const ORDER: FacilityStatus[] = ['active', 'pending', 'suspended', 'rejected', 'owner_suspended'];
const COLOR_CLASS: Record<FacilityStatus, string> = {
  active: 'cActive',
  pending: 'cPending',
  suspended: 'cSuspended',
  rejected: 'cRejected',
  owner_suspended: 'cOwnerSuspended',
};

/**
 * A dependency-free "facilities by status" breakdown: a proportional bar whose
 * segments grow in with a stagger (flex-grow ∝ count — the sanctioned runtime
 * style exception) plus a legend of counting-up totals and their share. It is
 * the single home for the active/pending split (the KPI row no longer repeats
 * those counts). Reduced motion renders everything instantly.
 */
export function RegionStatusBreakdown({ facilities }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const total = facilities.length;

  if (total === 0) return null;

  const segments = ORDER.map((status) => ({
    status,
    count: facilities.filter((facility) => facility.status === status).length,
  })).filter((segment) => segment.count > 0);

  return (
    <Card className={styles.card} data-testid="region-detail-breakdown">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('region.detail.breakdown.title')}</h2>
        <Count className={styles.total} value={total} />
      </div>

      <div className={styles.bar} role="img" aria-label={t('region.detail.breakdown.title')}>
        {segments.map(({ status, count }, index) => (
          <motion.span
            key={status}
            className={clsx(styles.seg, styles[COLOR_CLASS[status]])}
            title={`${t(`status.${status}`)}: ${count}`}
            initial={reduceMotion ? false : { flexGrow: 0.0001, opacity: 0 }}
            animate={{ flexGrow: count, opacity: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.6, delay: index * 0.08, ease: 'easeOut' }
            }
          />
        ))}
      </div>

      <ul className={styles.legend}>
        {segments.map(({ status, count }, index) => (
          <motion.li
            key={status}
            className={styles.legendItem}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.35, delay: 0.15 + index * 0.06 }
            }
          >
            <span className={clsx(styles.dot, styles[COLOR_CLASS[status]])} aria-hidden />
            <span className={styles.legendLabel}>{t(`status.${status}`)}</span>
            <Count className={styles.legendCount} value={count} />
            <span className={styles.legendPct}>{Math.round((count / total) * 100)}%</span>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}

/** A span whose number counts up on mount (reduced motion: instant). */
function Count({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  return <span className={className}>{shown}</span>;
}
