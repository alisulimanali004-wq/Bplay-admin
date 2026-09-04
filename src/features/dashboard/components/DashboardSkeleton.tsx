import { Skeleton } from '@ui';
import styles from './DashboardSkeleton.module.css';

/** Layout-shaped loading state — the shell renders instantly, tiles fill in. */
export function DashboardSkeleton() {
  return (
    <div className={styles.page} aria-busy="true">
      <div className={styles.hero}>
        <Skeleton height="220px" radius="var(--radius-2xl)" />
        <Skeleton height="220px" radius="var(--radius-2xl)" />
      </div>
      <div className={styles.kpis}>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} height="132px" radius="var(--radius-xl)" />
        ))}
      </div>
      <div className={styles.two}>
        <Skeleton height="300px" radius="var(--radius-2xl)" />
        <Skeleton height="300px" radius="var(--radius-2xl)" />
      </div>
    </div>
  );
}
