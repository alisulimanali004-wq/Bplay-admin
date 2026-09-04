import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { clsx, ArrowUpRightIcon, ArrowDownRightIcon, ChevronEndIcon } from '@ui';
import { useCountUp } from '@shared/hooks/useCountUp';
import { fmtInt } from './format';
import styles from './DashboardKit.module.css';

/** Uppercase, wide-tracked muted label — the "OWNER DASHBOARD" idiom. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}

/** Accent bar + eyebrow + serif-weight title + optional right-side action. */
export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionHeadMain}>
        <span className={styles.sectionBar} aria-hidden />
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

/** Small icon + title row atop a chart panel, with an optional trailing node. */
export function PanelHead({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.panelHead}>
      <span className={styles.panelHeadTitle}>
        <span className={styles.panelHeadIcon} aria-hidden>
          {icon}
        </span>
        {title}
      </span>
      {action}
    </div>
  );
}

/** Delta chip: arrow + signed % + named baseline. up = good, unless `invert`
    (churn/no-show/cancellations), always arrow + color + text (never color alone). */
export function Delta({
  pct,
  baseline,
  invert = false,
  small = false,
}: {
  pct: number;
  baseline?: string;
  invert?: boolean;
  small?: boolean;
}) {
  const positive = pct >= 0;
  const good = invert ? !positive : positive;
  const Icon = positive ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={clsx(styles.delta, good ? styles.deltaUp : styles.deltaDown)}>
      <Icon className={styles.deltaIcon} aria-hidden />
      <span className={styles.deltaPct}>
        {positive ? '+' : ''}
        {pct}%
      </span>
      {baseline && !small && <span className={styles.deltaBaseline}>{baseline}</span>}
    </span>
  );
}

/** A number that counts up on mount (reduced motion → instant), comma-grouped. */
export function Count({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  return <span className={className}>{fmtInt(shown)}</span>;
}

/** "View all →" deep-link into a feature list (chevron mirrors in RTL). */
export function ViewAllLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={styles.viewAll}>
      {label}
      <ChevronEndIcon className={clsx(styles.viewAllIcon, 'flipInRtl')} aria-hidden />
    </Link>
  );
}
