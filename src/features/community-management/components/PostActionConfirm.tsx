import { useTranslation } from 'react-i18next';
import { ConfirmDialog, ReasonDialog } from '@ui';
import { moderationActionNeedsReason, moderationActionVariant } from './moderation';
import { usePostModeration } from '../hooks/useCommunityModeration';
import type { ModerationAction, Post } from '../api/community.types';

interface Props {
  post: Post;
  action: ModerationAction | null;
  onClose: () => void;
  /** Called after the action succeeds (e.g. to navigate away when a post is deleted). */
  onModerated?: (action: ModerationAction) => void;
}

/** Runs a single post moderation action — a reason dialog for "remove", a plain confirm otherwise. */
export function PostActionConfirm({ post, action, onClose, onModerated }: Props) {
  const { t } = useTranslation();
  const mutation = usePostModeration();

  if (!action) return null;

  const variant = moderationActionVariant(action);
  const run = (reason?: string) =>
    mutation.mutate(
      { id: post.id, action, reason },
      {
        onSuccess: () => {
          onClose();
          onModerated?.(action);
        },
      },
    );

  if (moderationActionNeedsReason(action)) {
    return (
      <ReasonDialog
        isOpen
        onClose={onClose}
        onConfirm={(reason) => run(reason)}
        title={t(`community.confirm.post.${action}.title`)}
        description={t(`community.confirm.post.${action}.message`)}
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
      title={t(`community.confirm.post.${action}.title`)}
      message={t(`community.confirm.post.${action}.message`)}
      confirmText={t(`community.actions.${action}`)}
      cancelText={t('common.cancel')}
      variant={variant}
      isLoading={mutation.isPending}
    />
  );
}
