import { useTranslation } from 'react-i18next';
import { Button } from '../Button/Button';
import { XIcon } from '../icons';
import styles from './ClearFiltersBar.module.css';

export interface ClearFiltersBarProps {
  /** Number of results matching the active filters (shown on the leading edge). */
  count: number;
  onClear: () => void;
  testId?: string;
}

/**
 * A coordinated strip that sits on its own row under a <Toolbar> (via its `end`
 * slot) whenever a filter is active: the result count anchors the leading edge and
 * a Clear-filters action the trailing edge. Its placement is deterministic — it
 * never depends on how many filter controls wrap above it.
 */
export function ClearFiltersBar({ count, onClear, testId }: ClearFiltersBarProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.bar}>
      <span className={styles.count}>{t('common.resultsCount', { count })}</span>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<XIcon />}
        onClick={onClear}
        data-testid={testId}
      >
        {t('common.clearFilters')}
      </Button>
    </div>
  );
}
