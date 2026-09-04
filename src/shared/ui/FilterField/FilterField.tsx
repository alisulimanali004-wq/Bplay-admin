import type { ReactNode } from 'react';
import { clsx } from '../clsx';
import styles from './FilterField.module.css';

export interface FilterFieldProps {
  /** Visible caption naming the filter, so it's self-describing without opening it. */
  label: string;
  /** Small type-hint icon shown before the caption. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * A labeled filter control for list-page toolbars: a small icon + caption sit
 * above the control (Select / SearchInput / …) so every filter says what it does
 * at a glance. Used across all feature filter bars for one consistent look.
 */
export function FilterField({ label, icon, children, className }: FilterFieldProps) {
  return (
    <div className={clsx(styles.field, className)}>
      <span className={styles.caption}>
        {icon && (
          <span className={styles.icon} aria-hidden>
            {icon}
          </span>
        )}
        <span className={styles.text}>{label}</span>
      </span>
      {children}
    </div>
  );
}
