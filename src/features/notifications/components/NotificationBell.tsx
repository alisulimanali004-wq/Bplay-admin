import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellIcon, Button, IconButton, Spinner, clsx } from '@ui';
import { PATHS } from '@app/router/paths';
import { useNotificationFormat } from '../hooks/useNotificationFormat';
import { useNotificationStream } from '../hooks/useNotificationStream';
import {
  useRecentNotificationsQuery,
  useUnreadCountQuery,
} from '../hooks/useNotificationsQuery';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '../hooks/useNotificationMutations';
import { NotificationTypeIcon } from './NotificationBadges';
import type { Notification } from '../api/notification.types';
import styles from './notificationBell.module.css';

/**
 * The topbar bell (FR-ADM-SET-006: "عدّاد غير المقروء").
 *
 * Panel width is fixed here as well as in CSS because the popover is positioned
 * from JS — measuring the panel would require rendering it first, which causes a
 * visible jump on open.
 */
const PANEL_WIDTH = 360;
const VIEWPORT_MARGIN = 8;
/** Two digits plus a plus sign is as much as the badge can carry legibly. */
const BADGE_MAX = 99;

interface PanelPosition {
  top: number;
  left: number;
}

/**
 * Align the panel's INLINE-END edge with the trigger's, then clamp it inside the
 * viewport. Reading `dir` from the document is the house convention (MapPicker,
 * MapView do the same) and it is read at open time, which is exactly when the
 * measurement is taken.
 */
function positionPanel(rect: DOMRect): PanelPosition {
  const isRtl = document.documentElement.dir === 'rtl';
  const preferred = isRtl ? rect.left : rect.right - PANEL_WIDTH;
  const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN;
  return {
    top: rect.bottom + 8,
    left: Math.min(Math.max(preferred, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN)),
  };
}

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fmt = useNotificationFormat();

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // The stream is opened once, here, for the whole session: the bell lives in
  // the app shell, so this is the one component guaranteed to be mounted.
  const { isLive } = useNotificationStream();
  const unreadQuery = useUnreadCountQuery(isLive);
  const recentQuery = useRecentNotificationsQuery(isOpen);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unread = unreadQuery.data ?? 0;
  /**
   * The dropdown is an ACTION QUEUE, so it lists only what is still outstanding.
   *
   * It used to show recent notifications regardless of state, which meant an
   * item stayed in the list after it had been opened and dealt with — the panel
   * filled with things already handled and the admin had to remember which was
   * which. Read items remain on the full notifications page, which is the
   * history; this panel is "what still needs me".
   */
  const items = (recentQuery.data ?? []).filter((item) => !item.isRead);

  const close = () => {
    setIsOpen(false);
    // Return focus to the trigger, or a keyboard user is stranded at the top of
    // the document after the panel unmounts.
    triggerRef.current?.focus();
  };

  const toggle = () => {
    if (isOpen) {
      close();
      return;
    }
    if (triggerRef.current) setPosition(positionPanel(triggerRef.current.getBoundingClientRect()));
    setIsOpen(true);
  };

  /**
   * Move focus into the panel on open. The panel is portaled to <body>, so it
   * sits at the END of the document: without this, Tab from the trigger would
   * walk into the rest of the topbar and skip the panel entirely.
   */
  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus();
  }, [isOpen]);

  // Dismiss on outside click, Escape, scroll or resize — the panel is
  // fixed-positioned to the trigger, so any reflow detaches it.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    const onReflow = (event: Event) => {
      // Scrolling INSIDE the panel must not close it.
      if (event.type === 'scroll' && panelRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [isOpen]);

  /**
   * Opening a notification marks it read and follows its deep link. The
   * navigation is NOT awaited on the mutation: the admin asked to go somewhere,
   * and a slow write must not hold that up. A failed write leaves the row
   * unread, which is the safe direction to fail in — worst case it is read twice.
   */
  const openNotification = (notification: Notification) => {
    setIsOpen(false);
    // Marked read whether or not it has somewhere to go: the admin has now SEEN
    // it, and leaving it unread means it sits in this queue forever.
    if (!notification.isRead) markRead.mutate(notification.id);
    // Falls back to the notifications page rather than a dead route. A subject
    // whose entity has since been deleted resolves to a link that renders
    // "Something went wrong" — dropping the admin on a broken page for a
    // notification they cannot act on any more.
    navigate(notification.link ?? PATHS.notifications);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isOpen || !['ArrowDown', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    toggle();
  };

  return (
    <>
      <span className={styles.trigger}>
        <IconButton
          ref={triggerRef}
          variant="ghost"
          label={
            unread > 0
              ? t('notification.bell.labelWithCount', { n: unread })
              : t('notification.bell.label')
          }
          icon={<BellIcon />}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={toggle}
          onKeyDown={onTriggerKeyDown}
          data-testid="notification-bell"
        />
        {unread > 0 && (
          <span className={styles.badge} aria-hidden data-testid="notification-bell-badge">
            {unread > BADGE_MAX ? `${BADGE_MAX}+` : unread}
          </span>
        )}
      </span>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            className={styles.panel}
            style={{ top: position.top, left: position.left }}
            // Focusable as a container only — it never appears in the tab order
            // itself, it is just where focus lands when the panel opens.
            tabIndex={-1}
            role="dialog"
            aria-modal={false}
            aria-label={t('notification.bell.panelLabel')}
            data-testid="notification-bell-panel"
          >
            <header className={styles.header}>
              <span className={styles.headerTitle}>{t('notification.bell.title')}</span>
              {unread > 0 && (
                <button
                  type="button"
                  className={styles.headerAction}
                  disabled={markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                  data-testid="notification-bell-mark-all"
                >
                  {t('notification.actions.markAllRead')}
                </button>
              )}
            </header>

            <div className={styles.list}>
              {recentQuery.isLoading && (
                <div className={styles.center}>
                  <Spinner size="sm" />
                </div>
              )}

              {recentQuery.isError && (
                <p className={styles.stateText} role="alert">
                  {t('common.loadError')}
                </p>
              )}

              {!recentQuery.isLoading && !recentQuery.isError && items.length === 0 && (
                <p className={styles.stateText}>{t('notification.bell.empty')}</p>
              )}

              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={clsx(styles.item, !item.isRead && styles.itemUnread)}
                  onClick={() => openNotification(item)}
                  data-testid={`notification-bell-item-${item.id}`}
                >
                  <NotificationTypeIcon type={item.type} className={styles.itemIcon} />
                  <span className={styles.itemText}>
                    <span className={styles.itemTitle} dir="auto">
                      {item.title}
                    </span>
                    <span className={styles.itemMeta} title={fmt.dateTime(item.createdAt)}>
                      {fmt.relative(item.createdAt)}
                    </span>
                  </span>
                  {!item.isRead && <span className={styles.itemDot} aria-hidden />}
                </button>
              ))}
            </div>

            <footer className={styles.footer}>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setIsOpen(false);
                  navigate(PATHS.notifications);
                }}
                data-testid="notification-bell-view-all"
              >
                {t('notification.bell.viewAll')}
              </Button>
            </footer>
          </div>,
          document.body,
        )}
    </>
  );
}
