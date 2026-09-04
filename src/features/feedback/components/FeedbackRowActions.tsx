import { useTranslation } from 'react-i18next';
import { EyeIcon, IconButton } from '@ui';
import type { Feedback } from '../api/feedback.types';
import styles from './feedbackActions.module.css';

interface Props {
  feedback: Feedback;
  onView: (feedback: Feedback) => void;
}

/**
 * Row actions. Open-only on purpose: answering and closing are decisions that
 * belong on the detail page, where the admin can actually read the message first.
 */
export function FeedbackRowActions({ feedback, onView }: Props) {
  const { t } = useTranslation();
  return (
    <span className={styles.row}>
      <IconButton
        size="sm"
        label={t('feedback.actions.view')}
        icon={<EyeIcon />}
        onClick={() => onView(feedback)}
        data-testid={`feedback-view-${feedback.id}`}
      />
    </span>
  );
}
