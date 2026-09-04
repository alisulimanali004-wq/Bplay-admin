import { useTranslation } from 'react-i18next';
import { Badge, StadiumIcon, Thumb, clsx } from '@ui';
import type { FacilityKind } from '../api/facility.types';
import styles from './PhotoStrip.module.css';

export interface PhotoStripProps {
  images: string[];
  kind: FacilityKind;
  /** Facility name — the hero image's alt text. */
  name: string;
}

/**
 * The review card's photo band: the first image is a ~62% hero with the next
 * shots peeking behind it on a scroll-snap x-axis. A single image stretches to
 * fill the band; no images fall back to a quiet stadium glyph. The facility
 * kind is overlaid on the hero corner on a dark scrim pill.
 */
export function PhotoStrip({ images, kind, name }: PhotoStripProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.strip}>
      {images.length === 0 ? (
        <div className={styles.fallback} aria-hidden>
          <StadiumIcon />
        </div>
      ) : (
        <div className={styles.scroller}>
          {images.map((src, index) => (
            <Thumb
              key={`${index}-${src}`}
              src={src}
              alt={index === 0 ? name : ''}
              className={clsx(styles.photo, index === 0 && styles.hero)}
              fallbackClassName={clsx(
                styles.photo,
                index === 0 && styles.hero,
                styles.fallback,
              )}
              fallback={<StadiumIcon />}
            />
          ))}
        </div>
      )}
      <span className={styles.kindBadge}>
        <Badge variant={kind === 'club' ? 'info' : 'success'} size="sm">
          {t(`facility.kind.${kind}`)}
        </Badge>
      </span>
    </div>
  );
}
