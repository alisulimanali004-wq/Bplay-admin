import { filterPaginate } from '@shared/lib/paginate';
import type { UserRole } from '@shared/stores/authStore';
import type {
  ChatOwnerOption,
  ChatStats,
  Conversation,
  ConversationListParams,
  ConversationListResult,
} from './chat.types';

/**
 * FR-ADM-CHAT-004 / CH4 — the scope gate.
 *
 * Identical three-way semantics to `applyFeedbackScope()` and to
 * facility-management's `applyScope()`, so the whole dashboard behaves the same:
 *  - super_admin sees every thread, orphans included;
 *  - an admin WITH assigned regions sees only threads whose facility sits in one
 *    of them (and only while that region is still live);
 *  - an admin WITHOUT assigned regions is "general oversight" and sees every
 *    non-orphan thread.
 *
 * SECURITY: this runs in the browser and is DEFENCE IN DEPTH ONLY. The list, the
 * thread read and every write must be re-scoped by the backend from the caller's
 * JWT — see the contract note at the top of chat.api.ts.
 */
export interface ChatScope {
  role: UserRole | null;
  assignedRegionIds?: string[];
  /**
   * Ids of the regions that are LIVE right now, re-read on every request, so
   * deactivating a region revokes access on the next call rather than the next
   * deploy. Same invariant feedback holds.
   */
  activeRegionIds: Set<string>;
}

/** The sentinel the region filter uses for "facility outside every live region". */
export const ORPHAN_REGION = 'orphans';

/** Rail page size — a conversation rail scrolls further than a data table. */
export const CONVERSATION_PAGE_SIZE = 20;

/**
 * Is the thread's facility still inside a live region? A row whose region has
 * since been deactivated or deleted is treated exactly like one no region covers.
 */
export function isEffectivelyOrphan(conversation: Conversation, scope: ChatScope): boolean {
  return conversation.regionId === null || !scope.activeRegionIds.has(conversation.regionId);
}

/**
 * Stamp the LIVE membership onto a row before it reaches the UI, so the region
 * badge can never claim a region the scope gate no longer honours.
 */
export function projectMembership(conversation: Conversation, scope: ChatScope): Conversation {
  const orphan = isEffectivelyOrphan(conversation, scope);
  if (orphan === conversation.isOrphan && (!orphan || conversation.regionNames.length === 0)) {
    return conversation;
  }
  return {
    ...conversation,
    isOrphan: orphan,
    regionNames: orphan ? [] : conversation.regionNames,
  };
}

export function applyChatScope(items: Conversation[], scope: ChatScope): Conversation[] {
  if (scope.role === 'super_admin') return items;

  const assigned = scope.assignedRegionIds ?? [];
  if (scope.role === 'admin' && assigned.length > 0) {
    const allowed = new Set(assigned.filter((id) => scope.activeRegionIds.has(id)));
    return items.filter((item) => item.regionId !== null && allowed.has(item.regionId));
  }

  // General oversight: the whole platform except facilities no live region covers.
  return items.filter((item) => !isEffectivelyOrphan(item, scope));
}

/** Is this thread readable by the given scope? The detail + write guard. */
export function isConversationVisible(conversation: Conversation, scope: ChatScope): boolean {
  return applyChatScope([conversation], scope).length === 1;
}

/**
 * The owner picker obeys the same gate: an admin must not be offered an owner
 * they could not then message. Reuses the conversation rule by shaping the owner
 * into the two fields the gate reads, so the two can never drift apart.
 */
export function applyOwnerScope(owners: ChatOwnerOption[], scope: ChatScope): ChatOwnerOption[] {
  if (scope.role === 'super_admin') return owners;

  const assigned = scope.assignedRegionIds ?? [];
  if (scope.role === 'admin' && assigned.length > 0) {
    const allowed = new Set(assigned.filter((id) => scope.activeRegionIds.has(id)));
    return owners.filter((owner) => owner.regionId !== null && allowed.has(owner.regionId));
  }

  return owners.filter(
    (owner) => owner.regionId !== null && scope.activeRegionIds.has(owner.regionId),
  );
}

/**
 * The ONE filter/sort/paginate pipeline, shared by the real and the mock source.
 * Scope is applied FIRST so no later filter can widen it.
 *
 * Ordering is fixed to "most recent activity first" (FR-ADM-CHAT-001: مرتّبة
 * بالأحدث) — a messenger rail has exactly one meaningful order, so there is no
 * sort control to get out of sync with it.
 */
export function filterAndPaginateConversations(
  all: Conversation[],
  params: ConversationListParams,
  scope: ChatScope,
): ConversationListResult {
  let items = applyChatScope(all, scope);

  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (item) =>
        item.owner.name.toLowerCase().includes(q) ||
        (item.owner.email?.toLowerCase().includes(q) ?? false) ||
        item.title.toLowerCase().includes(q) ||
        (item.facilityName?.toLowerCase().includes(q) ?? false) ||
        item.lastMessagePreview.toLowerCase().includes(q),
    );
  }

  if (params.category && params.category !== 'all') {
    items = items.filter((item) => item.category === params.category);
  }

  if (params.status && params.status !== 'all') {
    items = items.filter((item) => item.status === params.status);
  }

  if (params.readState === 'unread') {
    items = items.filter((item) => item.unreadCount > 0);
  }

  if (params.regionId && params.regionId !== 'all') {
    items =
      params.regionId === ORPHAN_REGION
        ? items.filter((item) => isEffectivelyOrphan(item, scope))
        : items.filter(
            (item) => item.regionId === params.regionId && !isEffectivelyOrphan(item, scope),
          );
  }

  items = [...items].sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt));

  // Clamp the page so filtering never strands the admin past the end.
  const pageSize = params.pageSize ?? CONVERSATION_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(params.page ?? 1, 1), pageCount);

  const result = filterPaginate(items, { page, pageSize });
  return { ...result, items: result.items.map((item) => projectMembership(item, scope)) };
}

/** Counters over everything the admin may see — not just the current page. */
export function computeChatStats(all: Conversation[], scope: ChatScope): ChatStats {
  const visible = applyChatScope(all, scope);
  return {
    total: visible.length,
    unread: visible.filter((item) => item.unreadCount > 0).length,
    awaitingAdmin: visible.filter((item) => item.status === 'awaiting_admin').length,
    resolved: visible.filter((item) => item.status === 'resolved').length,
  };
}
