import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { feedbackKeys } from '../api/feedback.keys';
import { closeFeedback, reopenFeedback, replyToFeedback } from '../api';
import type { ReplyFeedbackInput } from '../api/feedback.types';

/**
 * All feedback mutations. Errors are never caught here — the global
 * MutationCache already surfaces `toAppError(error).message` as a toast, so a
 * local catch would double-toast.
 */

export function useReplyToFeedback() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReplyFeedbackInput }) =>
      replyToFeedback(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
      toast.success(t('feedback.toast.replied'));
    },
  });
}

export function useCloseFeedback() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => closeFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
      toast.success(t('feedback.toast.closed'));
    },
  });
}

export function useReopenFeedback() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => reopenFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
      toast.success(t('feedback.toast.reopened'));
    },
  });
}
