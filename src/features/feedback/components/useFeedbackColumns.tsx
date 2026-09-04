import { useTranslation } from 'react-i18next';
import { RegionTag, type Column } from '@ui';
import { useFeedbackFormat } from '../hooks/useFeedbackFormat';
import { FeedbackKindBadge, FeedbackStatusBadge } from './FeedbackBadges';
import { FeedbackSenderCell } from './FeedbackSenderCell';
import type { Feedback } from '../api/feedback.types';
import styles from './feedbackCells.module.css';

/** Table column key -> sort field, for the sortable headers. */
export const SORT_BY_COLUMN: Record<string, 'createdAt' | 'updatedAt'> = {
  created: 'createdAt',
  updated: 'updatedAt',
};

interface Options {
  onOpen: (feedback: Feedback) => void;
  /** Region column is only meaningful when the admin can see more than one. */
  showRegion: boolean;
}

/** The FR-ADM-FEED-001 columns: sender · kind · excerpt · status · date. */
export function useFeedbackColumns({ onOpen, showRegion }: Options): Column<Feedback>[] {
  const { t } = useTranslation();
  const fmt = useFeedbackFormat();

  const columns: Column<Feedback>[] = [
    {
      key: 'sender',
      header: t('feedback.col.sender'),
      render: (item) => <FeedbackSenderCell sender={item.sender} />,
    },
    {
      key: 'kind',
      header: t('feedback.col.kind'),
      render: (item) => <FeedbackKindBadge kind={item.kind} />,
    },
    {
      key: 'excerpt',
      header: t('feedback.col.excerpt'),
      render: (item) => (
        <button
          type="button"
          className={styles.excerptButton}
          onClick={() => onOpen(item)}
          data-testid={`feedback-open-${item.id}`}
        >
          {/* Sender-authored text: a plain text node, escaped by React. `dir="auto"`
              lets the message keep its own direction, so an English excerpt still
              truncates at its end while the UI is in Arabic. */}
          <span className={styles.excerpt} dir="auto">
            {item.body}
          </span>
        </button>
      ),
    },
    {
      key: 'status',
      header: t('feedback.col.status'),
      render: (item) => <FeedbackStatusBadge status={item.status} />,
    },
    {
      key: 'created',
      header: t('feedback.col.created'),
      sortable: true,
      render: (item) => <span className={styles.meta}>{fmt.shortDate(item.createdAt)}</span>,
    },
  ];

  if (showRegion) {
    columns.splice(4, 0, {
      key: 'region',
      header: t('feedback.col.region'),
      render: (item) => (
        <RegionTag regionNames={item.regionNames} isOrphan={item.isOrphan} compact />
      ),
    });
  }

  return columns;
}
