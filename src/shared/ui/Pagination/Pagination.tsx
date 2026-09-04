import { IconButton } from '../IconButton/IconButton';
import { ChevronEndIcon } from '../icons';
import { clsx } from '../clsx';
import styles from './Pagination.module.css';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = buildPageList(page, pageCount);

  return (
    <nav className={styles.nav} aria-label="Pagination">
      <IconButton
        variant="ghost"
        size="sm"
        label="Previous page"
        icon={<ChevronEndIcon className={styles.flip} />}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      />
      {pages.map((entry, index) =>
        entry === '…' ? (
          <span key={`gap-${index}`} className={styles.gap} aria-hidden>
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            className={clsx(styles.page, entry === page && styles.active)}
            aria-current={entry === page ? 'page' : undefined}
            onClick={() => onPageChange(entry)}
          >
            {entry}
          </button>
        ),
      )}
      <IconButton
        variant="ghost"
        size="sm"
        label="Next page"
        icon={<ChevronEndIcon />}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      />
    </nav>
  );
}

function buildPageList(current: number, total: number): Array<number | '…'> {
  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const range: Array<number | '…'> = [1];
  if (left > 2) range.push('…');
  for (let i = left; i <= right; i += 1) range.push(i);
  if (right < total - 1) range.push('…');
  range.push(total);
  return range;
}
