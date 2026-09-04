import { useTranslation } from 'react-i18next';
import { Avatar, Badge, MessageCircleIcon } from '@ui';
import { useFeedbackFormat } from '../hooks/useFeedbackFormat';
import type { FeedbackReply } from '../api/feedback.types';
import styles from './feedbackThread.module.css';

interface Props {
  replies: FeedbackReply[];
}

/**
 * The answers already sent, oldest first. Replies accumulate — an admin never
 * overwrites a colleague's answer — so the sender's history stays auditable.
 *
 * Bodies render as plain text nodes (React escapes them); `dir="auto"` lets an
 * Arabic answer read correctly inside the English UI and vice versa.
 */
export function FeedbackThread({ replies }: Props) {
  const { t } = useTranslation();
  const fmt = useFeedbackFormat();

  if (replies.length === 0) {
    return <p className={styles.empty}>{t('feedback.detail.noReplies')}</p>;
  }

  return (
    <ol className={styles.list} data-testid="feedback-thread">
      {replies.map((reply) => (
        <li key={reply.id} className={styles.item}>
          <Avatar name={reply.authorName} size="sm" />
          <div className={styles.main}>
            <div className={styles.head}>
              <span className={styles.author}>{reply.authorName}</span>
              <Badge variant={reply.authorRole === 'super_admin' ? 'success' : 'info'} size="sm">
                {t(`feedback.role.${reply.authorRole}`)}
              </Badge>
              <span className={styles.time}>{fmt.dateTime(reply.createdAt)}</span>
            </div>
            <p className={styles.body} dir="auto">
              {reply.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The heading used above the thread, with the count. */
export function FeedbackThreadHeading({ count }: { count: number }) {
  const { t } = useTranslation();
  const fmt = useFeedbackFormat();
  return (
    <h2 className={styles.title}>
      <MessageCircleIcon />
      {t('feedback.detail.replies')}
      <span className={styles.count}>{fmt.number(count)}</span>
    </h2>
  );
}
