import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Modal } from '../Modal/Modal';
import { IconButton } from '../IconButton/IconButton';
import { PlusIcon, MinusIcon, ChevronStartIcon, ChevronEndIcon } from '../icons';
import styles from './ImageLightbox.module.css';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.5;

/** One item in a media gallery — an image (zoom/pan) or a video (native controls). */
export interface LightboxItem {
  kind: 'image' | 'video';
  src: string;
  alt?: string;
}

export interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  /** Single-image source (legacy API); when absent and `items` is empty, `fallback` shows. */
  src?: string;
  /** Multi-item gallery (images + video). Takes precedence over `src` when non-empty. */
  items?: LightboxItem[];
  /** Starting gallery index when `items` is used. */
  initialIndex?: number;
  alt: string;
  title?: string;
  closeLabel?: string;
  /** Rendered when there is no media (e.g. an initials Avatar). */
  fallback?: ReactNode;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  resetLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * A large, framed media viewer built on the shared Modal (focus-trap, Esc /
 * overlay close, theme chrome). Images fill the stage and can be zoomed (buttons,
 * scroll wheel, double-click) and panned when zoomed; videos render native
 * `<video controls>`. Passing `items` turns it into a gallery with prev/next
 * navigation. The single-image `src` API is preserved and unchanged.
 */
export function ImageLightbox({
  isOpen,
  onClose,
  src,
  items,
  initialIndex = 0,
  alt,
  title,
  closeLabel,
  fallback,
  zoomInLabel = 'Zoom in',
  zoomOutLabel = 'Zoom out',
  resetLabel = 'Reset zoom',
  prevLabel = 'Previous',
  nextLabel = 'Next',
}: ImageLightboxProps) {
  const gallery: LightboxItem[] =
    items && items.length > 0 ? items : src ? [{ kind: 'image', src, alt }] : [];
  const hasMany = gallery.length > 1;

  const stageRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // A dead URL used to paint the browser's broken-image glyph across the whole
  // stage; the `fallback` node below was only reached when there was no item at
  // all. Keyed by src so navigating the gallery re-tries each shot on its own.
  const [failedSrc, setFailedSrc] = useState<string | undefined>();

  const item = gallery[index];
  const current = item && item.src === failedSrc ? undefined : item;
  const isImage = current?.kind === 'image';

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const applyScale = useCallback((next: number) => {
    const clamped = clamp(next, MIN_SCALE, MAX_SCALE);
    setScale(clamped);
    if (clamped === MIN_SCALE) setOffset({ x: 0, y: 0 });
  }, []);

  // On open, jump to the requested item and clear any prior zoom/pan.
  useEffect(() => {
    if (isOpen) {
      setIndex(clamp(initialIndex, 0, Math.max(0, gallery.length - 1)));
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset zoom/pan whenever the shown item changes.
  useEffect(() => {
    reset();
  }, [index, reset]);

  // Scroll-to-zoom (images only). Attached non-passively so preventDefault stops page scroll.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !isOpen || !isImage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      applyScale(scaleRef.current + (event.deltaY < 0 ? STEP : -STEP));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [isOpen, isImage, index, applyScale]);

  const step = (delta: number) => {
    if (gallery.length === 0) return;
    setIndex((i) => (i + delta + gallery.length) % gallery.length);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isImage || scale <= MIN_SCALE) return;
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start) return;
    setOffset({ x: start.ox + (event.clientX - start.x), y: start.oy + (event.clientY - start.y) });
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const zoomed = scale > MIN_SCALE;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl" closeLabel={closeLabel}>
      <div className={styles.viewer}>
        <div
          ref={stageRef}
          className={styles.stage}
          data-zoomed={isImage && zoomed ? '' : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onDoubleClick={isImage ? () => (zoomed ? reset() : applyScale(2)) : undefined}
        >
          {current ? (
            current.kind === 'video' ? (
              <video key={current.src} className={styles.video} src={current.src} controls />
            ) : (
              <img
                className={styles.image}
                src={current.src}
                alt={current.alt ?? alt}
                draggable={false}
                onError={() => setFailedSrc(current.src)}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transition: dragging ? 'none' : undefined,
                }}
              />
            )
          ) : (
            <div className={styles.fallback}>{fallback}</div>
          )}

          {hasMany && (
            <>
              <IconButton
                size="sm"
                variant="secondary"
                className={`${styles.navBtn} ${styles.navPrev}`}
                label={prevLabel}
                icon={<ChevronStartIcon className="flipInRtl" />}
                onClick={() => step(-1)}
              />
              <IconButton
                size="sm"
                variant="secondary"
                className={`${styles.navBtn} ${styles.navNext}`}
                label={nextLabel}
                icon={<ChevronEndIcon className="flipInRtl" />}
                onClick={() => step(1)}
              />
              <span className={styles.counter} aria-hidden>
                {index + 1} / {gallery.length}
              </span>
            </>
          )}
        </div>

        {isImage && (
          <div className={styles.controls}>
            <IconButton
              size="sm"
              variant="secondary"
              label={zoomOutLabel}
              icon={<MinusIcon />}
              onClick={() => applyScale(scale - STEP)}
              disabled={scale <= MIN_SCALE}
            />
            <button type="button" className={styles.zoomValue} onClick={reset} aria-label={resetLabel}>
              {Math.round(scale * 100)}%
            </button>
            <IconButton
              size="sm"
              variant="secondary"
              label={zoomInLabel}
              icon={<PlusIcon />}
              onClick={() => applyScale(scale + STEP)}
              disabled={scale >= MAX_SCALE}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
