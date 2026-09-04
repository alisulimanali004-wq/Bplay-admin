import { useId, useRef, useState, type DragEvent } from 'react';
import { clsx } from '../clsx';
import {
  UploadCloudIcon,
  XIcon,
  DocumentIcon,
  ImageIcon,
  ArrowStartIcon,
  ChevronEndIcon,
} from '../icons';
import { Thumb } from '../Thumb/Thumb';
import styles from './FileUpload.module.css';

/** One uploaded asset. `url` is an object URL in mock mode, a remote URL post-backend. */
export interface UploadedFile {
  url: string;
  name: string;
}

export interface FileUploadProps {
  /** Controlled list of files. */
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  /** 'image' → thumbnail grid with reorder + cover badge; 'document' → named file list. */
  variant?: 'image' | 'document';
  /** Accept attribute for the native picker (e.g. 'image/*', '.pdf,image/*'). */
  accept?: string;
  /** Hard cap on the number of files; the dropzone hides once reached. */
  maxFiles?: number;
  disabled?: boolean;
  /** Props-driven strings — the kit never calls useTranslation. */
  dropLabel: string;
  browseLabel: string;
  hint?: string;
  removeLabel: string;
  coverLabel?: string;
  moveEarlierLabel?: string;
  moveLaterLabel?: string;
  maxReachedLabel?: string;
  /**
   * Persist a picked file and return its durable URL.
   *
   * Without this the component falls back to `URL.createObjectURL`, which is
   * fine for mocks but produces a `blob:` URL scoped to the current tab — store
   * one and it is already dead when the record is reopened. Pass an uploader
   * wherever the URL is going to be SAVED.
   */
  uploadFile?: (file: File) => Promise<string>;
  /** Announced while an upload is in flight. */
  uploadingLabel?: string;
  /** Shown if an upload fails; the file is dropped rather than stored broken. */
  uploadErrorLabel?: string;
  testId?: string;
}

/**
 * A free, mock-first file uploader. Drag-and-drop or browse to add files; every
 * file becomes an { url, name } via URL.createObjectURL — so going live only
 * swaps the object-URL step for a real upload call. Images render as a reorderable
 * thumbnail grid (first = cover); documents render as a named list. Fully keyboard
 * accessible and RTL-safe (logical properties + start/end move controls).
 */
export function FileUpload({
  value,
  onChange,
  variant = 'image',
  accept = variant === 'image' ? 'image/*' : undefined,
  maxFiles,
  disabled = false,
  dropLabel,
  browseLabel,
  hint,
  removeLabel,
  coverLabel,
  moveEarlierLabel,
  moveLaterLabel,
  maxReachedLabel,
  uploadFile,
  uploadingLabel,
  uploadErrorLabel,
  testId,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  const atMax = typeof maxFiles === 'number' && value.length >= maxFiles;
  const remaining = typeof maxFiles === 'number' ? maxFiles - value.length : Infinity;

  const addFiles = async (files: FileList | null) => {
    if (!files || disabled) return;
    const incoming = Array.from(files).slice(0, remaining === Infinity ? undefined : remaining);
    if (incoming.length === 0) return;

    if (!uploadFile) {
      const mapped = incoming.map((file) => ({ url: URL.createObjectURL(file), name: file.name }));
      onChange([...value, ...mapped]);
      return;
    }

    // A file that fails to upload is DROPPED, not added with a dead URL: an
    // entry the form would happily submit as a broken link is worse than a
    // visible failure the admin can retry.
    setUploading(true);
    setUploadError(false);
    try {
      const settled = await Promise.allSettled(
        incoming.map(async (file) => ({ url: await uploadFile(file), name: file.name })),
      );
      const uploaded = settled
        .filter((r): r is PromiseFulfilledResult<UploadedFile> => r.status === 'fulfilled')
        .map((r) => r.value);
      if (uploaded.length !== incoming.length) setUploadError(true);
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled || atMax) return;
    void addFiles(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled && !atMax) setDragging(true);
  };

  const remove = (index: number) => {
    // Free the object URL we minted for this file (seeded remote URLs are left alone).
    const removed = value[index];
    if (removed && removed.url.startsWith('blob:')) URL.revokeObjectURL(removed.url);
    onChange(value.filter((_, i) => i !== index));
  };

  const swap = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div className={styles.wrap} data-testid={testId}>
      {!atMax && (
        <div
          className={clsx(styles.dropzone, dragging && styles.dragging, disabled && styles.disabled)}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || undefined}
          onClick={disabled ? undefined : openPicker}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openPicker();
            }
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          data-testid={testId ? `${testId}-dropzone` : undefined}
        >
          <span className={styles.dropIcon} aria-hidden>
            <UploadCloudIcon />
          </span>
          <span className={styles.dropTitle}>{dropLabel}</span>
          <span className={styles.browse}>{browseLabel}</span>
          {hint && <span className={styles.hint}>{hint}</span>}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className={styles.input}
            accept={accept}
            multiple
            disabled={disabled || uploading}
            onChange={(event) => {
              const picked = event.target.files;
              // Reset BEFORE awaiting: `event.target` is pooled and clearing it
              // after the upload resolves can null out the next selection.
              event.target.value = '';
              void addFiles(picked);
            }}
            tabIndex={-1}
          />
        </div>
      )}

      {atMax && maxReachedLabel && <p className={styles.maxNote}>{maxReachedLabel}</p>}

      {uploading && uploadingLabel && (
        <p className={styles.maxNote} role="status">
          {uploadingLabel}
        </p>
      )}
      {uploadError && uploadErrorLabel && (
        <p className={styles.uploadError} role="alert">
          {uploadErrorLabel}
        </p>
      )}

      {value.length > 0 &&
        (variant === 'image' ? (
          <ul className={styles.grid}>
            {value.map((file, index) => (
              <li key={file.url} className={styles.thumb}>
                <Thumb
                  className={styles.thumbImg}
                  fallbackClassName={styles.thumbFallback}
                  src={file.url}
                  alt={file.name}
                  fallback={<ImageIcon />}
                />
                {index === 0 && coverLabel && <span className={styles.cover}>{coverLabel}</span>}
                <div className={styles.thumbBar}>
                  <button
                    type="button"
                    className={styles.thumbBtn}
                    onClick={() => swap(index, index - 1)}
                    disabled={index === 0}
                    aria-label={moveEarlierLabel}
                    title={moveEarlierLabel}
                  >
                    <ArrowStartIcon />
                  </button>
                  <button
                    type="button"
                    className={styles.thumbBtn}
                    onClick={() => swap(index, index + 1)}
                    disabled={index === value.length - 1}
                    aria-label={moveLaterLabel}
                    title={moveLaterLabel}
                  >
                    <ChevronEndIcon />
                  </button>
                  <button
                    type="button"
                    className={clsx(styles.thumbBtn, styles.thumbRemove)}
                    onClick={() => remove(index)}
                    aria-label={removeLabel}
                    title={removeLabel}
                  >
                    <XIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={styles.docList}>
            {value.map((file, index) => (
              <li key={file.url} className={styles.docRow}>
                <span className={styles.docIcon} aria-hidden>
                  <DocumentIcon />
                </span>
                <span className={styles.docName} title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  className={styles.docRemove}
                  onClick={() => remove(index)}
                  aria-label={removeLabel}
                  title={removeLabel}
                >
                  <XIcon />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
