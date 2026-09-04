import { StarIcon } from '../icons';
import { clsx } from '../clsx';
import styles from './RatingStars.module.css';

export interface RatingStarsProps {
  value?: number | null;
  size?: 'sm' | 'md';
}

const STAR_COUNT = 5;

/**
 * Read-only 5-star rating. Rounds to the nearest half — the half star is a
 * filled star at half opacity. Null/undefined renders a muted em-dash with an
 * sr-only "no rating". The whole widget is one img-role node labelled
 * "{value} out of 5"; the stars and the numeric text are decorative.
 */
export function RatingStars({ value, size = 'sm' }: RatingStarsProps) {
  if (value === null || value === undefined) {
    return (
      <span className={clsx(styles.wrap, styles[size])}>
        <span className={styles.dash} aria-hidden>
          &mdash;
        </span>
        <span className={styles.srOnly}>no rating</span>
      </span>
    );
  }

  const clamped = Math.min(Math.max(value, 0), STAR_COUNT);
  const rounded = Math.round(clamped * 2) / 2;
  const whole = Math.floor(rounded);
  const hasHalf = rounded - whole === 0.5;

  return (
    <span
      className={clsx(styles.wrap, styles[size])}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5`}
    >
      <span className={styles.stars} aria-hidden>
        {Array.from({ length: STAR_COUNT }, (_, index) => {
          const isFilled = index < whole;
          const isHalf = index === whole && hasHalf;
          return (
            <StarIcon
              key={index}
              className={clsx(
                styles.star,
                isHalf && styles.half,
                !isFilled && !isHalf && styles.empty,
              )}
              fill={isFilled || isHalf ? 'currentColor' : undefined}
            />
          );
        })}
      </span>
      <span className={styles.value} aria-hidden>
        {clamped.toFixed(1)}
      </span>
    </span>
  );
}
