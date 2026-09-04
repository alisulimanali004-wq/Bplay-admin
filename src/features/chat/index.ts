/**
 * CHAT (SRS module 15) — the administration ↔ facility-owner channel.
 *
 * The page is reached through the lazy route in `app/router`, so nothing here
 * exports it: this barrel carries only what the SHELL needs (the sidebar's
 * unread indicator) and the domain vocabulary another feature might one day
 * deep-link against. Everything else stays internal to the slice.
 */
export { ChatNavBadge } from './components/ChatNavBadge';
export type {
  ChatMessage,
  Conversation,
  ConversationCategory,
  ConversationStatus,
  MessageSenderType,
} from './api/chat.types';
