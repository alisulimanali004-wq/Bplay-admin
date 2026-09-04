// Proves that every count renders in the ACTIVE language for the keys that take
// one. Arabic has six CLDR plural categories; supplying only _one/_other silently
// falls through to English for 2-99, which is invisible in an English-first dev
// session. Run: node scripts/verify-plurals.mjs
import i18next from 'i18next';
import en from '../src/shared/i18n/locales/en.json' with { type: 'json' };
import ar from '../src/shared/i18n/locales/ar.json' with { type: 'json' };

await i18next.init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  fallbackLng: 'en',
  supportedLngs: ['en', 'ar'],
  interpolation: { escapeValue: false },
  lng: 'en',
});

const COUNTED_KEYS = ['owner.gate.pendingDocs', 'owner.gate.rejectedDocs', 'common.resultsCount'];
const COUNTS = [1, 2, 3, 7, 11, 42, 100];

// Any Latin letter in an Arabic render means i18next fell back to English.
const LATIN = /[A-Za-z]{3,}/;

let failures = 0;
for (const key of COUNTED_KEYS) {
  console.log(`\n${key}`);
  for (const lng of ['en', 'ar']) {
    await i18next.changeLanguage(lng);
    for (const count of COUNTS) {
      const text = i18next.t(key, { count });
      const leaked = lng === 'ar' && LATIN.test(text);
      const missing = text === key;
      if (leaked || missing) failures++;
      console.log(
        `  ${lng} n=${String(count).padStart(3)}  ${leaked ? 'EN LEAK ❌' : missing ? 'MISSING ❌' : 'ok      ✅'}  ${text}`,
      );
    }
  }
}

console.log(`\n${failures === 0 ? 'ALL PLURALS RESOLVE IN-LANGUAGE' : `${failures} FAILURES`}`);
process.exitCode = failures === 0 ? 0 : 1;
