import type { ReactNode } from 'react';
import { Avatar } from '../Avatar/Avatar';
import { clsx } from '../clsx';
import styles from './UserCell.module.css';

export interface UserCellProps {
  name: string;
  email?: string;
  photoUrl?: string;
  /** When set, the cell renders as a button (e.g. opens the detail page). */
  onClick?: () => void;
  /** Trailing content pinned to the end (e.g. a timestamp or status badge). Keep it non-interactive when `onClick` is set. */
  trailing?: ReactNode;
  testId?: string;
}

/**
 * A rich person cell: avatar + name over a muted secondary line (email), with an
 * optional trailing slot. With `onClick` it becomes a keyboard-accessible button
 * whose name underlines on hover — the canonical clickable person cell.
 */
export function UserCell({ name, email, photoUrl, onClick, trailing, testId }: UserCellProps) {
  const content = (
    <>
      <Avatar src={photoUrl} name={name} size="sm" />
      <span className={styles.text}>
        <span className={styles.name}>{name}</span>
        {email && <span className={styles.email}>{email}</span>}
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={clsx(styles.cell, styles.button)}
        onClick={onClick}
        data-testid={testId}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={styles.cell} data-testid={testId}>
      {content}
    </div>
  );
}
