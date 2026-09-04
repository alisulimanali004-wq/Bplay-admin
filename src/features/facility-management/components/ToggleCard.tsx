import type { ReactNode } from 'react';
import { CheckIcon, clsx } from '@ui';
import styles from './ToggleCard.module.css';

export interface ToggleCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  'data-testid'?: string;
}

/**
 * A large selectable tile (wizard step 1's club/pitch choice). A plain button
 * with aria-pressed; selection is a mint border + glass fill + corner check.
 */
export function ToggleCard({
  title,
  description,
  icon,
  selected,
  onSelect,
  'data-testid': testId,
}: ToggleCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(styles.card, selected && styles.selected)}
      onClick={onSelect}
      data-testid={testId}
    >
      {selected && (
        <span className={styles.check} aria-hidden>
          <CheckIcon />
        </span>
      )}
      {icon && (
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      )}
      <span className={styles.title}>{title}</span>
      {description && <span className={styles.description}>{description}</span>}
    </button>
  );
}
