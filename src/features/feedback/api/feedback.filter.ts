import { DEFAULT_PAGE_SIZE, filterPaginate } from '@shared/lib/paginate';
import { EMPTY_DATE_RANGE, resolveDateRange } from '@ui';
import type { UserRole } from '@shared/stores/authStore';
import type {
  Feedback,
  FeedbackListParams,
  FeedbackListResult,
  FeedbackSortBy,
  FeedbackStats,
} from './feedback.types';

/**
 * The signed-in admin's visibility. Mirrors `AdminScope` in facility-management
 * (the codebase keeps one copy per scoped feature rather than a shared module).
 */
export interface FeedbackScope {
  role: UserRole | null;
  assignedRegionIds?: string[];
  /**
   * Ids of the regions that are LIVE right now (active and not deleted),
   * re-read on every request. Membership is resolved against this rather than
   * trusting the id stamped on the row, so deactivating or deleting a region
   * revokes access immediately — the same invariant facility-management holds
   * by recomputing geo membership per request.
   */
  activeRegionIds: Set<string>;
}

/**
 * Is the sender still inside a live region? A row whose region has since been
 * deactivated or deleted is treated exactly like a sender no region covers.
 */
export function isEffectivelyOrphan(feedback: Feedback, scope: FeedbackScope): boolean {
  return feedback.regionId === null || !scope.activeRegionIds.has(feedback.regionId);
}

/**
 * Stamp the LIVE membership onto a row before it reaches the UI, so the region
 * badge can never claim a region the scope gate no longer honours.
 */
export function projectMembership(feedback: Feedback, scope: FeedbackScope): Feedback {
  const orphan = isEffectivelyOrphan(feedback, scope);
  if (orphan === feedback.isOrphan && (!orphan || feedback.regionNames.length === 0)) {
    return feedback;
  }
  return { ...feedback, isOrphan: orphan, regionNames: orphan ? [] : feedback.regionNames };
}

/** The sentinel the region filter uses for "sender outside every region". */
export const ORPHAN_REGION = 'orphans';

/**
 * FR-ADM-FEED-005 — THE SCOPE GATE. Identical three-way semantics to
 * `applyScope()` in facility-management, so the whole dashboard behaves the same:
 *  - super_admin sees everything, orphans included;
 *  - an admin WITH assigned regions sees only senders inside one of them;
 *  - an admin WITHOUT assigned regions is "general oversight" and sees every
 *    non-orphan item.
 *
 * SECURITY: this is a client-side filter and therefore DEFENCE IN DEPTH ONLY.
 * The list, the detail read and every write must be re-scoped by the backend
 * from the caller's JWT — a filter that runs in the browser protects nobody.
 * See the contract note at the top of feedback.api.ts.
 */
export function applyFeedbackScope(items: Feedback[], scope: FeedbackScope): Feedback[] {
  if (scope.role === 'super_admin') return items;

  const assigned = scope.assignedRegionIds ?? [];
  if (scope.role === 'admin' && assigned.length > 0) {
    // Only regions that are BOTH assigned to this admin and still live.
    const allowed = new Set(assigned.filter((id) => scope.activeRegionIds.has(id)));
    return items.filter((item) => item.regionId !== null && allowed.has(item.regionId));
  }

  // General oversight: the whole platform except senders no live region covers.
  return items.filter((item) => !isEffectivelyOrphan(item, scope));
}

/** Is this item readable by the given scope? The detail + write guard. */
export function isFeedbackVisible(feedback: Feedback, scope: FeedbackScope): boolean {
  return applyFeedbackScope([feedback], scope).length === 1;
}

const COMPARE: Record<FeedbackSortBy, (a: Feedback, b: Feedback) => number> = {
  createdAt: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  updatedAt: (a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt),
};

/**
 * The ONE filter/sort/paginate pipeline, shared by the real and the mock source.
 * Scope is applied FIRST so no later filter can widen it.
 */
export function filterAndPaginateFeedback(
  all: Feedback[],
  params: FeedbackListParams,
  scope: FeedbackScope,
): FeedbackListResult {
  let items = applyFeedbackScope(all, scope);

  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (item) =>
        item.body.toLowerCase().includes(q) ||
        item.sender.name.toLowerCase().includes(q) ||
        (item.sender.email?.toLowerCase().includes(q) ?? false),
    );
  }

  if (params.senderType && params.senderType !== 'all') {
    items = items.filter((item) => item.sender.type === params.senderType);
  }

  if (params.kind && params.kind !== 'all') {
    items = items.filter((item) => item.kind === params.kind);
  }

  if (params.status && params.status !== 'all') {
    items = items.filter((item) => item.status === params.status);
  }

  if (params.regionId && params.regionId !== 'all') {
    items =
      params.regionId === ORPHAN_REGION
        ? items.filter((item) => isEffectivelyOrphan(item, scope))
        : items.filter(
            (item) => item.regionId === params.regionId && !isEffectivelyOrphan(item, scope),
          );
  }

  const range = resolveDateRange(params.dateRange ?? EMPTY_DATE_RANGE, Date.now());
  if (range.fromMs !== null || range.toMs !== null) {
    items = items.filter((item) => {
      const at = Date.parse(item.createdAt);
      if (range.fromMs !== null && at < range.fromMs) return false;
      if (range.toMs !== null && at > range.toMs) return false;
      return true;
    });
  }

  // Newest first by default — an inbox reads top-down.
  items = [...items].sort(COMPARE[params.sortBy ?? 'createdAt']);
  if ((params.sortDir ?? 'desc') === 'desc') items.reverse();

  // Clamp the page so deleting/filtering never strands the admin past the end.
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(params.page ?? 1, 1), pageCount);

  const result = filterPaginate(items, { page, pageSize });
  return { ...result, items: result.items.map((item) => projectMembership(item, scope)) };
}

/** KPI counters over everything the admin may see — not just the current page. */
export function computeFeedbackStats(all: Feedback[], scope: FeedbackScope): FeedbackStats {
  const visible = applyFeedbackScope(all, scope);
  return {
    total: visible.length,
    new: visible.filter((item) => item.status === 'new').length,
    replied: visible.filter((item) => item.status === 'replied').length,
    closed: visible.filter((item) => item.status === 'closed').length,
  };
}
