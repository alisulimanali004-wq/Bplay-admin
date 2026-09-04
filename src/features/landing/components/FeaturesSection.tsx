import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  BuildingIcon,
  CalendarIcon,
  GlobeIcon,
  StadiumIcon,
  StarIcon,
  UsersIcon,
} from '@ui';
import { LandingSection } from './LandingSection';
import { SectionIntro } from './SectionIntro';
import { fadeUp, staggerContainer, revealOnce } from './landingShared';
import styles from './FeaturesSection.module.css';

const FEATURES = [
  { icon: StadiumIcon, key: 'facilities' },
  { icon: CalendarIcon, key: 'booking' },
  { icon: UsersIcon, key: 'members' },
  { icon: GlobeIcon, key: 'coverage' },
  { icon: StarIcon, key: 'ratings' },
  { icon: BuildingIcon, key: 'control' },
] as const;

export function FeaturesSection() {
  const { t } = useTranslation();
  return (
    <LandingSection id="features">
      <SectionIntro
        eyebrow={t('landing.nav.features')}
        title={t('landing.features.title')}
        subtitle={t('landing.features.subtitle')}
      />
      <motion.div className={styles.grid} variants={staggerContainer} {...revealOnce}>
        {FEATURES.map(({ icon: Icon, key }) => (
          <motion.article key={key} className={styles.card} variants={fadeUp}>
            <span className={styles.icon} aria-hidden>
              <Icon />
            </span>
            <h3 className={styles.title}>{t(`landing.features.${key}.title`)}</h3>
            <p className={styles.desc}>{t(`landing.features.${key}.desc`)}</p>
          </motion.article>
        ))}
      </motion.div>
    </LandingSection>
  );
}
