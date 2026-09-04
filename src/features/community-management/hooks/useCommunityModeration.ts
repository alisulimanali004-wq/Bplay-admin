import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { communityKeys } from '../api/community.keys';
import { updateCommentModeration, updatePostModeration } from '../api';
import type { ModerationAction } from '../api/community.types';

const POST_TOAST: Record<ModerationAction, string> = {
  remove: 'postRemoved',
  restore: 'postRestored',
  delete: 'postDeleted',
};
const COMMENT_TOAST: Record<ModerationAction, string> = {
  remove: 'commentRemoved',
  restore: 'commentRestored',
  delete: 'commentDeleted',
};

/** Post-level moderation: remove (with reason) / restore / delete. Reusable from the list + detail. */
export function usePostModeration() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: ModerationAction; reason?: string }) =>
      updatePostModeration(id, action, reason),
    onSuccess: (_data, variables) => {
      // Refresh the lists + KPI stats always. For remove/restore also refresh the
      // detail; a delete removes the post entirely, so skip the detail query —
      // invalidating it would refetch a now-missing post and surface a spurious
      // "not found" error toast on the detail page as it navigates away.
      queryClient.invalidateQueries({ queryKey: communityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
      if (variables.action !== 'delete') {
        queryClient.invalidateQueries({ queryKey: communityKeys.detail(variables.id) });
      }
      toast.success(t(`community.toast.${POST_TOAST[variables.action]}`));
    },
  });
}

/** Comment-level moderation, scoped to one post. */
export function useCommentModeration(postId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      commentId,
      action,
      reason,
    }: {
      commentId: string;
      action: ModerationAction;
      reason?: string;
    }) => updateCommentModeration(postId, commentId, action, reason),
    onSuccess: (_data, variables) => {
      // Refresh the comments + this post's detail, plus the lists/stats — moderating
      // a comment changes the post's published comment count shown on the list rows
      // and the "Comments" KPI.
      queryClient.invalidateQueries({ queryKey: communityKeys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
      toast.success(t(`community.toast.${COMMENT_TOAST[variables.action]}`));
    },
  });
}
