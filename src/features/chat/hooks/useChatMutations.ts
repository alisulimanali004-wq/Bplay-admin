import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { chatKeys } from '../api/chat.keys';
import { markConversationRead, sendMessage, startConversation } from '../api';
import type { ChatMessage, MessagePage, StartConversationInput } from '../api/chat.types';

/**
 * All chat mutations. Errors are never caught here — the global MutationCache
 * already surfaces `toAppError(error).message` as a toast, so a local catch
 * would double-toast. The one exception is `useSendMessage`, which suppresses
 * the toast for a failed send: the bubble itself already shows the failure and
 * offers a retry, which is both quieter and more useful than a toast.
 */

let optimisticSeq = 0;

/** The client-side id an in-flight bubble carries until the server answers. */
function optimisticId(): string {
  optimisticSeq += 1;
  return `optimistic-${optimisticSeq}`;
}

interface SendVariables {
  conversationId: string;
  body: string;
  /** Present when re-sending a bubble that previously failed. */
  replaceId?: string;
  /** Identity of the signed-in admin, so the optimistic bubble renders correctly. */
  author: Pick<ChatMessage, 'senderId' | 'senderName' | 'senderRole'>;
}

interface SendContext {
  optimisticId: string;
}

/**
 * FR-ADM-CHAT-003 — send a text message.
 *
 * The bubble appears INSTANTLY with `deliveryStatus: 'sending'` and is then
 * reconciled with the server's row. A failure deliberately does NOT roll the
 * bubble back: throwing away what the admin typed is the worst possible
 * outcome, so it stays in the thread marked `failed` with a retry affordance.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation<ChatMessage, Error, SendVariables, SendContext>({
    mutationFn: ({ conversationId, body }) => sendMessage(conversationId, { body }),

    onMutate: async ({ conversationId, body, replaceId, author }) => {
      const key = chatKeys.messages(conversationId);
      // Stop an in-flight refetch from overwriting the optimistic insert.
      await queryClient.cancelQueries({ queryKey: key });

      const id = optimisticId();
      const pending: ChatMessage = {
        id,
        conversationId,
        senderType: 'admin',
        ...author,
        body,
        attachments: [],
        deliveryStatus: 'sending',
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      queryClient.setQueryData<MessagePage>(key, (previous) => {
        const messages = previous?.messages ?? [];
        // A retry replaces the failed bubble in place rather than duplicating it.
        const withoutFailed = replaceId
          ? messages.filter((message) => message.id !== replaceId)
          : messages;
        return { messages: [...withoutFailed, pending], hasMore: previous?.hasMore ?? false };
      });

      return { optimisticId: id };
    },

    onSuccess: (created, { conversationId }, context) => {
      queryClient.setQueryData<MessagePage>(chatKeys.messages(conversationId), (previous) => {
        if (!previous) return { messages: [created], hasMore: false };
        return {
          ...previous,
          messages: previous.messages.map((message) =>
            message.id === context?.optimisticId ? created : message,
          ),
        };
      });
      // The rail row's preview, order and unread badge all move with a send.
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversation(conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.stats() });
    },

    onError: (_error, { conversationId }, context) => {
      queryClient.setQueryData<MessagePage>(chatKeys.messages(conversationId), (previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          messages: previous.messages.map((message) =>
            message.id === context?.optimisticId
              ? { ...message, deliveryStatus: 'failed' as const }
              : message,
          ),
        };
      });
    },

    // The failed bubble is UI state the server does not know about, so the
    // messages query is invalidated only on success (above), never here.
    meta: { silentError: true },
  });
}

/**
 * FR-ADM-CHAT-002 — mark the thread read when it is opened.
 *
 * Fire-and-forget by design: the admin has visibly read the thread whether or
 * not the acknowledgement lands, and a toast about a failed read receipt would
 * be noise. The unread badge is corrected by the next list refetch.
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useCallback(
    (conversationId: string) => {
      void markConversationRead(conversationId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
          queryClient.invalidateQueries({ queryKey: chatKeys.stats() });
        })
        .catch(() => {
          /* see the note above — a failed read receipt is not worth surfacing */
        });
    },
    [queryClient],
  );
}

/** FR-ADM-CHAT-003 — open (or resolve) a thread with an owner. */
export function useStartConversation() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (input: StartConversationInput) => startConversation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: chatKeys.stats() });
      toast.success(t('chat.toast.started'));
    },
  });
}
