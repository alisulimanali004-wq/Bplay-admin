import { useTranslation } from 'react-i18next';
import { AlertCircleIcon, BellIcon, CalendarIcon, InboxIcon, StatCard } from '@ui';
import type { NotificationStats } from '../api/notification.types';
import styles from './notificationStats.module.css';

/**
 * Inbox counters. Computed over everything the signed-in admin may see — not
 * over the current page — so a regional admin's totals are their own.
 *
 * "Needs attention" counts UNREAD high-priority rows only: a high-priority
 * notice the admin has already opened is not outstanding work, and a counter
 * that never drops is a counter nobody reads.
 */
export function NotificationStatCards({ stats }: { stats?: NotificationStats }) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} data-testid="notification-stats">
      <StatCard
        label={t('notification.stats.total')}
        value={stats?.total ?? 0}
        icon={<InboxIcon />}
        countUp
      />
      <StatCard
        label={t('notification.stats.unread')}
        value={stats?.unread ?? 0}
        icon={<BellIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={t('notification.stats.today')}
        value={stats?.today ?? 0}
        icon={<CalendarIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={t('notification.stats.highPriority')}
        value={stats?.highPriority ?? 0}
        icon={<AlertCircleIcon />}
        accent="info"
        countUp
      />
    </div>
  );
}
