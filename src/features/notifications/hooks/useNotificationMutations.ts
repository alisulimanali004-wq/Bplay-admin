import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { notificationKeys } from '../api/notification.keys';
import {
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationPreference,
} from '../api';
import type {
  NotificationPreference,
  SetNotificationPreferenceInput,
} from '../api/notification.types';

/**
 * All notification mutations. Errors are never caught here — the global
 * MutationCache already surfaces `toAppError(error).message` as a toast, so a
 * local catch would double-toast.
 */

/**
 * Mark one as read.
 *
 * Deliberately SILENT on success: this fires on every row click on the way to a
 * deep link, and a toast for "you opened a notification" is noise on top of a
 * page transition. The row's own read state is the feedback.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      // `n`, not `count`: `count` is i18next's plural selector, which would make
      // this key require the full CLDR plural set (six forms in Arabic) instead
      // of the one sentence it actually is.
      toast.success(t('notification.toast.allRead', { n: result.updated }));
    },
  });
}

/**
 * Toggle one (category × channel) delivery setting.
 *
 * OPTIMISTIC on purpose. A switch must move the instant it is clicked, and the
 * naive alternative — disabling the control while the write is in flight — is
 * actively harmful here: `Switch` renders a real `<input type="checkbox">`, and
 * disabling the element that currently has focus makes the browser blur it and
 * drop the keyboard user back to `<body>` mid-interaction. Writing the cache in
 * `onMutate` means nothing ever needs disabling.
 */
export function useSetNotificationPreference() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: SetNotificationPreferenceInput) => setNotificationPreference(input),

    onMutate: async (input) => {
      const key = notificationKeys.preferences();
      // Stop an in-flight refetch from landing on top of the optimistic write.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreference[]>(key);

      queryClient.setQueryData<NotificationPreference[]>(key, (rows = []) => {
        const index = rows.findIndex(
          (row) => row.category === input.category && row.channel === input.channel,
        );
        // The server upserts, so an absent row (meaning "channel default")
        // becomes a real row on first toggle — mirror that here.
        if (index === -1) return [...rows, { ...input }];
        const next = rows.slice();
        next[index] = { ...next[index], enabled: input.enabled };
        return next;
      });

      return { previous };
    },

    onError: (_error, _input, context) => {
      // Roll the switch back. The global MutationCache surfaces the message.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(notificationKeys.preferences(), context.previous);
      }
    },

    onSuccess: () => {
      toast.success(t('notification.toast.preferenceSaved'));
    },

    onSettled: () => {
      // Only the preferences key: a delivery setting cannot change the inbox, so
      // invalidating `all` would refetch the list and the stats for nothing.
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}
