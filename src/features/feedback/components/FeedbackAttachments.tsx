import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangleIcon,
  Button,
  DocumentIcon,
  DocumentViewerModal,
  ImageIcon,
  ImageLightbox,
  Thumb,
  type LightboxItem,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { isSafeHttpUrl, safeHttpUrl } from '@shared/utils/url';
import type { FeedbackAttachment } from '../api/feedback.types';
import styles from './feedbackAttachments.module.css';

interface Props {
  attachments: FeedbackAttachment[];
}

/**
 * The sender's attachments.
 *
 * SECURITY: every `url` here was supplied by a player or an owner, so each one is
 * gated by `isSafeHttpUrl()` before it can reach an `src`, an `href` or a viewer.
 * An attachment that fails the gate is still SHOWN — an admin needs to know the
 * sender attached something — but as an inert, clearly-marked chip that cannot be
 * clicked. PDFs open in DocumentViewerModal, which keeps an upload walled off
 * from this session by the origin it is served from — see the security note there.
 */
export function FeedbackAttachments({ attachments }: Props) {
  const { t } = useTranslation();
  const lightbox = useDisclosure();
  const [startIndex, setStartIndex] = useState(0);
  const [viewing, setViewing] = useState<FeedbackAttachment | null>(null);

  if (attachments.length === 0) return null;

  // Carry the NORMALISED url forward, never the raw field: what we render a
  // label for must be exactly what the browser would open.
  const safe = attachments.flatMap((item) => {
    const url = safeHttpUrl(item.url);
    return url ? [{ ...item, url }] : [];
  });
  const blocked = attachments.filter((item) => !isSafeHttpUrl(item.url));
  const images = safe.filter((item) => item.kind === 'image');
  const documents = safe.filter((item) => item.kind !== 'image');

  const gallery: LightboxItem[] = images.map((item) => ({
    kind: 'image',
    src: item.url,
    alt: item.name,
  }));

  const openImage = (index: number) => {
    setStartIndex(index);
    lightbox.open();
  };

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>
        {t('feedback.detail.attachments')}
        <span className={styles.count}>{attachments.length}</span>
      </h3>

      {images.length > 0 && (
        <div className={styles.grid}>
          {images.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={styles.thumb}
              onClick={() => openImage(index)}
              aria-label={t('feedback.detail.openAttachment', { name: item.name })}
              data-testid={`feedback-attachment-${item.id}`}
            >
              <Thumb
                src={item.url}
                fallbackClassName={styles.thumbFallback}
                fallback={<ImageIcon />}
              />
            </button>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <ul className={styles.docs}>
          {documents.map((item) => (
            <li key={item.id} className={styles.doc}>
              <DocumentIcon />
              <span className={styles.docName}>{item.name}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setViewing(item)}
                data-testid={`feedback-attachment-${item.id}`}
              >
                {t('feedback.detail.view')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {blocked.length > 0 && (
        <ul className={styles.docs}>
          {blocked.map((item) => (
            <li
              key={item.id}
              className={styles.blocked}
              data-testid={`feedback-attachment-blocked-${item.id}`}
            >
              <AlertTriangleIcon />
              <span className={styles.docName}>{item.name}</span>
              <span className={styles.blockedNote}>{t('feedback.detail.attachmentBlocked')}</span>
            </li>
          ))}
        </ul>
      )}

      <ImageLightbox
        isOpen={lightbox.isOpen}
        onClose={lightbox.close}
        items={gallery}
        initialIndex={startIndex}
        alt={t('feedback.detail.attachments')}
        title={t('feedback.detail.attachments')}
        closeLabel={t('common.close')}
        zoomInLabel={t('common.zoomIn')}
        zoomOutLabel={t('common.zoomOut')}
        resetLabel={t('common.resetZoom')}
      />

      <DocumentViewerModal
        isOpen={viewing !== null}
        onClose={() => setViewing(null)}
        url={viewing?.url}
        kind={viewing?.kind ?? 'pdf'}
        title={viewing?.name}
        closeLabel={t('common.close')}
        openLabel={t('feedback.detail.openInNewTab')}
        emptyLabel={t('feedback.detail.attachmentEmpty')}
        errorLabel={t('common.docLoadError')}
      />
    </div>
  );
}
