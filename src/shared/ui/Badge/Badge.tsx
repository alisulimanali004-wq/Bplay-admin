import type { ReactNode } from 'react';
import { clsx } from '../clsx';
import styles from './Badge.module.css';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'neutral' | 'info' | 'caution';

export interface BadgeProps {
  variant: BadgeVariant;
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function Badge({ variant, size = 'md', children }: BadgeProps) {
  return <span className={clsx(styles.badge, styles[variant], styles[size])}>{children}</span>;
}
