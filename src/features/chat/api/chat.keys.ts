import type { ConversationListParams } from './chat.types';

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversationList: (params: ConversationListParams) =>
    [...chatKeys.conversations(), params] as const,
  conversation: (id: string) => [...chatKeys.all, 'conversation', id] as const,
  messages: (conversationId: string) => [...chatKeys.all, 'messages', conversationId] as const,
  stats: () => [...chatKeys.all, 'stats'] as const,
  /** The "start a conversation" picker — owners the caller's scope covers. */
  ownerOptions: () => [...chatKeys.all, 'owner-options'] as const,
};
