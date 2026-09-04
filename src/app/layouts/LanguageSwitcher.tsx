import { useTranslation } from 'react-i18next';
import { clsx, GlobeIcon } from '@ui';
import styles from './LanguageSwitcher.module.css';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'عربي' },
] as const;

/** A clear segmented toggle (🌐 EN | عربي) — the active language is highlighted. */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language.startsWith('ar') ? 'ar' : 'en';

  return (
    <div className={styles.group} role="group" aria-label="Language · اللغة">
      <GlobeIcon className={styles.icon} />
      {LANGS.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={clsx(styles.option, current === lang.code && styles.active)}
          aria-pressed={current === lang.code}
          onClick={() => void i18n.changeLanguage(lang.code)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
