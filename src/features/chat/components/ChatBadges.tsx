import { useTranslation } from 'react-i18next';
import {
  Badge,
  BuildingIcon,
  CheckCheckIcon,
  CheckIcon,
  ClockDashedIcon,
  InboxIcon,
  StadiumIcon,
  clsx,
} from '@ui';
import {
  conversationCategoryBadgeVariant,
  conversationStatusBadgeVariant,
  type ConversationCategory,
  type ConversationStatus,
  type DeliveryStatus,
} from '../api/chat.types';
import styles from './chatBadges.module.css';

/** CH6 — which of the two V1 channels a thread belongs to. */
export function CategoryBadge({
  category,
  size = 'sm',
}: {
  category: ConversationCategory;
  size?: 'sm' | 'md';
}) {
  const { t } = useTranslation();
  return (
    <Badge variant={conversationCategoryBadgeVariant(category)} size={size}>
      {t(`chat.category.${category}`)}
    </Badge>
  );
}

export function StatusBadge({
  status,
  size = 'sm',
}: {
  status: ConversationStatus;
  size?: 'sm' | 'md';
}) {
  const { t } = useTranslation();
  return (
    <Badge variant={conversationStatusBadgeVariant(status)} size={size}>
      {t(`chat.status.${status}`)}
    </Badge>
  );
}

/** The small glyph that says which channel a rail row is, before its text. */
export function CategoryIcon({
  category,
  className,
}: {
  category: ConversationCategory;
  className?: string;
}) {
  return category === 'facility_review' ? (
    <StadiumIcon className={className} />
  ) : (
    <InboxIcon className={className} />
  );
}

/** Owner glyph, used wherever an owner is named without a photo to hand. */
export function OwnerIcon({ className }: { className?: string }) {
  return <BuildingIcon className={className} />;
}

/**
 * FR-ADM-MSG delivery state on an OUTGOING bubble only — an inbound message has
 * no tick, because the owner's read state is not modelled in V1.
 *
 * Colour alone never carries the meaning (WCAG): each state has a distinct
 * glyph, and the accessible label spells it out.
 */
export function DeliveryTicks({ status }: { status: DeliveryStatus }) {
  const { t } = useTranslation();
  const label = t(`chat.delivery.${status}`);

  if (status === 'failed') return null; // The bubble renders its own retry row.

  const Glyph =
    status === 'sending' ? ClockDashedIcon : status === 'delivered' ? CheckCheckIcon : CheckIcon;

  return (
    <span
      className={clsx(styles.ticks, status === 'sending' && styles.ticksPending)}
      title={label}
      aria-label={label}
      role="img"
    >
      <Glyph />
    </span>
  );
}
