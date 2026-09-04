import { useTranslation } from 'react-i18next';
import { BookingStatusBadge } from './BookingStatusBadge';
import type { BookingTimelineEntry } from '../api/booking.types';
import styles from './BookingTimeline.module.css';

interface Props {
  entries: BookingTimelineEntry[];
}

/** A vertical, RTL-safe status history: badge + localized datetime + optional note. */
export function BookingTimeline({ entries }: Props) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  if (entries.length === 0) return null;

  return (
    <ol className={styles.list} data-testid="booking-timeline">
      {entries.map((entry, index) => (
        <li key={`${entry.status}-${index}`} className={styles.item}>
          <span className={styles.marker} aria-hidden>
            <span className={styles.dot} />
            {index < entries.length - 1 && <span className={styles.line} />}
          </span>
          <div className={styles.body}>
            <div className={styles.head}>
              <BookingStatusBadge status={entry.status} size="sm" />
              <span className={styles.at}>
                {new Date(entry.at).toLocaleString(locale, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {entry.note && <p className={styles.note}>{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
