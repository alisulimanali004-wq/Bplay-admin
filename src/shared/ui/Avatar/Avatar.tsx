import { useState } from 'react';
import { clsx } from '../clsx';
import styles from './Avatar.module.css';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  // A dead avatar URL used to render the browser's own broken-image glyph — a
  // torn page with the alt text beside it — in every table row, chat header and
  // detail page at once. The initials fallback below was only ever reached when
  // the URL was ABSENT, never when it FAILED, which is the common case: seeded
  // rows, deleted uploads, and a rotated APP_URL all leave a present-but-dead src.
  //
  // Tracking the failed URL (rather than a boolean) is what makes this reset by
  // itself: a new `src` no longer matches, so the next avatar gets a fair try
  // without an effect to clear the flag.
  const [failedSrc, setFailedSrc] = useState<string | undefined>();

  if (src && src !== failedSrc) {
    return (
      <img
        className={clsx(styles.avatar, styles[size])}
        src={src}
        alt={name}
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return (
    <span className={clsx(styles.avatar, styles[size], styles.fallback)} role="img" aria-label={name}>
      {getInitials(name)}
    </span>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
