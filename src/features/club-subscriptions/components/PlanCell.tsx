import { useTranslation } from 'react-i18next';
import type { PlanType } from '../api';
import styles from './PlanCell.module.css';

export interface PlanCellProps {
  planName: string;
  planType: PlanType;
}

/** A table cell: the plan name over a muted plan-type sub-line. */
export function PlanCell({ planName, planType }: PlanCellProps) {
  const { t } = useTranslation();
  return (
    <span className={styles.cell}>
      <span className={styles.name}>{planName}</span>
      <span className={styles.type}>{t(`membership.planType.${planType}`)}</span>
    </span>
  );
}
