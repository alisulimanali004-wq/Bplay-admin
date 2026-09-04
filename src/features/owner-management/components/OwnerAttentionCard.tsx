import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  AlertTriangleIcon,
  ClockIcon,
  XIcon,
  BanIcon,
  PowerIcon,
  DocumentIcon,
  clsx,
} from '@ui';
import type { Owner } from '../api/owner.types';
import styles from './OwnerAttentionCard.module.css';

interface Props {
  owner: Owner;
}

interface Alert {
  key: string;
  icon: ReactNode;
  text: string;
  detail?: string;
  danger?: boolean;
}

/**
 * A "needs attention" panel for an owner: blocked, rejected, suspended, under
 * review, rejected documents, or no documents. Renders nothing when healthy.
 */
export function OwnerAttentionCard({ owner }: Props) {
  const { t } = useTranslation();
  const rejectedDocs = owner.documents.filter((doc) => doc.status === 'rejected').length;
  const underReview = owner.accountStatus === 'under_review';

  const alerts: Alert[] = [];
  if (owner.isBlocked) {
    alerts.push({ key: 'blocked', icon: <BanIcon />, text: t('owner.detail.attention.blocked'), detail: owner.blockedReason, danger: true });
  } else if (owner.accountStatus === 'rejected') {
    alerts.push({ key: 'rejected', icon: <XIcon />, text: t('owner.detail.attention.rejected'), detail: owner.statusReason, danger: true });
  } else if (owner.accountStatus === 'suspended') {
    alerts.push({ key: 'suspended', icon: <PowerIcon />, text: t('owner.detail.attention.suspended'), detail: owner.statusReason });
  } else if (underReview) {
    alerts.push({ key: 'review', icon: <ClockIcon />, text: t('owner.detail.attention.underReview') });
  }
  if (rejectedDocs > 0) {
    alerts.push({ key: 'rejDocs', icon: <XIcon />, text: t('owner.detail.attention.rejectedDocs', { count: rejectedDocs }), danger: true });
  }
  if (underReview && owner.documents.length === 0) {
    alerts.push({ key: 'noDocs', icon: <DocumentIcon />, text: t('owner.detail.attention.noDocuments') });
  }

  if (alerts.length === 0) return null;

  return (
    <Card className={styles.card} data-testid="owner-detail-attention">
      <h2 className={styles.title}>
        <AlertTriangleIcon className={styles.titleIcon} />
        {t('owner.detail.attention.title')}
      </h2>
      <div className={styles.rows}>
        {alerts.map((alert) => (
          <div key={alert.key} className={styles.row}>
            <span className={clsx(styles.rowIcon, alert.danger && styles.rowIconDanger)}>
              {alert.icon}
            </span>
            <span className={styles.rowText}>
              <span>{alert.text}</span>
              {alert.detail && <span className={styles.rowDetail}>“{alert.detail}”</span>}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
