import { useTranslation } from 'react-i18next';
import { StatCard, UsersIcon, PowerIcon, ClockIcon, BanIcon } from '@ui';
import type { PlayerStats } from '../api/player.types';
import styles from './playerStats.module.css';

interface Props {
  stats?: PlayerStats;
}

/** The KPI row on the players list: total, active, suspended, blocked. */
export function PlayerStatCards({ stats }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} data-testid="player-stats">
      <StatCard
        label={t('player.stats.total')}
        value={stats?.total ?? 0}
        icon={<UsersIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('player.stats.active')}
        value={stats?.active ?? 0}
        icon={<PowerIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('player.stats.suspended')}
        value={stats?.suspended ?? 0}
        icon={<ClockIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={t('player.stats.blocked')}
        value={stats?.blocked ?? 0}
        icon={<BanIcon />}
        accent="secondary"
        countUp
      />
    </div>
  );
}
