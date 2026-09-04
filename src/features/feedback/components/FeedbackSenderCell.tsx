import { Avatar } from '@ui';
import { FeedbackSenderBadge } from './FeedbackBadges';
import type { FeedbackSender } from '../api/feedback.types';
import styles from './feedbackCells.module.css';

/**
 * The person who wrote in.
 *
 * Deliberately NOT a link to the player/owner profile: those routes are
 * super-admin only, so a regional admin — who is a first-class actor here
 * (FR-ADM-FEED-003) — would be bounced to their own profile. The identity shown
 * is what an answer needs; the name/email are rendered as text, never as HTML.
 */
export function FeedbackSenderCell({ sender }: { sender: FeedbackSender }) {
  return (
    <span className={styles.sender}>
      <Avatar src={sender.photoUrl} name={sender.name} size="sm" />
      <span className={styles.senderText}>
        <span className={styles.senderName}>{sender.name}</span>
        {sender.email && (
          <span className={styles.senderEmail} dir="ltr">
            {sender.email}
          </span>
        )}
      </span>
      <FeedbackSenderBadge type={sender.type} />
    </span>
  );
}
