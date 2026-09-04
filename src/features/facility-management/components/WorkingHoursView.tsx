import { useTranslation } from 'react-i18next';
import { clsx } from '@ui';
import type { WorkingHours } from '../api/facility.types';
import styles from './WorkingHoursView.module.css';

export interface WorkingHoursViewProps {
  workingHours: WorkingHours;
}

const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** JS Sunday-first day → ISO weekday (1 = Monday … 7 = Sunday). */
function todayIsoWeekday(): number {
  return ((new Date().getDay() + 6) % 7) + 1;
}

/**
 * A club's weekly schedule as a 7-row grid — today's row is highlighted and
 * closed days render muted. Time ranges are isolated LTR so they read
 * correctly inside Arabic text.
 */
export function WorkingHoursView({ workingHours }: WorkingHoursViewProps) {
  const { t } = useTranslation();
  const today = todayIsoWeekday();

  return (
    <ul className={styles.list}>
      {ISO_WEEKDAYS.map((day) => {
        const hours = workingHours[day];
        const isOpen = Boolean(hours?.isOpen && hours.openTime && hours.closeTime);
        return (
          <li key={day} className={clsx(styles.row, day === today && styles.today)}>
            <span className={styles.day}>{t(`facility.days.${day}`)}</span>
            {isOpen ? (
              <span className={styles.hours}>
                {hours?.openTime} – {hours?.closeTime}
              </span>
            ) : (
              <span className={styles.closed}>{t('facility.profile.closed')}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
