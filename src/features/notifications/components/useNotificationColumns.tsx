import { useTranslation } from 'react-i18next';
import { RegionTag, clsx, type Column } from '@ui';
import { useNotificationFormat } from '../hooks/useNotificationFormat';
import { NotificationCategoryBadge, NotificationTypeTag, UnreadDot } from './NotificationBadges';
import type { Notification } from '../api/notification.types';
import styles from './notificationCells.module.css';

/** Table column key -> sort field, for the sortable headers. */
export const SORT_BY_COLUMN: Record<string, 'createdAt' | 'priority'> = {
  received: 'createdAt',
  priority: 'priority',
};

interface Options {
  onOpen: (notification: Notification) => void;
  /** Region column is only meaningful when the admin can see more than one. */
  showRegion: boolean;
}

/**
 * The FR-ADM-SET-006 columns: unread marker · type · message · category ·
 * region · received.
 */
export function useNotificationColumns({ onOpen, showRegion }: Options): Column<Notification>[] {
  const { t } = useTranslation();
  const fmt = useNotificationFormat();

  const columns: Column<Notification>[] = [
    {
      key: 'unread',
      header: <span className={styles.srOnly}>{t('notification.col.unread')}</span>,
      width: '28px',
      render: (item) => <UnreadDot isRead={item.isRead} />,
    },
    {
      key: 'type',
      header: t('notification.col.type'),
      render: (item) => <NotificationTypeTag type={item.type} />,
    },
    {
      key: 'message',
      header: t('notification.col.message'),
      render: (item) => (
        <button
          type="button"
          className={styles.messageButton}
          // The whole row is clickable (`DataTable.onRowClick`), so this nested
          // button MUST consume its own click. Without it the handler runs
          // twice — two `POST /read` calls and two history entries per click.
          onClick={(event) => {
            event.stopPropagation();
            onOpen(item);
          }}
          data-testid={`notification-open-${item.id}`}
        >
          {/* Server-rendered copy: a plain text node, escaped by React. `dir="auto"`
              lets each notification keep its own direction, so an English title
              still truncates at its end while the dashboard is in Arabic. */}
          <span
            className={clsx(styles.title, !item.isRead && styles.titleUnread)}
            dir="auto"
          >
            {item.title}
          </span>
          {item.body && (
            <span className={styles.body} dir="auto">
              {item.body}
            </span>
          )}
        </button>
      ),
    },
    {
      key: 'category',
      header: t('notification.col.category'),
      render: (item) => <NotificationCategoryBadge category={item.category} />,
    },
    {
      key: 'received',
      header: t('notification.col.received'),
      sortable: true,
      render: (item) => (
        // The exact instant stays one hover away — relative time is readable but
        // lossy, and an admin auditing a decision needs the real timestamp.
        <span className={styles.meta} title={fmt.dateTime(item.createdAt)}>
          {fmt.relative(item.createdAt)}
        </span>
      ),
    },
  ];

  if (showRegion) {
    columns.splice(4, 0, {
      key: 'region',
      header: t('notification.col.region'),
      // `isPlatformWide`, not `regionId === null`: `projectForScope` also sets
      // it when the row's region has since been DEACTIVATED, and in that case
      // there is no live regional anchor left to name. Reading `regionId` here
      // would hand RegionTag an empty `regionNames`, which renders its amber
      // "outside regions" orphan tag — a label that means something else
      // entirely in this dashboard and would be simply wrong on a notification.
      render: (item) =>
        item.isPlatformWide ? (
          <span className={styles.platformTag}>{t('notification.filter.platform')}</span>
        ) : (
          <RegionTag regionNames={item.regionNames} isOrphan={false} compact />
        ),
    });
  }

  return columns;
}
