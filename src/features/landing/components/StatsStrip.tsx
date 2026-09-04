import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, revealOnce } from './landingShared';
import styles from './StatsStrip.module.css';

/** Illustrative platform figures (mock data until the backend is wired). */
const STATS = [
  { value: '80+', key: 'landing.stats.facilities' },
  { value: '45K+', key: 'landing.stats.bookings' },
  { value: '24', key: 'landing.stats.cities' },
  { value: '99.9%', key: 'landing.stats.uptime' },
] as const;

export function StatsStrip() {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <motion.div className={styles.panel} variants={staggerContainer} {...revealOnce}>
        {STATS.map((stat) => (
          <motion.div key={stat.key} className={styles.item} variants={fadeUp}>
            <span className={styles.value}>{stat.value}</span>
            <span className={styles.label}>{t(stat.key)}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
