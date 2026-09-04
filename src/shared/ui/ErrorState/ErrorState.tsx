import { Button } from '../Button/Button';
import { AlertTriangleIcon } from '../icons';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retryLabel = 'Retry',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className={styles.host}>
      <span className={styles.icon}>
        <AlertTriangleIcon />
      </span>
      <p className={styles.title}>{title}</p>
      {message && <p className={styles.desc}>{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
