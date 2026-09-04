import type { ReactNode } from 'react';
import styles from './PageContainer.module.css';

/** The vertical-rhythm wrapper every page uses (canonical --space-6 gap). */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className={styles.container}>{children}</div>;
}
