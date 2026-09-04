import { useTranslation } from 'react-i18next';
import { DocumentIcon, clsx } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import type { FacilityDocument } from '../api/facility.types';
import styles from './DocumentChip.module.css';

export interface DocumentChipProps {
  document: FacilityDocument;
}

/**
 * A verification document shown as a small, read-only glass chip: the name and a
 * colored dot mirroring its review status (Badge palette). Intentionally NOT a
 * link — documents are opened and reviewed from inside the facility profile, not
 * from the review queue.
 */
export function DocumentChip({ document }: DocumentChipProps) {
  const { t } = useTranslation();
  const statusVariant = statusToBadgeVariant(document.status);

  return (
    <span className={styles.chip} data-testid={`document-chip-${document.id}`}>
      <DocumentIcon className={styles.icon} />
      <span className={styles.name}>{document.name}</span>
      <span className={clsx(styles.dot, styles[statusVariant])} aria-hidden />
      <span className={styles.srOnly}>{t(`status.${document.status}`)}</span>
    </span>
  );
}
