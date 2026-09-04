import { clsx } from '../clsx';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ size = 'md', label = 'Loading' }: SpinnerProps) {
  return <span className={clsx(styles.spinner, styles[size])} role="status" aria-label={label} />;
}
