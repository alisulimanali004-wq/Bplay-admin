import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BrandMark, ChevronEndIcon, clsx } from '@ui';
import { LanguageSwitcher } from '@app/layouts/LanguageSwitcher';
import { CtaLink } from './CtaLink';
import { scrollToSection } from './landingShared';
import styles from './LandingHeader.module.css';

const NAV = [
  { id: 'features', key: 'landing.nav.features' },
  { id: 'players', key: 'landing.nav.players' },
  { id: 'owners', key: 'landing.nav.owners' },
] as const;

/** Sticky glass header — transparent over the hero, frosts once the page scrolls. */
export function LandingHeader() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      className={clsx(styles.header, scrolled && styles.scrolled)}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="Bplay">
          <BrandMark size={34} />
          <span className={styles.wordmark}>Bplay</span>
        </Link>

        <nav className={styles.nav} aria-label={t('landing.nav.aria')}>
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={styles.navLink}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(item.id);
              }}
            >
              {t(item.key)}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <LanguageSwitcher />
          <CtaLink to="/login" variant="primary" size="md" rightIcon={<ChevronEndIcon />}>
            {t('landing.nav.login')}
          </CtaLink>
        </div>
      </div>
    </motion.header>
  );
}
