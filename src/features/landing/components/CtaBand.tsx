import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronEndIcon } from '@ui';
import { CtaLink } from './CtaLink';
import { fadeUp, staggerContainer, revealOnce } from './landingShared';
import styles from './CtaBand.module.css';

export function CtaBand() {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <motion.div className={styles.band} variants={staggerContainer} {...revealOnce}>
        <span className={styles.glow} aria-hidden />
        <motion.h2 className={styles.title} variants={fadeUp}>
          {t('landing.cta.title')}
        </motion.h2>
        <motion.p className={styles.subtitle} variants={fadeUp}>
          {t('landing.cta.subtitle')}
        </motion.p>
        <motion.div className={styles.actions} variants={fadeUp}>
          <CtaLink to="/login" variant="primary" size="lg" rightIcon={<ChevronEndIcon />}>
            {t('landing.cta.primary')}
          </CtaLink>
          <CtaLink to="/login" variant="ghost" size="lg">
            {t('landing.cta.secondary')}
          </CtaLink>
        </motion.div>
      </motion.div>
    </section>
  );
}
