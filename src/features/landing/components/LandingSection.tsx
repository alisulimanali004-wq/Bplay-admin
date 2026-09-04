import type { ReactNode } from 'react';
import { clsx } from '@ui';
import styles from './LandingSection.module.css';

export interface LandingSectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

/** Consistent vertical rhythm + centered max-width container for every landing block. */
export function LandingSection({ id, className, children }: LandingSectionProps) {
  return (
    <section id={id} className={clsx(styles.section, className)}>
      <div className={styles.inner}>{children}</div>
    </section>
  );
}
