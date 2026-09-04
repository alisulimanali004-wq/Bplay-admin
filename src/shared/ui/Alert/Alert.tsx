import type { ReactNode } from 'react';
import { clsx } from '../clsx';
import styles from './Alert.module.css';

export interface AlertProps {
  variant: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
}

export function Alert({ variant, title, children, onClose }: AlertProps) {
  return (
    <div className={clsx(styles.alert, styles[variant])} role="alert">
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.desc}>{children}</div>}
      </div>
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
      )}
    </div>
  );
}
