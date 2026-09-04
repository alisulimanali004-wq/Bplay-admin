import { motion, useReducedMotion } from 'framer-motion';
import { clsx } from '@ui';
import styles from './HeroBalls.module.css';

/* The original playful floating sports balls, restored over the new hero.
   Kept decorative (aria-hidden) and frozen under reduced-motion. */
const BALLS = [
  { emoji: '⚽', cls: 'football', y: -20, rot: 360, dur: 8 },
  { emoji: '🏀', cls: 'basketball', y: 20, rot: -360, dur: 7 },
  { emoji: '🎾', cls: 'tennis', y: -18, rot: 360, dur: 6 },
  { emoji: '🏐', cls: 'volleyball', y: 18, rot: -360, dur: 9 },
] as const;

/** Decorative floating sports balls behind the hero content (desktop only). */
export function HeroBalls() {
  const reduce = useReducedMotion();
  return (
    <div className={styles.layer} aria-hidden>
      {BALLS.map(({ emoji, cls, y, rot, dur }) => (
        <motion.span
          key={cls}
          className={clsx(styles.ball, styles[cls])}
          animate={reduce ? undefined : { y: [0, y, 0], rotate: [0, rot] }}
          transition={reduce ? undefined : { duration: dur, repeat: Infinity, ease: 'easeInOut' }}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}
