import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Locale-aware display helpers for the catalog. Money and counts must stay
 * grouped in the active language, and an unlimited ceiling renders as ∞ — the
 * same glyph the mobile plan comparison table uses.
 */
export function usePlanFormat() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  return useMemo(() => {
    const numberFormat = new Intl.NumberFormat(locale);
    const dateFormat = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return {
      /** `250,000 SYP` — or the localized "Free" when the amount is zero. */
      money: (amount: number): string =>
        amount <= 0
          ? t('plan.price.free')
          : `${numberFormat.format(amount)} ${t('common.currencySyp')}`,
      number: (value: number): string => numberFormat.format(value),
      /** `∞` for an unlimited ceiling, otherwise the grouped number. */
      ceiling: (value: number | null): string =>
        value === null ? '∞' : numberFormat.format(value),
      days: (value: number): string => t('plan.value.days', { n: numberFormat.format(value) }),
      date: (iso: string): string => dateFormat.format(new Date(iso)),
    };
  }, [locale, t]);
}
