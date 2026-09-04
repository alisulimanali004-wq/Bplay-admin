import { useTranslation } from 'react-i18next';
import { Avatar, RegionTag, clsx } from '@ui';
import { useChatFormat } from '../hooks/useChatFormat';
import { CategoryIcon } from './ChatBadges';
import type { Conversation } from '../api/chat.types';
import styles from './conversationRow.module.css';

interface Props {
  conversation: Conversation;
  isActive: boolean;
  /** True while the owner is typing in this thread (live signal). */
  isTyping: boolean;
  onSelect: (conversation: Conversation) => void;
  /** Hidden when the admin only ever sees one region — it would say nothing. */
  showRegion: boolean;
}

/** Two digits plus a plus sign is as much as the unread pill can carry legibly. */
const UNREAD_MAX = 99;

/**
 * One row in the conversation rail (FR-ADM-CHAT-001).
 *
 * Carries exactly what the SRS asks for — the owner, the last message, its time,
 * and the read state — plus the channel glyph (CH6) and the region tag, which is
 * how a super-admin tells two same-named owners apart.
 *
 * The whole row is ONE button. A row with nested interactive children would put
 * a keyboard user through several stops to reach a single destination.
 */
export function ConversationRow({
  conversation,
  isActive,
  isTyping,
  onSelect,
  showRegion,
}: Props) {
  const { t } = useTranslation();
  const fmt = useChatFormat();

  const hasUnread = conversation.unreadCount > 0;
  const preview = previewText(conversation, t);

  return (
    <button
      type="button"
      className={clsx(styles.row, isActive && styles.active, hasUnread && styles.unread)}
      aria-current={isActive ? 'true' : undefined}
      onClick={() => onSelect(conversation)}
      data-testid={`chat-row-${conversation.id}`}
    >
      <span className={styles.avatarWrap}>
        <Avatar src={conversation.owner.photoUrl} name={conversation.owner.name} size="md" />
        {hasUnread && <span className={styles.unreadDot} aria-hidden />}
      </span>

      <span className={styles.main}>
        <span className={styles.topLine}>
          <span className={styles.name} dir="auto">
            {conversation.owner.name}
          </span>
          <span className={styles.time}>{fmt.railTime(conversation.lastMessageAt)}</span>
        </span>

        <span className={styles.subject}>
          <CategoryIcon category={conversation.category} className={styles.subjectIcon} />
          <span className={styles.subjectText} dir="auto">
            {conversation.category === 'facility_review'
              ? (conversation.facilityName ?? conversation.title)
              : t('chat.category.general_support')}
          </span>
        </span>

        <span className={styles.bottomLine}>
          {isTyping ? (
            <span className={styles.typing}>{t('chat.thread.typing')}</span>
          ) : (
            <span className={styles.preview} dir="auto">
              {conversation.lastMessageSender === 'admin' && (
                <span className={styles.previewYou}>{t('chat.rail.youPrefix')}</span>
              )}
              {preview}
            </span>
          )}

          {hasUnread && (
            <span
              className={styles.unreadPill}
              aria-label={t('chat.rail.unreadCount', { count: conversation.unreadCount })}
            >
              {conversation.unreadCount > UNREAD_MAX
                ? `${UNREAD_MAX}+`
                : fmt.number(conversation.unreadCount)}
            </span>
          )}
        </span>

        {showRegion && (
          <span className={styles.regionLine}>
            <RegionTag
              regionNames={conversation.regionNames}
              isOrphan={conversation.isOrphan}
              compact
            />
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * The rail's one-line summary of the last message.
 *
 * A system event and an attachment-only message have no prose to show, so the
 * mock/backend stores a KEY (`system:approved`, `attachment:2`) and the label is
 * translated here — storing English on the row would not translate.
 */
function previewText(
  conversation: Conversation,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const raw = conversation.lastMessagePreview;
  if (!raw) return t('chat.rail.noMessages');
  if (raw.startsWith('system:')) {
    return t(`chat.systemEvent.${raw.slice('system:'.length)}`);
  }
  if (raw.startsWith('attachment:')) {
    return t('chat.rail.attachmentPreview', { count: Number(raw.slice('attachment:'.length)) || 1 });
  }
  return raw;
}
