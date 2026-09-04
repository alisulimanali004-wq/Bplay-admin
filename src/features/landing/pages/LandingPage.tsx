import { MotionConfig } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LandingHeader } from '../components/LandingHeader';
import { HeroSection } from '../components/HeroSection';
import { StatsStrip } from '../components/StatsStrip';
import { FeaturesSection } from '../components/FeaturesSection';
import { AudienceSection } from '../components/AudienceSection';
import { CtaBand } from '../components/CtaBand';
import { LandingFooter } from '../components/LandingFooter';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.page}>
        <a className="skipLink" href="#main">
          {t('common.skipToContent')}
        </a>

        <div className={styles.ambient} aria-hidden>
          <span className={styles.orbTop} />
          <span className={styles.orbMid} />
          <span className={styles.orbBottom} />
        </div>

        <LandingHeader />

        <main id="main" className={styles.main} tabIndex={-1}>
          <HeroSection />
          <StatsStrip />
          <FeaturesSection />
          <AudienceSection />
          <CtaBand />
        </main>

        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
