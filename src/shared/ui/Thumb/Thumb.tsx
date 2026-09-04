import { useState, type ReactNode } from 'react';

export interface ThumbProps {
  /** The image URL. Already resolved — pass `resolveUploadUrl(...)` output. */
  src?: string;
  /** Alt text. Decorative thumbnails next to their own label pass `''`. */
  alt?: string;
  /** Class for the `<img>` — the caller's own sizing/shape. */
  className?: string;
  /** Class for the fallback wrapper. Defaults to [className] when omitted. */
  fallbackClassName?: string;
  /** Rendered when there is no URL, or the URL fails to load. */
  fallback: ReactNode;
  loading?: 'lazy' | 'eager';
}

/**
 * An image that degrades to the caller's own placeholder instead of the
 * browser's broken-image glyph.
 *
 * Every list, card and profile in the dashboard already ships a designed
 * fallback tile — a stadium or image glyph on a quiet surface — but each one was
 * written as `{url ? <img/> : <fallback/>}`, so the tile appeared only when the
 * URL was ABSENT. A present-but-dead URL (a deleted upload, a row stamped with a
 * stale APP_URL, an unreachable seed host) fell straight through to a torn-page
 * icon with the alt text next to it, which is both ugly and misreads as data
 * corruption to whoever is reviewing the record.
 *
 * Tracking the failed URL (rather than a boolean) makes this self-resetting: a
 * new `src` no longer matches the stored one, so it gets a fair try with no
 * effect to clear the flag — the same shape [Avatar] uses.
 */
export function Thumb({
  src,
  alt = '',
  className,
  fallbackClassName,
  fallback,
  loading = 'lazy',
}: ThumbProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();

  if (src && src !== failedSrc) {
    return (
      <img
        className={className}
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return (
    <span className={fallbackClassName ?? className} aria-hidden>
      {fallback}
    </span>
  );
}
