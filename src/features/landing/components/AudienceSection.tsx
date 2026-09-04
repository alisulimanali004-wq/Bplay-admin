import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BuildingIcon, CheckIcon, ChevronEndIcon, StadiumIcon } from '@ui';
import { LandingSection } from './LandingSection';
import { SectionIntro } from './SectionIntro';
import { CtaLink } from './CtaLink';
import { fadeUp, staggerContainer, revealOnce } from './landingShared';
import styles from './AudienceSection.module.css';

const PANELS = [
  { id: 'players', icon: StadiumIcon },
  { id: 'owners', icon: BuildingIcon },
] as const;

const POINTS = [1, 2, 3] as const;

export function AudienceSection() {
  const { t } = useTranslation();
  return (
    <LandingSection id="audience">
      <SectionIntro
        title={t('landing.audience.title')}
        subtitle={t('landing.audience.subtitle')}
      />
      <motion.div className={styles.grid} variants={staggerContainer} {...revealOnce}>
        {PANELS.map(({ id, icon: Icon }) => (
          <motion.article key={id} id={id} className={styles.panel} variants={fadeUp}>
            <span className={styles.icon} aria-hidden>
              <Icon />
            </span>
            <span className={styles.tag}>{t(`landing.audience.${id}.tag`)}</span>
            <h3 className={styles.title}>{t(`landing.audience.${id}.title`)}</h3>
            <p className={styles.desc}>{t(`landing.audience.${id}.desc`)}</p>
            <ul className={styles.points}>
              {POINTS.map((n) => (
                <li key={n} className={styles.point}>
                  <CheckIcon className={styles.check} aria-hidden />
                  <span>{t(`landing.audience.${id}.point${n}`)}</span>
                </li>
              ))}
            </ul>
            <CtaLink
              to="/login"
              variant="secondary"
              className={styles.cta}
              rightIcon={<ChevronEndIcon />}
            >
              {t(`landing.audience.${id}.cta`)}
            </CtaLink>
          </motion.article>
        ))}
      </motion.div>
    </LandingSection>
  );
}
