import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@ui';
import { LanguageSwitcher } from '@app/layouts/LanguageSwitcher';
import { scrollToSection } from './landingShared';
import styles from './LandingFooter.module.css';

const LINKS = [
  { id: 'features', key: 'landing.nav.features' },
  { id: 'players', key: 'landing.nav.players' },
  { id: 'owners', key: 'landing.nav.owners' },
] as const;

export function LandingFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link to="/" className={styles.brand} aria-label="Bplay">
            <BrandMark size={32} />
            <span className={styles.wordmark}>Bplay</span>
          </Link>
          <p className={styles.tagline}>{t('landing.footer.tagline')}</p>
        </div>

        <nav className={styles.nav} aria-label={t('landing.footer.explore')}>
          <span className={styles.navHeading}>{t('landing.footer.explore')}</span>
          {LINKS.map((item) => (
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
          <Link to="/login" className={styles.navLink}>
            {t('landing.nav.login')}
          </Link>
        </nav>

        <div className={styles.langCol}>
          <LanguageSwitcher />
        </div>
      </div>

      <div className={styles.bottom}>
        <span className={styles.rights}>{t('landing.footer.rights', { year })}</span>
      </div>
    </footer>
  );
}
