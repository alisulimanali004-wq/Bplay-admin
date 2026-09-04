import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { clsx } from '../clsx';
import styles from './StatCard.module.css';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: 'primary' | 'secondary' | 'info' | 'warning';
  /** Animate numeric values counting up on first mount (reduced-motion: instant). */
  countUp?: boolean;
}

/**
 * KPI tile with a 4px accent bar on the inline-start edge. Numeric values can
 * count up on mount (~600ms); string values (pre-formatted currency, etc.)
 * always render instantly, as does everything under reduced motion.
 */
export function StatCard({ label, value, icon, accent = 'primary', countUp = false }: StatCardProps) {
  const reduceMotion = useReducedMotion();
  const shouldCount = countUp && typeof value === 'number' && !reduceMotion;
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!shouldCount || typeof value !== 'number') return;
    const controls = animate(fromRef.current, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplay(Number.isInteger(value) ? Math.round(latest) : Math.round(latest * 10) / 10);
      },
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [shouldCount, value]);

  const shown = shouldCount
    ? display.toLocaleString()
    : typeof value === 'number'
      ? value.toLocaleString()
      : value;

  return (
    <div className={clsx(styles.card, styles[accent])}>
      <div className={styles.meta}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{shown}</span>
      </div>
      {icon && (
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      )}
    </div>
  );
}
