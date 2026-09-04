import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Locale-aware formatting for the chat. Follows the house convention of an
 * inline `ar-SY` / `en-US` Intl formatter rather than a shared util.
 *
 * A messenger needs two things the other inboxes do not:
 *  - `railTime`, the compact stamp on a rail row — a clock time today, a weekday
 *    this week, a date beyond that, the way every chat client behaves;
 *  - `daySeparator`, the label on the divider between calendar days inside a
 *    thread, which says "Today"/"Yesterday" rather than repeating the date.
 */
export function useChatFormat() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  return useMemo(() => {
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const shortDate = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    const fullDate = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const dateTime = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const number = new Intl.NumberFormat(locale);

    /** Local midnight for a date — the boundary day separators are drawn on. */
    const startOfDay = (value: Date) =>
      new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

    const dayOffset = (iso: string, now = Date.now()) =>
      Math.round((startOfDay(new Date(now)) - startOfDay(new Date(iso))) / DAY);

    return {
      time: (iso: string) => time.format(new Date(iso)),
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
      number: (value: number) => number.format(value),

      /** The compact stamp on a conversation rail row. */
      railTime: (iso: string, now = Date.now()) => {
        const days = dayOffset(iso, now);
        if (days <= 0) return time.format(new Date(iso));
        if (days === 1) return t('chat.time.yesterday');
        if (days < 7) return weekday.format(new Date(iso));
        return shortDate.format(new Date(iso));
      },

      /** The label on a day divider inside a thread. */
      daySeparator: (iso: string, now = Date.now()) => {
        const days = dayOffset(iso, now);
        if (days <= 0) return t('chat.time.today');
        if (days === 1) return t('chat.time.yesterday');
        return fullDate.format(new Date(iso));
      },

      /** Do two timestamps fall on the same calendar day? Drives the dividers. */
      isSameDay: (a: string, b: string) =>
        startOfDay(new Date(a)) === startOfDay(new Date(b)),

      /** "just now" / "5m" / "3h" — used on the thread header's presence line. */
      relative: (iso: string, now = Date.now()) => {
        const diff = Math.max(0, now - Date.parse(iso));
        if (diff < MINUTE) return t('chat.time.justNow');
        if (diff < HOUR) return t('chat.time.minutes', { count: Math.floor(diff / MINUTE) });
        if (diff < DAY) return t('chat.time.hours', { count: Math.floor(diff / HOUR) });
        return t('chat.time.days', { count: Math.floor(diff / DAY) });
      },

      /** Human file size for an inbound attachment chip. */
      fileSize: (bytes: number) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unit = 0;
        while (value >= 1024 && unit < units.length - 1) {
          value /= 1024;
          unit += 1;
        }
        return `${number.format(Math.round(value * 10) / 10)} ${units[unit]}`;
      },
    };
  }, [locale, t]);
}
