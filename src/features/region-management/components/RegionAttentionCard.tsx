import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Button, AlertTriangleIcon, StadiumIcon, UsersIcon } from '@ui';
import { PATHS } from '@app/router/paths';
import type { RegionFacility } from '@features/facility-management/api';
import type { Region } from '../api/region.types';
import styles from './RegionAttentionCard.module.css';

interface Props {
  region: Region;
  facilities: RegionFacility[];
  onManage: () => void;
}

interface Alert {
  key: string;
  icon: ReactNode;
  text: string;
  cta: string;
  onClick: () => void;
}

/**
 * A "needs attention" panel surfacing the actionable things about a region:
 * facilities awaiting review, and a missing managing admin. Renders nothing
 * when the region is healthy (or soft-deleted).
 */
export function RegionAttentionCard({ region, facilities, onManage }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (region.isDeleted) return null;

  const pendingCount = facilities.filter((facility) => facility.status === 'pending').length;
  const alerts: Alert[] = [];

  if (pendingCount > 0) {
    alerts.push({
      key: 'pending',
      icon: <StadiumIcon />,
      text: t('region.detail.attention.pending', { count: pendingCount }),
      cta: t('region.detail.attention.pendingCta'),
      onClick: () => navigate(`${PATHS.facilityManagement}?tab=queue`),
    });
  }
  if (region.assignedAdminIds.length === 0) {
    alerts.push({
      key: 'noAdmin',
      icon: <UsersIcon />,
      text: t('region.detail.attention.noAdmin'),
      cta: t('region.detail.attention.noAdminCta'),
      onClick: onManage,
    });
  }

  if (alerts.length === 0) return null;

  return (
    <Card className={styles.card} data-testid="region-detail-attention">
      <h2 className={styles.title}>
        <AlertTriangleIcon className={styles.titleIcon} />
        {t('region.detail.attention.title')}
      </h2>
      <div className={styles.rows}>
        {alerts.map((alert) => (
          <div key={alert.key} className={styles.row}>
            <span className={styles.rowIcon}>{alert.icon}</span>
            <span className={styles.rowText}>{alert.text}</span>
            <Button variant="secondary" size="sm" onClick={alert.onClick}>
              {alert.cta}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
