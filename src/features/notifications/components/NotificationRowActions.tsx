import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ExternalLinkIcon, IconButton } from '@ui';
import type { Notification } from '../api/notification.types';
import styles from './notificationActions.module.css';

interface Props {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  onMarkRead: (notification: Notification) => void;
  isMarking: boolean;
}

/**
 * Row actions: follow the deep link, and mark as read without leaving the list.
 *
 * The open button is HIDDEN — not disabled — when the notification has no
 * resolvable subject. A disabled control invites the admin to keep clicking it;
 * an absent one says plainly that this notice has nowhere to go.
 *
 * Both handlers stop propagation because the whole row is clickable (DataTable's
 * `onRowClick`), and a nested button must run its own action instead.
 */
export function NotificationRowActions({ notification, onOpen, onMarkRead, isMarking }: Props) {
  const { t } = useTranslation();

  const handle = (event: MouseEvent, run: () => void) => {
    event.stopPropagation();
    run();
  };

  return (
    <span className={styles.row}>
      {notification.link && (
        <IconButton
          size="sm"
          label={t('notification.actions.open')}
          icon={<ExternalLinkIcon />}
          onClick={(event) => handle(event, () => onOpen(notification))}
          data-testid={`notification-view-${notification.id}`}
        />
      )}
      {!notification.isRead && (
        <IconButton
          size="sm"
          label={t('notification.actions.markRead')}
          icon={<CheckIcon />}
          disabled={isMarking}
          onClick={(event) => handle(event, () => onMarkRead(notification))}
          data-testid={`notification-mark-read-${notification.id}`}
        />
      )}
    </span>
  );
}
