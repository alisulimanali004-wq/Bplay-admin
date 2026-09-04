import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, AlertTriangleIcon, BanIcon, PowerIcon, XIcon, ClockIcon, clsx } from '@ui';
import { isBookingSuspended, type Player } from '../api/player.types';
import styles from './playerCards.module.css';

interface Props {
  player: Player;
}

interface Alert {
  key: string;
  icon: ReactNode;
  text: string;
  detail?: string;
  danger?: boolean;
}

/**
 * A "needs attention" panel for a player: blocked, suspended, unverified email,
 * an active no-show booking suspension, or open reports. Nothing when healthy.
 */
export function PlayerAttentionCard({ player }: Props) {
  const { t } = useTranslation();
  const alerts: Alert[] = [];

  if (player.isBlocked) {
    alerts.push({ key: 'blocked', icon: <BanIcon />, text: t('player.detail.attention.blocked'), detail: player.blockedReason, danger: true });
  } else if (player.accountStatus === 'suspended') {
    alerts.push({ key: 'suspended', icon: <PowerIcon />, text: t('player.detail.attention.suspended'), detail: player.statusReason });
  }
  if (!player.emailVerified) {
    alerts.push({ key: 'unverified', icon: <XIcon />, text: t('player.detail.attention.unverified') });
  }
  if (isBookingSuspended(player)) {
    alerts.push({ key: 'noShow', icon: <ClockIcon />, text: t('player.detail.attention.bookingSuspended') });
  }
  if (player.openReportsCount > 0) {
    alerts.push({ key: 'reports', icon: <AlertTriangleIcon />, text: t('player.detail.attention.openReports', { count: player.openReportsCount }), danger: true });
  }

  if (alerts.length === 0) return null;

  return (
    <Card padding="lg" className={styles.card} data-testid="player-detail-attention">
      <h2 className={styles.title}>
        <AlertTriangleIcon className={styles.titleIcon} />
        {t('player.detail.attention.title')}
      </h2>
      <div className={styles.alertRows}>
        {alerts.map((alert) => (
          <div key={alert.key} className={styles.alertRow}>
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
