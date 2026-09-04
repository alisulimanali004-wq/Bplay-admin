import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Field, Textarea } from '@ui';
import { useReplyToFeedback } from '../hooks/useFeedbackMutations';
import { replyFeedbackSchema, type ReplyFormValues } from '../api/feedback.schema';
import { REPLY_MAX_LENGTH, type Feedback } from '../api/feedback.types';
import styles from './replyComposer.module.css';

interface Props {
  feedback: Feedback;
}

/**
 * FR-ADM-FEED-003 — the answer box. Both an admin and a super-admin may reply.
 *
 * Answering a CLOSED item is allowed and reopens it (SRS), so the composer is
 * never hidden — instead it says what will happen, which is the honest version
 * of the "locked when closed" pattern.
 */
export function ReplyComposer({ feedback }: Props) {
  const { t } = useTranslation();
  const reply = useReplyToFeedback();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReplyFormValues>({
    resolver: zodResolver(replyFeedbackSchema),
    mode: 'onTouched',
    defaultValues: { body: '' },
  });

  const body = watch('body') ?? '';

  const submit = handleSubmit(async (data) => {
    await reply.mutateAsync({ id: feedback.id, input: { body: data.body } });
    reset({ body: '' });
  });

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {feedback.status === 'closed' && (
        <Alert variant="info">{t('feedback.detail.replyReopensNote')}</Alert>
      )}

      <Field
        label={t('feedback.detail.replyLabel')}
        htmlFor="feedback-reply"
        hint={t('feedback.detail.replyHint')}
        error={errors.body?.message ? t(errors.body.message) : undefined}
      >
        <Textarea
          id="feedback-reply"
          rows={4}
          dir="auto"
          maxLength={REPLY_MAX_LENGTH}
          placeholder={t('feedback.detail.replyPlaceholder')}
          data-testid="feedback-reply-body"
          {...register('body')}
        />
      </Field>

      <div className={styles.footer}>
        <span className={styles.counter} aria-live="polite">
          {body.trim().length}/{REPLY_MAX_LENGTH}
        </span>
        <Button
          type="submit"
          isLoading={reply.isPending}
          disabled={body.trim().length === 0}
          data-testid="feedback-reply-submit"
        >
          {t('feedback.detail.sendReply')}
        </Button>
      </div>
    </form>
  );
}
