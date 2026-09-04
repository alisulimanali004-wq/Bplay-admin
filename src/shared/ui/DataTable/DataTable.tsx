import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ArrowUpDownIcon, ChevronUpIcon, ChevronDownIcon } from '../icons';
import { clsx } from '../clsx';
import styles from './DataTable.module.css';

export type SortDir = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  align?: 'start' | 'center' | 'end';
  /** Runtime column width (e.g. "160px" | "20%"); applied as an inline style. */
  width?: string;
  /** When true (and `onSortChange` is provided) the header becomes a sort toggle. */
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyState?: ReactNode;
  getRowId: (row: T) => string;
  rowActions?: (row: T) => ReactNode;
  /**
   * Makes each row clickable (e.g. open a detail page). Rows become keyboard
   * focusable and respond to Enter/Space; nested buttons/links should call
   * `event.stopPropagation()` to run their own action instead.
   */
  onRowClick?: (row: T) => void;
  /** Current sort state — highlights the active column header + sets aria-sort. */
  sort?: { key: string; dir: SortDir };
  /** Called with a sortable column's key when its header is activated. */
  onSortChange?: (key: string) => void;
  /** Localized accessible label for the row-actions column header. */
  actionsLabel?: string;
}

const SKELETON_ROWS = 6;

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  error,
  onRetry,
  emptyState,
  getRowId,
  rowActions,
  onRowClick,
  sort,
  onSortChange,
  actionsLabel,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const colCount = columns.length + (rowActions ? 1 : 0);
  const resolvedActionsLabel = actionsLabel ?? t('common.actions');

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => {
              const isSortable = Boolean(column.sortable && onSortChange);
              const isSorted = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={clsx(styles.th, column.align && styles[column.align])}
                  style={column.width ? { inlineSize: column.width } : undefined}
                  aria-sort={
                    isSortable
                      ? isSorted
                        ? sort?.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  {isSortable ? (
                    <button
                      type="button"
                      className={clsx(styles.sortBtn, isSorted && styles.sortActive)}
                      onClick={() => onSortChange?.(column.key)}
                    >
                      <span>{column.header}</span>
                      <span className={styles.sortIcon} aria-hidden>
                        {isSorted ? (
                          sort?.dir === 'asc' ? (
                            <ChevronUpIcon />
                          ) : (
                            <ChevronDownIcon />
                          )
                        ) : (
                          <ArrowUpDownIcon />
                        )}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {rowActions && (
              <th
                scope="col"
                className={clsx(styles.th, styles.end)}
                aria-label={resolvedActionsLabel}
              />
            )}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className={styles.row}>
                {Array.from({ length: colCount }, (_, cellIndex) => (
                  <td key={cellIndex} className={styles.td}>
                    <span className={styles.skeleton} />
                  </td>
                ))}
              </tr>
            ))
          ) : error ? (
            <tr>
              <td colSpan={colCount} className={styles.state}>
                <ErrorState
                  title={t('common.errorTitle')}
                  message={error}
                  retryLabel={t('common.retry')}
                  onRetry={onRetry}
                />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colCount} className={styles.state}>
                {emptyState ?? <EmptyState title={t('common.emptyDefault')} />}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const id = getRowId(row);
              return (
                <tr
                  key={id}
                  className={clsx(styles.row, onRowClick && styles.clickable)}
                  data-testid={`row-${id}`}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((column) => (
                    <td key={column.key} className={clsx(styles.td, column.align && styles[column.align])}>
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                  {rowActions && (
                    <td
                      className={clsx(styles.td, styles.end, styles.actions)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
