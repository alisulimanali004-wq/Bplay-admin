import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangleIcon,
  Avatar,
  DocumentIcon,
  DocumentViewerModal,
  ImageIcon,
  ImageLightbox,
  RotateCcwIcon,
  Thumb,
  clsx,
  type LightboxItem,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { isSafeHttpUrl, safeHttpUrl } from '@shared/utils/url';
import { useChatFormat } from '../hooks/useChatFormat';
import { DeliveryTicks } from './ChatBadges';
import type { ChatAttachment, ChatMessage } from '../api/chat.types';
import styles from './messageBubble.module.css';

interface Props {
  message: ChatMessage;
  /** True when the previous bubble came from the same side within the group gap. */
  isGrouped: boolean;
  senderPhotoUrl?: string;
  senderName: string;
  onRetry: (message: ChatMessage) => void;
}

/**
 * One message (FR-ADM-CHAT-002: "تمييز المُرسِل").
 *
 * The administration's own messages sit on the inline-END side in the brand mint
 * with dark ink on it; the owner's sit on the inline-START side on the raised
 * forest surface. That is the universal messenger convention, and both pairings
 * clear WCAG AA comfortably.
 *
 * Consecutive messages from the same side are GROUPED: only the first carries an
 * avatar and an author line, so a burst reads as one turn rather than as five
 * separate cards.
 */
export function MessageBubble({
  message,
  isGrouped,
  senderPhotoUrl,
  senderName,
  onRetry,
}: Props) {
  const { t } = useTranslation();
  const fmt = useChatFormat();
  const isOwn = message.senderType === 'admin';
  const failed = message.deliveryStatus === 'failed';

  return (
    <li
      className={clsx(
        styles.row,
        isOwn ? styles.own : styles.other,
        isGrouped && styles.grouped,
        message.deliveryStatus === 'sending' && styles.pending,
      )}
      data-testid={`chat-message-${message.id}`}
    >
      <span className={styles.gutter}>
        {!isGrouped && !isOwn && (
          <Avatar src={senderPhotoUrl} name={senderName} size="sm" />
        )}
      </span>

      <div className={styles.stack}>
        {!isGrouped && (
          <p className={styles.author}>
            <span className={styles.authorName} dir="auto">
              {senderName}
            </span>
            {isOwn && message.senderRole && (
              <span className={styles.authorRole}>{t(`chat.role.${message.senderRole}`)}</span>
            )}
          </p>
        )}

        <div className={clsx(styles.bubble, failed && styles.failed)}>
          {message.body && (
            <p className={styles.body} dir="auto">
              {message.body}
            </p>
          )}

          {message.attachments.length > 0 && (
            <MessageAttachments attachments={message.attachments} />
          )}

          <span className={styles.meta}>
            <time className={styles.time} dateTime={message.createdAt}>
              {fmt.time(message.createdAt)}
            </time>
            {isOwn && <DeliveryTicks status={message.deliveryStatus} />}
          </span>
        </div>

        {failed && (
          <p className={styles.failedRow} role="alert">
            <AlertTriangleIcon className={styles.failedIcon} />
            <span>{t('chat.errors.sendFailed')}</span>
            <button
              type="button"
              className={styles.retry}
              onClick={() => onRetry(message)}
              data-testid={`chat-retry-${message.id}`}
            >
              <RotateCcwIcon />
              {t('chat.actions.retry')}
            </button>
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Inbound attachments. The admin cannot SEND one in V1 (CH3) but the owner app
 * can, so a message carrying files must render rather than appear empty.
 *
 * SECURITY: every `url` here was supplied by an owner, so each is gated by
 * `isSafeHttpUrl()` before it can reach an `src`, an `href` or a viewer. One
 * that fails the gate is still shown — the admin needs to know a file was
 * attached — but as an inert, clearly-marked chip. Documents open in
 * DocumentViewerModal, which keeps an upload walled off from this session by the
 * origin it is served from — see the security note there.
 */
function MessageAttachments({ attachments }: { attachments: ChatAttachment[] }) {
  const { t } = useTranslation();
  const fmt = useChatFormat();
  const lightbox = useDisclosure();
  const [startIndex, setStartIndex] = useState(0);
  const [viewing, setViewing] = useState<ChatAttachment | null>(null);

  // Carry the NORMALISED url forward, never the raw field: what we render a
  // label for must be exactly what the browser would open.
  const safe = attachments.flatMap((item) => {
    const url = safeHttpUrl(item.url);
    return url ? [{ ...item, url }] : [];
  });
  const blocked = attachments.filter((item) => !isSafeHttpUrl(item.url));
  const images = safe.filter((item) => item.type === 'image');
  const documents = safe.filter((item) => item.type !== 'image');

  const gallery: LightboxItem[] = images.map((item) => ({
    kind: 'image',
    src: item.url,
    alt: item.name,
  }));

  return (
    <div className={styles.attachments}>
      {images.length > 0 && (
        <div className={styles.thumbs}>
          {images.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={styles.thumb}
              onClick={() => {
                setStartIndex(index);
                lightbox.open();
              }}
              aria-label={t('chat.attachment.openImage', { name: item.name })}
            >
              <Thumb
                src={item.url}
                alt={item.name}
                fallbackClassName={styles.thumbFallback}
                fallback={<ImageIcon />}
              />
            </button>
          ))}
        </div>
      )}

      {documents.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.file}
          onClick={() => setViewing(item)}
          data-testid={`chat-attachment-${item.id}`}
        >
          <DocumentIcon className={styles.fileIcon} />
          <span className={styles.fileText}>
            <span className={styles.fileName} dir="auto">
              {item.name}
            </span>
            {item.sizeBytes !== undefined && (
              <span className={styles.fileSize}>{fmt.fileSize(item.sizeBytes)}</span>
            )}
          </span>
        </button>
      ))}

      {blocked.map((item) => (
        <span key={item.id} className={clsx(styles.file, styles.fileBlocked)}>
          <ImageIcon className={styles.fileIcon} />
          <span className={styles.fileText}>
            <span className={styles.fileName} dir="auto">
              {item.name}
            </span>
            <span className={styles.fileSize}>{t('chat.attachment.unsafe')}</span>
          </span>
        </span>
      ))}

      {gallery.length > 0 && (
        <ImageLightbox
          isOpen={lightbox.isOpen}
          onClose={lightbox.close}
          items={gallery}
          initialIndex={startIndex}
          alt={images[startIndex]?.name ?? t('chat.attachment.image')}
          closeLabel={t('common.close')}
        />
      )}

      {viewing && (
        <DocumentViewerModal
          isOpen
          onClose={() => setViewing(null)}
          url={viewing.url}
          title={viewing.name}
          kind="pdf"
          closeLabel={t('common.close')}
          errorLabel={t('common.docLoadError')}
        />
      )}
    </div>
  );
}
