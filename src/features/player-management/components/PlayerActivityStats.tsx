import { useTranslation } from 'react-i18next';
import { StatCard, CalendarIcon, DocumentIcon, UsersIcon, StarIcon } from '@ui';
import type { Player } from '../api/player.types';
import styles from './playerStats.module.css';

interface Props {
  player: Player;
}

/** The KPI row on the player detail page — activity totals for this player. */
export function PlayerActivityStats({ player }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const spent = new Intl.NumberFormat(locale).format(player.totalSpentSyp);
  const rating = typeof player.overallRating === 'number' ? player.overallRating.toFixed(1) : '—';

  return (
    <div className={styles.grid} data-testid="player-activity-stats">
      <StatCard
        label={t('player.detail.stats.bookings')}
        value={player.bookingsCount}
        icon={<CalendarIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('player.detail.stats.spent')}
        value={`${spent} ${t('player.detail.stats.currency')}`}
        icon={<DocumentIcon />}
        accent="secondary"
      />
      <StatCard
        label={t('player.detail.stats.rooms')}
        value={player.roomsCount}
        icon={<UsersIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('player.detail.stats.rating')}
        value={rating}
        icon={<StarIcon />}
        accent="warning"
      />
    </div>
  );
}
