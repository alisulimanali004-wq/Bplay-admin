import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, ChevronDownIcon, ErrorState, MessageCircleIcon, Skeleton, clsx } from '@ui';
import { MessageBubble } from './MessageBubble';
import { DaySeparator, SystemEventPill } from './SystemEventPill';
import type { ChatMessage, Conversation } from '../api/chat.types';
import styles from './chatThread.module.css';

interface Props {
  conversation: Conversation;
  messages: ChatMessage[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRetryMessage: (message: ChatMessage) => void;
  isTyping: boolean;
}

/** Consecutive messages from the same author within this gap render as one group. */
const GROUP_WINDOW_MS = 5 * 60_000;
/** How far from the bottom still counts as "at the bottom" for auto-scroll. */
const STICK_THRESHOLD_PX = 120;

/**
 * FR-ADM-CHAT-002 — the thread body: messages in chronological order, sender
 * distinguished, day separators between calendar days.
 *
 * SCROLL BEHAVIOUR is the part that makes a chat feel right, and it is the part
 * that is easy to get wrong:
 *  - a newly opened thread jumps to the bottom with NO animation, because a
 *    smooth scroll through a long history is motion sickness, not polish;
 *  - a new message auto-scrolls ONLY when the admin was already at the bottom.
 *    Yanking someone away from the message they are reading is the single most
 *    hated behaviour in a chat client;
 *  - when they are not at the bottom, a "jump to latest" button appears instead.
 */
export function ChatThread({
  conversation,
  messages,
  isLoading,
  isError,
  onRetry,
  onRetryMessage,
  isTyping,
}: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Whether the current render is the first for THIS conversation, which is the
  // only time an instant jump is correct.
  const openedIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  const onScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setIsAtBottom(distance <= STICK_THRESHOLD_PX);
  }, []);

  // Land at the bottom of a freshly opened thread before the browser paints, so
  // the history never flashes from the top.
  useLayoutEffect(() => {
    if (isLoading) return;
    if (openedIdRef.current === conversation.id) return;
    openedIdRef.current = conversation.id;
    setIsAtBottom(true);
    scrollToBottom('auto');
  }, [conversation.id, isLoading, scrollToBottom]);

  // Follow new traffic only while the admin is already reading the latest.
  const lastMessageId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (!lastMessageId || !isAtBottom) return;
    scrollToBottom('smooth');
  }, [lastMessageId, isTyping, isAtBottom, scrollToBottom]);

  if (isError) {
    return (
      <div className={styles.state}>
        <ErrorState
          title={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.state} aria-busy>
        <div className={styles.skeletons} aria-hidden>
          {[68, 45, 80, 38, 60].map((width, index) => (
            <div
              key={index}
              className={clsx(styles.skeletonRow, index % 2 === 1 && styles.skeletonOwn)}
            >
              <Skeleton width={`${width}%`} height="52px" radius="var(--radius-xl)" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={styles.state}>
        <div className={styles.firstMessage}>
          <span className={styles.firstIcon}>
            <MessageCircleIcon />
          </span>
          <p className={styles.firstTitle}>
            {t('chat.thread.firstMessageTitle', { name: conversation.owner.name })}
          </p>
          <p className={styles.firstHint}>{t('chat.thread.firstMessageHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.host}>
      <div
        ref={scrollRef}
        className={styles.scroll}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t('chat.thread.label', { name: conversation.owner.name })}
        data-testid="chat-thread"
      >
        <ol className={styles.list}>
          {messages.map((message, index) => {
            const previous = index > 0 ? messages[index - 1] : undefined;
            const showDay =
              !previous || !isSameDay(previous.createdAt, message.createdAt);

            if (message.senderType === 'system') {
              return (
                <ThreadItem key={message.id} showDay={showDay} iso={message.createdAt}>
                  <SystemEventPill message={message} />
                </ThreadItem>
              );
            }

            const isOwner = message.senderType === 'owner';
            const senderName = isOwner
              ? conversation.owner.name
              : (message.senderName ?? t('chat.thread.administration'));

            return (
              <ThreadItem key={message.id} showDay={showDay} iso={message.createdAt}>
                <MessageBubble
                  message={message}
                  isGrouped={!showDay && isGroupedWith(previous, message)}
                  senderName={senderName}
                  senderPhotoUrl={isOwner ? conversation.owner.photoUrl : undefined}
                  onRetry={onRetryMessage}
                />
              </ThreadItem>
            );
          })}

          {isTyping && (
            <li className={styles.typingRow} data-testid="chat-typing">
              <Avatar
                src={conversation.owner.photoUrl}
                name={conversation.owner.name}
                size="sm"
              />
              <span
                className={styles.typingBubble}
                aria-label={t('chat.thread.typingBy', { name: conversation.owner.name })}
                role="status"
              >
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </span>
            </li>
          )}
        </ol>
      </div>

      {!isAtBottom && (
        <button
          type="button"
          className={styles.jump}
          onClick={() => scrollToBottom('smooth')}
          data-testid="chat-jump-latest"
        >
          <ChevronDownIcon />
          {t('chat.thread.jumpToLatest')}
        </button>
      )}
    </div>
  );
}

/**
 * A thread entry, optionally preceded by its day separator. Written as a
 * fragment rather than nesting the separator inside the item so both stay direct
 * children of the <ol> and the list semantics survive.
 */
function ThreadItem({
  showDay,
  iso,
  children,
}: {
  showDay: boolean;
  iso: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {showDay && <DaySeparator iso={iso} />}
      {children}
    </>
  );
}

function isSameDay(a: string, b: string): boolean {
  const left = new Date(a);
  const right = new Date(b);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/** Same author, same side, within the grouping window. */
function isGroupedWith(previous: ChatMessage | undefined, message: ChatMessage): boolean {
  if (!previous) return false;
  if (previous.senderType !== message.senderType) return false;
  if (previous.senderType === 'system') return false;
  // Two different admins answering in a row must each be named.
  if (message.senderType === 'admin' && previous.senderName !== message.senderName) return false;
  return Date.parse(message.createdAt) - Date.parse(previous.createdAt) < GROUP_WINDOW_MS;
}
