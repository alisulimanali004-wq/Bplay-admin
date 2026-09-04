import { useTranslation } from 'react-i18next';
import {
  ActivityIcon,
  Badge,
  BellIcon,
  BuildingIcon,
  ClockIcon,
  CreditCardIcon,
  FlagIcon,
  InboxIcon,
  MapPinIcon,
  StadiumIcon,
} from '@ui';
import type { ComponentType, SVGProps } from 'react';
import {
  notificationCategoryBadgeVariant,
  type NotificationCategory,
  type NotificationType,
} from '../api/notification.types';
import styles from './notificationBadges.module.css';

/**
 * One glyph per event type. `other` gets the neutral bell on purpose — an
 * unrecognised notification must LOOK unrecognised rather than borrowing the
 * icon of whichever type it was mistaken for.
 */
const TYPE_ICON: Record<NotificationType, ComponentType<SVGProps<SVGSVGElement>>> = {
  owner_request: BuildingIcon,
  facility_request: StadiumIcon,
  feedback_new: InboxIcon,
  community_report: FlagIcon,
  plan_subscription: CreditCardIcon,
  pending_reminder: ClockIcon,
  platform_event: ActivityIcon,
  coverage_gap: MapPinIcon,
  other: BellIcon,
};

export function NotificationTypeIcon({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  const Icon = TYPE_ICON[type];
  return <Icon className={className} />;
}

/** The category pill — the row's colour language. */
export function NotificationCategoryBadge({ category }: { category: NotificationCategory }) {
  const { t } = useTranslation();
  return (
    <Badge variant={notificationCategoryBadgeVariant(category)} size="sm">
      {t(`notification.category.${category}`)}
    </Badge>
  );
}

/** Type + label, the way the table's first column reads. */
export function NotificationTypeTag({ type }: { type: NotificationType }) {
  const { t } = useTranslation();
  return (
    <span className={styles.typeTag}>
      <NotificationTypeIcon type={type} className={styles.typeIcon} />
      <span className={styles.typeLabel}>{t(`notification.type.${type}`)}</span>
    </span>
  );
}

/**
 * The unread marker. A dot rather than a badge: it sits at the start of the row
 * where the eye lands first, and it carries an accessible label so a screen
 * reader announces "unread" instead of nothing at all.
 */
export function UnreadDot({ isRead }: { isRead: boolean }) {
  const { t } = useTranslation();
  if (isRead) return <span className={styles.dotPlaceholder} aria-hidden />;
  return (
    <span className={styles.dot} role="status" aria-label={t('notification.state.unread')} />
  );
}
