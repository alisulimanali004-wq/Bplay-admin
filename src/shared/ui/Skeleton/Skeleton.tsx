import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
}

/** width/height/radius are runtime geometry (the sanctioned inline-style exception). */
export function Skeleton({
  width = '100%',
  height = 'var(--space-4)',
  radius = 'var(--radius-sm)',
}: SkeletonProps) {
  return (
    <span
      className={styles.skeleton}
      style={{ inlineSize: width, blockSize: height, borderRadius: radius }}
      aria-hidden
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span className={styles.stack}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? '60%' : '100%'} />
      ))}
    </span>
  );
}
