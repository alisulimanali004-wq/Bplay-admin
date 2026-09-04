import { useEffect, useState } from 'react';
import { Modal } from '../Modal/Modal';
import { ExternalLinkIcon } from '../icons';
import { isSameOriginUrl, safeHttpUrl } from '@shared/utils/url';
import styles from './DocumentViewer.module.css';

export interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The document source. When absent, `emptyLabel` is shown. */
  url?: string;
  /** Drives the render branch: an inline image vs an embedded PDF/file. */
  kind: 'image' | 'pdf';
  title?: string;
  alt?: string;
  closeLabel?: string;
  /** Label for the "open in a new tab" link (full-size / native viewer). */
  openLabel?: string;
  emptyLabel?: string;
  /** Hint shown under an embedded file (e.g. when a PDF preview may be blocked). */
  fallbackNote?: string;
  /** Shown in place of the stage when the file itself cannot be loaded. */
  errorLabel?: string;
}

/**
 * A viewer for an uploaded document, built on the shared Modal. An image renders
 * inline in a framed stage; a PDF/other file embeds in an iframe. Either way an
 * "open in a new tab" link gives the full native viewer (zoom, download, print).
 *
 * SECURITY: the document is USER-UPLOADED, so `url` is untrusted.
 *  - it goes through `safeHttpUrl()`, which rejects anything that is not
 *    http/https or a same-origin path (a `javascript:` document would otherwise
 *    run on click, and the admin's token lives in localStorage);
 *  - what actually isolates the file is the ORIGIN it is served from, not an
 *    iframe `sandbox`: uploads come from the API host, which is never the host
 *    this dashboard is served from, so the same-origin policy already denies the
 *    framed document any access to our DOM or our token. `sandbox` is therefore
 *    reserved for the one case where that is not true — see `canEmbed` below;
 *  - "open in a new tab" would run a same-origin upload as a top-level document
 *    on our own origin, so for same-origin sources the link DOWNLOADS instead.
 *
 * A PDF is deliberately framed WITHOUT `sandbox`. Chrome refuses to start its
 * built-in PDF viewer inside a sandboxed frame at all — with or without
 * `allow-same-origin` — and renders an empty error page instead, which is what
 * made every owner/facility KYC document preview as a blank white box.
 */
export function DocumentViewerModal({
  isOpen,
  onClose,
  url,
  kind,
  title,
  alt,
  closeLabel,
  openLabel = 'Open in a new tab',
  emptyLabel = 'No document to display.',
  fallbackNote,
  errorLabel = 'This document could not be loaded.',
}: DocumentViewerModalProps) {
  const src = safeHttpUrl(url);
  const sameOrigin = src !== undefined && isSameOriginUrl(src);

  // A same-origin upload is the only file that could reach our token, and it is
  // exactly the file a `sandbox` would have contained — but a sandboxed PDF does
  // not render at all, so there is no safe inline preview for that combination.
  // It falls back to the download link rather than silently showing nothing.
  const canEmbed = !sameOrigin;

  // A broken file (wiped by a redeploy, a bad URL) used to leave an empty stage
  // with no explanation, which is indistinguishable from a blocked preview.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl" closeLabel={closeLabel}>
      <div className={styles.viewer}>
        {src && (
          <div className={styles.toolbar}>
            <a
              className={styles.open}
              href={src}
              target="_blank"
              rel="noreferrer"
              // Same-origin uploads are saved, not opened: navigating to one at
              // top level would run it in this origin and defeat the sandbox.
              download={isSameOriginUrl(src) ? (title ?? '') : undefined}
            >
              <ExternalLinkIcon />
              {openLabel}
            </a>
          </div>
        )}

        <div className={styles.stage}>
          {!src ? (
            <p className={styles.empty}>{emptyLabel}</p>
          ) : failed ? (
            <p className={styles.empty}>{errorLabel}</p>
          ) : kind === 'image' ? (
            <img
              className={styles.image}
              src={src}
              alt={alt ?? title ?? ''}
              onError={() => setFailed(true)}
            />
          ) : canEmbed ? (
            <iframe className={styles.frame} src={src} title={title ?? 'document'} />
          ) : (
            <p className={styles.empty}>{fallbackNote ?? emptyLabel}</p>
          )}
        </div>

        {src && kind === 'pdf' && canEmbed && !failed && fallbackNote && (
          <p className={styles.note}>{fallbackNote}</p>
        )}
      </div>
    </Modal>
  );
}
