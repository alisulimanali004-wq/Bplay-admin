import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BanIcon, Button, ConfirmDialog, RotateCcwIcon } from '@ui';
import { useCloseFeedback, useReopenFeedback } from '../hooks/useFeedbackMutations';
import { canCloseFeedback, canReopenFeedback, type Feedback } from '../api/feedback.types';

interface Props {
  feedback: Feedback;
}

/**
 * FR-ADM-FEED-004 — close / reopen. Both are reversible and neither touches the
 * sender's message, so a single confirm is the right weight (no reason required:
 * FD4 rules out disciplinary bookkeeping).
 */
export function FeedbackStatusActions({ feedback }: Props) {
  const { t } = useTranslation();
  const close = useCloseFeedback();
  const reopen = useReopenFeedback();
  const [pending, setPending] = useState<'close' | 'reopen' | null>(null);

  return (
    <>
      {canCloseFeedback(feedback) && (
        <Button
          variant="secondary"
          leftIcon={<BanIcon />}
          onClick={() => setPending('close')}
          data-testid="feedback-close"
        >
          {t('feedback.actions.close')}
        </Button>
      )}

      {canReopenFeedback(feedback) && (
        <Button
          variant="secondary"
          leftIcon={<RotateCcwIcon />}
          onClick={() => setPending('reopen')}
          data-testid="feedback-reopen"
        >
          {t('feedback.actions.reopen')}
        </Button>
      )}

      <ConfirmDialog
        isOpen={pending === 'close'}
        onClose={() => setPending(null)}
        title={t('feedback.confirm.closeTitle')}
        message={t('feedback.confirm.closeMessage')}
        confirmText={t('feedback.actions.close')}
        cancelText={t('common.cancel')}
        variant="caution"
        isLoading={close.isPending}
        onConfirm={async () => {
          await close.mutateAsync(feedback.id);
          setPending(null);
        }}
      />

      <ConfirmDialog
        isOpen={pending === 'reopen'}
        onClose={() => setPending(null)}
        title={t('feedback.confirm.reopenTitle')}
        message={t('feedback.confirm.reopenMessage')}
        confirmText={t('feedback.actions.reopen')}
        cancelText={t('common.cancel')}
        isLoading={reopen.isPending}
        onConfirm={async () => {
          await reopen.mutateAsync(feedback.id);
          setPending(null);
        }}
      />
    </>
  );
}
