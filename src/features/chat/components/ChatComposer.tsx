import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, LockIcon, SendIcon, clsx } from '@ui';
import {
  MESSAGE_COUNTER_THRESHOLD,
  MESSAGE_MAX_LENGTH,
  type Conversation,
} from '../api/chat.types';
import { canReplyTo } from '../api/chat.types';
import { sendMessageSchema } from '../api/chat.schema';
import styles from './chatComposer.module.css';

interface Props {
  conversation: Conversation;
  onSend: (body: string) => void;
  isSending: boolean;
}

/** Grows to this many pixels, then scrolls — a composer must not eat the thread. */
const MAX_HEIGHT_PX = 168;

/**
 * FR-ADM-CHAT-003 — the composer. TEXT ONLY (CH3): there is deliberately no
 * paperclip here, because attachments are FR-ADM-CHAT-005 (V2) and would need
 * backend support that does not exist.
 *
 * Keyboard contract, the one every messenger shares and users expect:
 *   Enter         → send
 *   Shift + Enter → newline
 * Enter is not hijacked while an IME composition is active, or typing Arabic or
 * any other composed script would send half a word.
 *
 * A CLOSED thread renders a read-only notice instead of the field: disabling a
 * textarea and leaving it looking writable is the worse of the two failures.
 */
export function ChatComposer({ conversation, onSend, isSending }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  const canReply = canReplyTo(conversation);

  const autoGrow = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    // Reset first: without it the box can only ever grow, never shrink back.
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, []);

  // Switching threads must not carry a half-typed message across to the next
  // owner — that is a real disclosure risk, not just an annoyance.
  useEffect(() => {
    setValue('');
    setError(null);
    const node = textareaRef.current;
    if (node) node.style.height = 'auto';
  }, [conversation.id]);

  const submit = () => {
    const result = sendMessageSchema.safeParse({ body: value });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'chat.errors.messageRequired');
      return;
    }
    setError(null);
    setValue('');
    const node = textareaRef.current;
    if (node) {
      node.style.height = 'auto';
      // Keep focus in the field: an admin answering a thread usually writes again.
      node.focus();
    }
    onSend(result.data.body);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (isComposingRef.current || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

  if (!canReply) {
    return (
      <div className={styles.closed} data-testid="chat-composer-closed">
        <LockIcon />
        <span>{t('chat.composer.closed')}</span>
      </div>
    );
  }

  const remaining = MESSAGE_MAX_LENGTH - value.length;
  const showCounter = remaining <= MESSAGE_COUNTER_THRESHOLD;
  const isEmpty = value.trim().length === 0;

  return (
    <form
      className={styles.composer}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      data-testid="chat-composer"
    >
      <div className={clsx(styles.field, error && styles.fieldError)}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          rows={1}
          value={value}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={t('chat.composer.placeholder', { name: conversation.owner.name })}
          aria-label={t('chat.composer.label')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'chat-composer-error' : undefined}
          dir="auto"
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
            autoGrow();
          }}
          onKeyDown={onKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          data-testid="chat-input"
        />

        <IconButton
          type="submit"
          className={styles.send}
          label={t('chat.actions.send')}
          icon={<SendIcon className="flipInRtl" />}
          disabled={isEmpty}
          isLoading={isSending}
          data-testid="chat-send"
        />
      </div>

      <div className={styles.footRow}>
        {error ? (
          <p className={styles.error} id="chat-composer-error" role="alert">
            {t(error, { max: MESSAGE_MAX_LENGTH })}
          </p>
        ) : (
          <p className={styles.hint}>{t('chat.composer.hint')}</p>
        )}
        {showCounter && (
          <span className={clsx(styles.counter, remaining <= 0 && styles.counterOver)}>
            {remaining}
          </span>
        )}
      </div>
    </form>
  );
}
