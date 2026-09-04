import { useChatStats } from '../hooks/useChatQueries';
import styles from './chatNavBadge.module.css';

/** Two digits plus a plus sign is as much as the badge can carry legibly. */
const BADGE_MAX = 99;

/**
 * FR-ADM-CHAT-001 — "مؤشّر غير مقروء", surfaced on the sidebar entry so an admin
 * sees waiting messages from any page, not only from the chat itself.
 *
 * It renders NOTHING at zero: a permanent "0" is chrome, and a badge that is
 * always there stops signalling anything (MD `tab-badge`).
 */
export function ChatNavBadge() {
  const { data } = useChatStats();
  const unread = data?.unread ?? 0;
  if (unread === 0) return null;

  return (
    <span className={styles.badge} aria-hidden data-testid="chat-nav-badge">
      {unread > BADGE_MAX ? `${BADGE_MAX}+` : unread}
    </span>
  );
}
