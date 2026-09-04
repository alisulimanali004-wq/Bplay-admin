import { useTranslation } from 'react-i18next';
import { ConfirmDialog, ReasonDialog } from '@ui';
import { moderationActionNeedsReason, moderationActionVariant } from './moderation';
import { useCommentModeration } from '../hooks/useCommunityModeration';
import type { Comment, ModerationAction } from '../api/community.types';

interface Props {
  postId: string;
  comment: Comment | null;
  action: ModerationAction | null;
  onClose: () => void;
}

/** Runs a single comment moderation action — reason dialog for "remove", plain confirm otherwise. */
export function CommentActionConfirm({ postId, comment, action, onClose }: Props) {
  const { t } = useTranslation();
  const mutation = useCommentModeration(postId);

  if (!comment || !action) return null;

  const variant = moderationActionVariant(action);
  const run = (reason?: string) =>
    mutation.mutate({ commentId: comment.id, action, reason }, { onSuccess: onClose });

  if (moderationActionNeedsReason(action)) {
    return (
      <ReasonDialog
        isOpen
        onClose={onClose}
        onConfirm={(reason) => run(reason)}
        title={t(`community.confirm.comment.${action}.title`)}
        description={t(`community.confirm.comment.${action}.message`)}
        reasonLabel={t('community.confirm.reasonLabel')}
        reasonPlaceholder={t('community.confirm.reasonPlaceholder')}
        confirmText={t(`community.actions.${action}`)}
        cancelText={t('common.cancel')}
        variant={variant}
        isLoading={mutation.isPending}
      />
    );
  }

  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      onConfirm={() => run()}
      title={t(`community.confirm.comment.${action}.title`)}
      message={t(`community.confirm.comment.${action}.message`)}
      confirmText={t(`community.actions.${action}`)}
      cancelText={t('common.cancel')}
      variant={variant}
      isLoading={mutation.isPending}
    />
  );
}
