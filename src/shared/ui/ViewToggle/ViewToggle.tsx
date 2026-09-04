import { IconButton } from '../IconButton/IconButton';
import { LayoutGridIcon, ListIcon } from '../icons';
import styles from './ViewToggle.module.css';

export type ViewMode = 'grid' | 'table';

export interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  /** Props-driven strings — the kit does not translate. */
  groupLabel: string;
  gridLabel: string;
  tableLabel: string;
  /** Prefix for the two data-testids, e.g. `plan` → `plan-view-grid`. */
  testIdPrefix?: string;
}

/** Grid ⇄ table switch for a list page that offers both readings of the same data. */
export function ViewToggle({
  value,
  onChange,
  groupLabel,
  gridLabel,
  tableLabel,
  testIdPrefix,
}: ViewToggleProps) {
  return (
    <div className={styles.viewToggle} role="group" aria-label={groupLabel}>
      <IconButton
        size="sm"
        variant={value === 'grid' ? 'primary' : 'ghost'}
        label={gridLabel}
        icon={<LayoutGridIcon />}
        onClick={() => onChange('grid')}
        aria-pressed={value === 'grid'}
        data-testid={testIdPrefix ? `${testIdPrefix}-view-grid` : undefined}
      />
      <IconButton
        size="sm"
        variant={value === 'table' ? 'primary' : 'ghost'}
        label={tableLabel}
        icon={<ListIcon />}
        onClick={() => onChange('table')}
        aria-pressed={value === 'table'}
        data-testid={testIdPrefix ? `${testIdPrefix}-view-table` : undefined}
      />
    </div>
  );
}
