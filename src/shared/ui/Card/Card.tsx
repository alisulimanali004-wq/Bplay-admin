import type { HTMLAttributes } from 'react';
import { clsx } from '../clsx';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
  /** `glass` = the frosted forest-glass surface used by the dashboard panels. */
  variant?: 'solid' | 'glass';
}

export function Card({ padding = 'md', variant = 'solid', className, children, ...rest }: CardProps) {
  return (
    <div className={clsx(styles.card, styles[padding], styles[variant], className)} {...rest}>
      {children}
    </div>
  );
}
