import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Locale-aware formatting for the inbox. Follows the house convention of an
 * inline `ar-SY` / `en-US` Intl formatter rather than a shared util.
 */
export function useFeedbackFormat() {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  return useMemo(() => {
    const date = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const dateTime = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const short = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    const number = new Intl.NumberFormat(locale);

    return {
      date: (iso: string) => date.format(new Date(iso)),
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
      shortDate: (iso: string) => short.format(new Date(iso)),
      number: (value: number) => number.format(value),
    };
  }, [locale]);
}
