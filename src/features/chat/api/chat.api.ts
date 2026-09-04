import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import { useAuthStore } from '@shared/stores/authStore';
import { getScopeRegions } from '@features/region-management/api';
import {
  applyOwnerScope,
  filterAndPaginateConversations,
  isConversationVisible,
  projectMembership,
  type ChatScope,
} from './chat.filter';
import { toChatMessage, toChatOwnerOption, toConversation } from './chat.types';
import type {
  ChatMessage,
  ChatMessageDto,
  ChatOwnerOption,
  ChatOwnerOptionDto,
  ChatStats,
  ChatStreamEvent,
  ChatStreamUnsubscribe,
  Conversation,
  ConversationDto,
  ConversationListParams,
  ConversationListResult,
  MessagePage,
  SendMessageInput,
  StartConversationInput,
} from './chat.types';

/**
 * CHAT — the live source (SRS module 15).
 *
 * ── BACKEND CONTRACT ──────────────────────────────────────────────────────────
 * The STORAGE half already exists in bplay-backend and is reused as-is:
 *   db/migrations/078_central_chat.sql  → conversations / conversation_participants
 *                                         / messages, keyed to users(id) so an
 *                                         admin and an owner can share a thread;
 *   src/modules/chat/*                  → the generic per-user conversation API;
 *   src/plugins/realtime.js             → the SSE hub at GET /realtime/stream.
 *
 * What that generic module does NOT provide, and what the admin module added
 * alongside it (src/modules/super-admin/admin-chat/*) serves, is everything this
 * screen is: an ADMINISTRATION-side inbox rather than a per-user one — region
 * scoping, owner identity hydration, the category/status vocabulary, and unread
 * counters for the administration side as a whole.
 *
 *   GET    /admin/chat/conversations                → { items: ConversationDto[] }
 *   GET    /admin/chat/conversations/stats          → ChatStats over the CALLER'S scope
 *   GET    /admin/chat/conversations/{id}           → ConversationDto
 *   GET    /admin/chat/conversations/{id}/messages  → { messages, hasMore }
 *   POST   /admin/chat/conversations/{id}/messages  → the created ChatMessageDto
 *   POST   /admin/chat/conversations/{id}/read      → { ok: true }
 *   POST   /admin/chat/conversations                → resolve-or-create by
 *                                                     { ownerId, category, facilityId? }
 *   GET    /admin/chat/owners                       → { items: ChatOwnerOptionDto[] }
 *
 * Live delivery rides the EXISTING transport: the admin is a conversation
 * participant, so `hub.publishToUser` already reaches them on
 * GET /realtime/stream. See `subscribeToChat` at the bottom of this file.
 *
 * ── SECURITY OBLIGATIONS ON THE BACKEND ───────────────────────────────────────
 * The scope filter in chat.filter.ts runs in the browser and is defence in depth
 * ONLY. The server must, from the caller's JWT and never from a request
 * parameter:
 *   1. restrict the list to the caller's regions — a regional admin must not
 *      receive out-of-region threads at all;
 *   2. return 404 — not 403 — for an out-of-scope id, so ids cannot be probed;
 *   3. re-check scope on every write (send / read / start);
 *   4. enforce MESSAGE_MAX_LENGTH and rate-limit sends;
 *   5. reject an admin-authored attachment outright while CH3 stands;
 *   6. write an audit row per sent message (SRS module 04).
 */

const PATH = '/admin/chat';

/**
 * The scope is read outside React, exactly like apiClient reads the token. The
 * live region set is re-read every time so deactivating or deleting a region
 * revokes access on the next request.
 */
async function currentScope(): Promise<ChatScope> {
  const { role, user } = useAuthStore.getState();
  const regions = await getScopeRegions();
  return {
    role,
    assignedRegionIds: user?.assignedRegionIds,
    activeRegionIds: new Set(
      regions.filter((region) => region.isActive).map((region) => region.id),
    ),
  };
}

/** Refuse an out-of-scope thread as "not found", so an id is never confirmed. */
function assertVisible(conversation: Conversation, scope: ChatScope): Conversation {
  if (!isConversationVisible(conversation, scope)) throw new Error('Conversation not found');
  return projectMembership(conversation, scope);
}

export async function getConversations(
  params: ConversationListParams,
): Promise<ConversationListResult> {
  const [res, scope] = await Promise.all([
    apiClient.get(`${PATH}/conversations`, { params }),
    currentScope(),
  ]);
  const all = unwrapList<ConversationDto>(res.data, ['conversations', 'items']).map(toConversation);
  return filterAndPaginateConversations(all, params, scope);
}

/**
 * `/stats` returns the counters ALREADY scoped to the caller — it is an object,
 * not a list, and the server's numbers are authoritative.
 */
export async function getChatStats(): Promise<ChatStats> {
  const res = await apiClient.get(`${PATH}/conversations/stats`);
  const dto = unwrap<Partial<ChatStats>>(res.data);
  return {
    total: dto.total ?? 0,
    unread: dto.unread ?? 0,
    awaitingAdmin: dto.awaitingAdmin ?? 0,
    resolved: dto.resolved ?? 0,
  };
}

export async function getConversationById(id: string): Promise<Conversation> {
  const [res, scope] = await Promise.all([
    apiClient.get(`${PATH}/conversations/${id}`),
    currentScope(),
  ]);
  // Belt and braces: if the server ever returns an out-of-scope row, refuse it here too.
  return assertVisible(toConversation(unwrap<ConversationDto>(res.data)), scope);
}

/**
 * FR-ADM-CHAT-002 — thread history, OLDEST FIRST for rendering. The server
 * paginates newest-first with a keyset `before` cursor (the shape the central
 * chat module already uses); the order is flipped once, here, so no component
 * has to think about it.
 */
export async function getMessages(
  conversationId: string,
  opts: { before?: string; limit?: number } = {},
): Promise<MessagePage> {
  const res = await apiClient.get(`${PATH}/conversations/${conversationId}/messages`, {
    params: { before: opts.before, limit: opts.limit },
  });
  const payload = unwrap<{ messages?: ChatMessageDto[]; hasMore?: boolean }>(res.data) ?? {};
  const messages = (payload.messages ?? []).map(toChatMessage);
  messages.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return { messages, hasMore: payload.hasMore ?? false };
}

/** FR-ADM-CHAT-003 — send a TEXT message (CH3: no attachment field, by design). */
export async function sendMessage(
  conversationId: string,
  input: SendMessageInput,
): Promise<ChatMessage> {
  const res = await apiClient.post(`${PATH}/conversations/${conversationId}/messages`, {
    body: input.body,
  });
  return toChatMessage(unwrap<ChatMessageDto>(res.data));
}

/** FR-ADM-CHAT-002 — advance the administration's read cursor for this thread. */
export async function markConversationRead(conversationId: string): Promise<void> {
  await apiClient.post(`${PATH}/conversations/${conversationId}/read`);
}

/**
 * FR-ADM-CHAT-003 — resolve-or-create the thread for (owner, category[, facility]).
 * Idempotent on the server, so re-opening the picker for the same pair returns
 * the existing thread instead of forking the history.
 */
export async function startConversation(input: StartConversationInput): Promise<Conversation> {
  const [res, scope] = await Promise.all([
    apiClient.post(`${PATH}/conversations`, {
      ownerId: input.ownerId,
      category: input.category,
      facilityId: input.facilityId,
    }),
    currentScope(),
  ]);
  return assertVisible(toConversation(unwrap<ConversationDto>(res.data)), scope);
}

/** The owners this admin may open a thread with, already narrowed by scope. */
export async function getChatOwnerOptions(): Promise<ChatOwnerOption[]> {
  const [res, scope] = await Promise.all([apiClient.get(`${PATH}/owners`), currentScope()]);
  const all = unwrapList<ChatOwnerOptionDto>(res.data, ['owners', 'items']).map(toChatOwnerOption);
  return applyOwnerScope(all, scope);
}

// ---------------------------------------------------------------------------
// Live transport
// ---------------------------------------------------------------------------

/** Give up after this many consecutive failures — never reconnect-loop forever. */
const MAX_RETRIES = 5;

/**
 * Subscribe to live chat activity over the EXISTING Server-Sent Events stream
 * (`plugins/realtime.js`), which already fans a conversation's traffic out to
 * every participant — the admin included.
 *
 * Only SIGNALS are surfaced (see `ChatStreamEvent`): the caller invalidates and
 * refetches through the scoped pipeline rather than trusting a frame's payload.
 *
 * ⚠️ AUTH CAVEAT, INHERITED FROM THE TRANSPORT: `EventSource` cannot set request
 * headers, so the server accepts `?token=<jwt>` (plugins/realtime.js). The access
 * token therefore appears in the stream URL. That is the backend's documented
 * auth method for this endpoint and is not something the client can work around;
 * it is called out here so nobody copies the pattern to a normal request, where
 * `apiClient` sends a proper `Authorization` header.
 */
export function subscribeToChat(handler: (event: ChatStreamEvent) => void): ChatStreamUnsubscribe {
  const token = useAuthStore.getState().accessToken;
  if (!token || typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }

  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
  // `base` may be relative ("/api/v1") in production, which `new URL` needs an
  // origin for; resolving against the document keeps both forms working.
  const url = new URL(`${base.replace(/\/$/, '')}/realtime/stream`, window.location.origin);
  url.searchParams.set('token', token);

  let source: EventSource | null = null;
  let retryTimer: number | undefined;
  let failures = 0;
  let closed = false;

  const connect = () => {
    if (closed) return;
    source = new EventSource(url.toString());

    source.onopen = () => {
      failures = 0;
    };

    source.onmessage = (event: MessageEvent<string>) => {
      let payload: Record<string, unknown> | null = null;
      try {
        payload = JSON.parse(event.data) as Record<string, unknown>;
      } catch {
        // A malformed frame is the server's problem, not a reason to tear down
        // a working stream.
        return;
      }
      const parsed = toStreamEvent(payload);
      if (parsed) handler(parsed);
    };

    source.onerror = () => {
      source?.close();
      source = null;
      failures += 1;
      if (closed || failures >= MAX_RETRIES) return;
      // EventSource retries on its own, but only for a clean disconnect — a 401
      // or a 404 closes it for good. Reconnecting explicitly, with a backoff
      // capped by MAX_RETRIES, covers both without hammering a dead endpoint.
      retryTimer = window.setTimeout(connect, 2 ** failures * 1000);
    };
  };

  connect();

  return () => {
    closed = true;
    if (retryTimer) window.clearTimeout(retryTimer);
    source?.close();
  };
}

/**
 * Narrow a raw SSE frame to a chat signal, or null for anything else on the
 * shared stream (notifications ride the same connection).
 *
 * The hub publishes the central-chat shapes — `{ type: 'message', message: {…} }`
 * and `{ type: 'typing', userId }` — plus, from the admin module, the
 * conversation id at the top level so a frame is usable without reading a
 * payload we have deliberately decided not to trust.
 */
function toStreamEvent(payload: Record<string, unknown>): ChatStreamEvent | null {
  const type = payload.type;
  const nested = (payload.message ?? null) as Record<string, unknown> | null;
  const conversationId =
    typeof payload.conversationId === 'string'
      ? payload.conversationId
      : typeof nested?.conversationId === 'string'
        ? nested.conversationId
        : null;
  if (!conversationId) return null;

  if (type === 'message' || type === 'message_deleted') {
    return { type: 'message', conversationId };
  }
  if (type === 'typing') {
    // A frame reaching this admin can only have come from the counterpart; the
    // hub excludes the sender from its own fan-out (`exceptUserId`).
    return { type: 'typing', conversationId, senderType: 'owner' };
  }
  if (type === 'read') {
    return { type: 'read', conversationId };
  }
  return null;
}
