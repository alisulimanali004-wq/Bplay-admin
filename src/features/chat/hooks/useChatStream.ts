import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '../api/chat.keys';
import { subscribeToChat } from '../api';

/** How long a typing indicator survives without a refreshing signal. */
const TYPING_TIMEOUT_MS = 5_000;

export interface ChatStreamState {
  /** Conversation ids the counterpart is currently typing in. */
  typingIn: ReadonlySet<string>;
}

/**
 * Live chat, over whichever transport the api barrel provides — Server-Sent
 * Events against the real backend, an in-memory emitter under mocks.
 *
 * This hook does NOT push payloads into the cache. It invalidates instead, so
 * the rail, the thread and the counters all refetch through the one filtering
 * and scoping pipeline they normally use — a socket frame must not be able to
 * inject a row that the scope gate never saw. The single exception is `typing`,
 * which is transient, is never persisted, and renders nothing but an ellipsis.
 *
 * Mounted ONCE, at the page level. Mounting it per component would open one
 * connection per bubble list.
 */
export function useChatStream(activeConversationId?: string): ChatStreamState {
  const queryClient = useQueryClient();
  const [typingIn, setTypingIn] = useState<ReadonlySet<string>>(() => new Set());
  // Read inside the subscription callback without re-subscribing on every
  // navigation — re-subscribing would drop and re-open the SSE connection.
  const activeRef = useRef(activeConversationId);
  activeRef.current = activeConversationId;

  useEffect(() => {
    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const clearTyping = (conversationId: string) => {
      const timer = typingTimers.get(conversationId);
      if (timer) clearTimeout(timer);
      typingTimers.delete(conversationId);
      setTypingIn((previous) => {
        if (!previous.has(conversationId)) return previous;
        const next = new Set(previous);
        next.delete(conversationId);
        return next;
      });
    };

    const unsubscribe = subscribeToChat((event) => {
      switch (event.type) {
        case 'message': {
          // An arriving message ends the typing state it was announced by.
          clearTyping(event.conversationId);
          queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
          queryClient.invalidateQueries({ queryKey: chatKeys.stats() });
          queryClient.invalidateQueries({
            queryKey: chatKeys.conversation(event.conversationId),
          });
          // Only the OPEN thread's history is refetched. Invalidating every
          // cached thread would fan one frame out into a request per visited
          // conversation, none of which is on screen.
          if (activeRef.current === event.conversationId) {
            queryClient.invalidateQueries({
              queryKey: chatKeys.messages(event.conversationId),
            });
          }
          break;
        }
        case 'typing': {
          const { conversationId } = event;
          setTypingIn((previous) => {
            if (previous.has(conversationId)) return previous;
            const next = new Set(previous);
            next.add(conversationId);
            return next;
          });
          const existing = typingTimers.get(conversationId);
          if (existing) clearTimeout(existing);
          typingTimers.set(
            conversationId,
            setTimeout(() => clearTyping(conversationId), TYPING_TIMEOUT_MS),
          );
          break;
        }
        case 'read': {
          queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
          queryClient.invalidateQueries({ queryKey: chatKeys.stats() });
          break;
        }
      }
    });

    return () => {
      unsubscribe();
      for (const timer of typingTimers.values()) clearTimeout(timer);
      typingTimers.clear();
    };
  }, [queryClient]);

  return { typingIn };
}
