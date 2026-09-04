import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGS = ['en', 'ar'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

/** Sync the document direction + lang with the active language (RTL for Arabic). */
function applyDirection(lng: string): void {
  const dir = lng.startsWith('ar') ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    react: { useSuspense: false },
  });

applyDirection(i18n.language);
i18n.on('languageChanged', applyDirection);

export default i18n;
