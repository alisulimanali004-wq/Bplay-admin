import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { chatKeys } from '../api/chat.keys';
import {
  getChatOwnerOptions,
  getChatStats,
  getConversationById,
  getConversations,
  getMessages,
} from '../api';
import type { ConversationListParams } from '../api/chat.types';

/** FR-ADM-CHAT-001 — the rail. `keepPreviousData` stops it flashing while filtering. */
export function useConversationsQuery(params: ConversationListParams) {
  return useQuery({
    queryKey: chatKeys.conversationList(params),
    queryFn: () => getConversations(params),
    placeholderData: keepPreviousData,
  });
}

/** The counters above the rail, across everything the signed-in admin may see. */
export function useChatStats() {
  return useQuery({
    queryKey: chatKeys.stats(),
    queryFn: () => getChatStats(),
  });
}

/** The open thread's header record. Disabled until a conversation is selected. */
export function useConversationQuery(id?: string) {
  return useQuery({
    queryKey: chatKeys.conversation(id ?? ''),
    queryFn: () => getConversationById(id!),
    enabled: Boolean(id),
  });
}

/**
 * FR-ADM-CHAT-002 — the thread body, oldest first.
 *
 * `staleTime: 0` deliberately overrides the global 30s default: a chat's whole
 * point is that an invalidation from the live stream refetches immediately
 * rather than serving a cached window.
 */
export function useMessagesQuery(conversationId?: string) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? ''),
    queryFn: () => getMessages(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: 0,
  });
}

/** The owners this admin may open a thread with — the picker's source. */
export function useChatOwnerOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: chatKeys.ownerOptions(),
    queryFn: () => getChatOwnerOptions(),
    enabled,
  });
}
