import { useTranslation } from 'react-i18next';
import { Badge, CalendarIcon, UserCell } from '@ui';
import type { BookingListItem } from '../api/booking.types';
import styles from './BookingPartyCell.module.css';

export interface BookingPartyCellProps {
  item: BookingListItem;
  /** Open the registered player's profile (only used for player parties). */
  onPlayerClick?: (playerId: string) => void;
}

/**
 * The party a booking is for, rendered consistently across the list and detail:
 *  - a registered player → clickable UserCell → the player profile;
 *  - a walk-in guest → a non-clickable UserCell with a "Guest" badge;
 *  - a facility block → a chip with the block title + a "Block" badge.
 */
export function BookingPartyCell({ item, onPlayerClick }: BookingPartyCellProps) {
  const { t } = useTranslation();

  if (item.partyKind === 'block') {
    return (
      <span className={styles.block} data-testid={`booking-party-block-${item.id}`}>
        <span className={styles.blockIcon} aria-hidden>
          <CalendarIcon />
        </span>
        <span className={styles.blockName}>{item.partyName}</span>
        <Badge variant="caution" size="sm">
          {t('booking.party.block')}
        </Badge>
      </span>
    );
  }

  if (item.partyKind === 'guest') {
    return (
      <UserCell
        name={item.partyName}
        trailing={
          <Badge variant="neutral" size="sm">
            {t('booking.party.guest')}
          </Badge>
        }
        testId={`booking-party-guest-${item.id}`}
      />
    );
  }

  return (
    <UserCell
      name={item.partyName}
      photoUrl={item.playerPhotoUrl}
      onClick={
        item.playerId && onPlayerClick ? () => onPlayerClick(item.playerId as string) : undefined
      }
      testId={`booking-party-player-${item.id}`}
    />
  );
}
