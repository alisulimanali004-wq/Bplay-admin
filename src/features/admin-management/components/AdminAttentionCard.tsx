import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, AlertTriangleIcon, MapPinIcon, PowerIcon } from '@ui';
import type { Admin } from '../api/admin.types';
import styles from './AdminAttentionCard.module.css';

interface Props {
  admin: Admin;
  /** Open the page-owned assign-regions modal. */
  onManage: () => void;
}

interface Alert {
  key: string;
  icon: ReactNode;
  text: string;
  cta?: string;
  onClick?: () => void;
}

/**
 * A "needs attention" panel: a regional admin with no region yet, or a suspended
 * admin. Renders nothing when the admin is healthy (or soft-deleted).
 */
export function AdminAttentionCard({ admin, onManage }: Props) {
  const { t } = useTranslation();
  if (admin.isDeleted) return null;

  const alerts: Alert[] = [];
  if (admin.scope === 'regional' && admin.assignedRegionIds.length === 0) {
    alerts.push({
      key: 'noRegion',
      icon: <MapPinIcon />,
      text: t('admin.detail.attention.noRegion'),
      cta: t('admin.detail.attention.noRegionCta'),
      onClick: onManage,
    });
  }
  if (admin.status === 'suspended') {
    alerts.push({
      key: 'suspended',
      icon: <PowerIcon />,
      text: t('admin.detail.attention.suspended'),
    });
  }

  if (alerts.length === 0) return null;

  return (
    <Card className={styles.card} data-testid="admin-detail-attention">
      <h2 className={styles.title}>
        <AlertTriangleIcon className={styles.titleIcon} />
        {t('admin.detail.attention.title')}
      </h2>
      <div className={styles.rows}>
        {alerts.map((alert) => (
          <div key={alert.key} className={styles.row}>
            <span className={styles.rowIcon}>{alert.icon}</span>
            <span className={styles.rowText}>{alert.text}</span>
            {alert.cta && alert.onClick && (
              <Button variant="secondary" size="sm" onClick={alert.onClick}>
                {alert.cta}
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
