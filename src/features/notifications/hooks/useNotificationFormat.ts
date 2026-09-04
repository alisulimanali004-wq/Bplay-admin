import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Locale-aware formatting for the notification centre. Follows the house
 * convention of an inline `ar-SY` / `en-US` Intl formatter rather than a shared
 * util.
 *
 * `relative` is what an inbox actually reads by — "3 hours ago" tells an admin
 * whether something is still fresh; a calendar date does not. It degrades to an
 * absolute date past a week, where "5 weeks ago" stops being useful, and it is
 * always paired with a `title`/absolute value in the UI so the exact instant is
 * still one hover away.
 */
export function useNotificationFormat() {
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
    const relativeFmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    /** "3 hours ago" / "منذ ٣ ساعات"; an absolute date once it is over a week old. */
    const relative = (iso: string, nowMs: number = Date.now()): string => {
      const at = Date.parse(iso);
      if (Number.isNaN(at)) return '';
      const diff = at - nowMs;
      const abs = Math.abs(diff);
      if (abs < MINUTE) return relativeFmt.format(0, 'minute');
      if (abs < HOUR) return relativeFmt.format(Math.round(diff / MINUTE), 'minute');
      if (abs < DAY) return relativeFmt.format(Math.round(diff / HOUR), 'hour');
      if (abs < WEEK) return relativeFmt.format(Math.round(diff / DAY), 'day');
      return short.format(new Date(at));
    };

    return {
      date: (iso: string) => date.format(new Date(iso)),
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
      shortDate: (iso: string) => short.format(new Date(iso)),
      number: (value: number) => number.format(value),
      relative,
    };
  }, [locale]);
}
