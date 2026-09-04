import { useTranslation } from 'react-i18next';
import { StatCard, InboxIcon, MessageCircleIcon, HeartIcon, TrashIcon } from '@ui';
import type { PostStats } from '../api/community.types';
import styles from './communityStats.module.css';

interface Props {
  stats?: PostStats;
}

/** The KPI row on the community list: total posts, comments, reactions, removed. */
export function CommunityStatCards({ stats }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} data-testid="community-stats">
      <StatCard
        label={t('community.stats.totalPosts')}
        value={stats?.totalPosts ?? 0}
        icon={<InboxIcon />}
        accent="primary"
        countUp
      />
      <StatCard
        label={t('community.stats.totalComments')}
        value={stats?.totalComments ?? 0}
        icon={<MessageCircleIcon />}
        accent="info"
        countUp
      />
      <StatCard
        label={t('community.stats.totalReactions')}
        value={stats?.totalReactions ?? 0}
        icon={<HeartIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={t('community.stats.removed')}
        value={stats?.removed ?? 0}
        icon={<TrashIcon />}
        accent="warning"
        countUp
      />
    </div>
  );
}
