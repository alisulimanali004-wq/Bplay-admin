import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronEndIcon } from '@ui';
import { CtaLink } from './CtaLink';
import { CtaButton } from './CtaButton';
import { HeroBalls } from './HeroBalls';
import { HeroShowcase } from './HeroShowcase';
import { fadeUp, staggerContainer, scrollToSection } from './landingShared';
import styles from './HeroSection.module.css';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className={styles.hero}>
      <HeroBalls />
      <div className={styles.inner}>
        <motion.div
          className={styles.content}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.span className={styles.badge} variants={fadeUp}>
            <span className={styles.badgeDot} aria-hidden />
            {t('landing.hero.badge')}
          </motion.span>

          <motion.h1 className={styles.title} variants={fadeUp}>
            <span className={styles.titleLine}>{t('landing.hero.title1')}</span>
            <span className={styles.titleLine}>{t('landing.hero.title2')}</span>
            <span className={styles.titleAccent}>{t('landing.hero.titleAccent')}</span>
          </motion.h1>

          <motion.p className={styles.subtitle} variants={fadeUp}>
            {t('landing.hero.subtitle')}
          </motion.p>

          <motion.div className={styles.ctas} variants={fadeUp}>
            <CtaLink to="/login" variant="primary" size="lg" rightIcon={<ChevronEndIcon />}>
              {t('landing.hero.ctaPrimary')}
            </CtaLink>
            <CtaButton
              variant="ghost"
              size="lg"
              onClick={() => scrollToSection('features')}
            >
              {t('landing.hero.ctaSecondary')}
            </CtaButton>
          </motion.div>
        </motion.div>

        <HeroShowcase />
      </div>
    </section>
  );
}
