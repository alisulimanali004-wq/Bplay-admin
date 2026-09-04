import { useTranslation } from 'react-i18next';
import { CheckIcon, InboxIcon, MessageCircleIcon, StatCard, BanIcon } from '@ui';
import type { FeedbackStats } from '../api/feedback.types';
import styles from './feedbackStats.module.css';

/**
 * Inbox counters. These are computed over everything the signed-in admin may
 * see — not over the current page — so a regional admin's totals are their own.
 */
export function FeedbackStatCards({ stats }: { stats?: FeedbackStats }) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid} data-testid="feedback-stats">
      <StatCard
        label={t('feedback.stats.total')}
        value={stats?.total ?? 0}
        icon={<InboxIcon />}
        countUp
      />
      <StatCard
        label={t('feedback.stats.new')}
        value={stats?.new ?? 0}
        icon={<MessageCircleIcon />}
        accent="warning"
        countUp
      />
      <StatCard
        label={t('feedback.stats.replied')}
        value={stats?.replied ?? 0}
        icon={<CheckIcon />}
        accent="secondary"
        countUp
      />
      <StatCard
        label={t('feedback.stats.closed')}
        value={stats?.closed ?? 0}
        icon={<BanIcon />}
        accent="info"
        countUp
      />
    </div>
  );
}
