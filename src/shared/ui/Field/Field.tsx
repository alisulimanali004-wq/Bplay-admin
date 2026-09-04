import type { ReactNode } from 'react';
import { clsx } from '../clsx';
import styles from './Field.module.css';

export interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  /**
   * Tint the contained control's border red on error. Defaults to true (correct
   * for a single Input/Select/Textarea). Set false for a composite child that
   * renders its own inputs (e.g. a search-and-pick widget), so its inner inputs
   * aren't reddened — the error message still shows.
   */
  tintControl?: boolean;
  children: ReactNode;
}

/** Label + hint + role="alert" error wrapper. The control (Input/Select/…) is the child. */
export function Field({
  label,
  error,
  hint,
  required,
  htmlFor,
  className,
  tintControl = true,
  children,
}: FieldProps) {
  return (
    <div className={clsx(styles.field, className)} data-invalid={error && tintControl ? '' : undefined}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {required && (
            <span className={styles.req} aria-hidden>
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
