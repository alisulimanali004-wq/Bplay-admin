import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Badge, BuildingIcon, CalendarIcon, CheckIcon, RatingStars, clsx } from '@ui';
import styles from './HeroShowcase.module.css';

/**
 * Decorative hero illustration — layered frosted-glass cards floating over a mint
 * halo. Purely presentational (aria-hidden); the accessible hero message lives in
 * the headline. Float loops are disabled under reduced-motion.
 */
export function HeroShowcase() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const float = (distance: number) => (reduce ? undefined : { y: [0, distance, 0] });
  const loop = (duration: number) =>
    reduce ? undefined : { duration, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <motion.div
      className={styles.stage}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      <span className={styles.glowCore} />

      <motion.div
        className={clsx(styles.card, styles.cardBooking)}
        animate={float(-12)}
        transition={loop(6)}
      >
        <span className={clsx(styles.chip, styles.chipSuccess)}>
          <CheckIcon />
        </span>
        <div className={styles.grow}>
          <span className={styles.cardTitle}>{t('landing.hero.showcase.bookingTitle')}</span>
          <span className={styles.cardMeta}>{t('landing.hero.showcase.bookingMeta')}</span>
        </div>
        <Badge variant="success" size="sm">
          {t('landing.hero.showcase.bookingBadge')}
        </Badge>
      </motion.div>

      <motion.div
        className={clsx(styles.card, styles.col, styles.cardFacility)}
        animate={float(10)}
        transition={loop(7)}
      >
        <div className={styles.row}>
          <span className={clsx(styles.chip, styles.chipPrimary)}>
            <BuildingIcon />
          </span>
          <div className={styles.grow}>
            <span className={styles.cardTitle}>{t('landing.hero.showcase.facilityTitle')}</span>
            <span className={styles.cardMeta}>{t('landing.hero.showcase.facilityMeta')}</span>
          </div>
        </div>
        <RatingStars value={4.8} />
      </motion.div>

      <motion.div
        className={clsx(styles.card, styles.col, styles.cardPulse)}
        animate={float(-9)}
        transition={loop(8)}
      >
        <div className={styles.row}>
          <span className={clsx(styles.chip, styles.chipInfo)}>
            <CalendarIcon />
          </span>
          <span className={styles.cardMeta}>{t('landing.hero.showcase.pulseLabel')}</span>
        </div>
        <div className={styles.pulseNumber}>
          {t('landing.hero.showcase.pulseValue')}
          <span className={styles.pulseUnit}>{t('landing.hero.showcase.pulseUnit')}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
