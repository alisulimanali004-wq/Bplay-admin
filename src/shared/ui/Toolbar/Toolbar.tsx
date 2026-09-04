import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

/**
 * The list-page control row: search grows, filters keep their intrinsic size.
 * The optional `end` slot holds trailing controls (e.g. a Clear-filters button)
 * that sit at their natural width, pinned to the trailing edge.
 */
export function Toolbar({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return (
    <div className={styles.toolbar}>
      {children}
      {end && <div className={styles.end}>{end}</div>}
    </div>
  );
}
