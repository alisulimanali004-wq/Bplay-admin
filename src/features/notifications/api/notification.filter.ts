import { DEFAULT_PAGE_SIZE, filterPaginate } from '@shared/lib/paginate';
import { EMPTY_DATE_RANGE, resolveDateRange } from '@ui';
import type { UserRole } from '@shared/stores/authStore';
import { canFollowSubject } from './notification.types';
import type {
  Notification,
  NotificationListParams,
  NotificationListResult,
  NotificationSortBy,
  NotificationStats,
} from './notification.types';

/**
 * The signed-in admin's visibility. Same shape as `FeedbackScope` — the codebase
 * keeps one copy per scoped feature rather than a shared module.
 */
export interface NotificationScope {
  role: UserRole | null;
  assignedRegionIds?: string[];
  /**
   * Ids of the regions that are LIVE right now, re-read on every request, so
   * deactivating a region narrows an admin's view immediately rather than on the
   * next deploy.
   */
  activeRegionIds: Set<string>;
}

/** The sentinel the region filter uses for "no regional anchor". */
export const PLATFORM_SCOPE = 'platform';

/**
 * FR-ADM-SET-008 — THE SCOPE GATE.
 *
 * ⚠️ This deliberately does NOT copy the feedback/facility three-way gate, and
 * the difference matters. Feedback is addressed to *the platform*, so a row
 * outside every region is an orphan only a super-admin may read. A notification
 * is addressed to *a user*: the server already decided who receives it (see
 * `notifyRole({ cityId })` in notifications.service.js:185, which fans out over
 * `admin_cities` and always includes the unscoped super_admins). Region here is
 * a display and filtering dimension layered on top of that decision.
 *
 * So the rules are:
 *   - super_admin              → everything, platform-wide notices included;
 *   - admin WITH regions       → platform-wide notices + their live regions;
 *   - admin WITHOUT regions    → everything (general oversight is not
 *                                region-restricted, and has nothing to be
 *                                restricted *from* — every row here was
 *                                addressed to this admin in the first place).
 *
 * Treating `regionId === null` as an orphan would hide legitimately delivered
 * notifications from the very admin they were sent to. That is the failure mode
 * this comment exists to prevent.
 *
 * SECURITY: a browser-side filter protects nobody. `GET /notifications` is
 * already scoped to the caller by `user_id`, which is what actually enforces
 * this; the gate below is defence in depth and a faithful simulation of
 * emit-time scoping for the mock source.
 */
export function applyNotificationScope(
  items: Notification[],
  scope: NotificationScope,
): Notification[] {
  if (scope.role === 'super_admin') return items;

  const assigned = scope.assignedRegionIds ?? [];
  if (scope.role === 'admin' && assigned.length > 0) {
    // Only regions that are BOTH assigned to this admin and still live.
    const allowed = new Set(assigned.filter((id) => scope.activeRegionIds.has(id)));
    return items.filter((item) => item.regionId === null || allowed.has(item.regionId));
  }

  return items;
}

/** Is this notification readable by the given scope? The detail + write guard. */
export function isNotificationVisible(
  notification: Notification,
  scope: NotificationScope,
): boolean {
  return applyNotificationScope([notification], scope).length === 1;
}

/**
 * Everything that depends on WHO is reading, applied in one place on the way out.
 * Both data sources run every row through this, so the mock and the real service
 * cannot disagree about what a row looks like.
 *
 * Two projections:
 *  1. LIVE region membership, so the region tag can never claim a region the
 *     scope gate no longer honours. A row anchored to a region that has since
 *     been deactivated reads as platform-wide rather than as a region the admin
 *     cannot see.
 *  2. The deep link, dropped when this role cannot enter the destination —
 *     several targets (Owners, Players, Plans, Regions, Admins) are
 *     super-admin-only routes, and following one as a regional admin is a
 *     silent redirect to the profile page. A `null` link renders the row
 *     unclickable and hides the open button, which is the honest outcome.
 */
export function projectForScope(
  notification: Notification,
  scope: NotificationScope,
): Notification {
  const orphanedRegion =
    notification.regionId !== null && !scope.activeRegionIds.has(notification.regionId);
  const link = canFollowSubject(notification.subject, scope.role) ? notification.link : null;

  if (!orphanedRegion && link === notification.link) return notification;

  return {
    ...notification,
    link,
    ...(orphanedRegion ? { regionNames: [], isPlatformWide: true } : null),
  };
}

/**
 * Does this row still sit inside a LIVE region? A row whose region has since
 * been deactivated is treated exactly like one with no regional anchor — which
 * is what the region column renders, so the region FILTER must agree.
 */
function hasLiveRegion(notification: Notification, scope: NotificationScope): boolean {
  return notification.regionId !== null && scope.activeRegionIds.has(notification.regionId);
}

const COMPARE: Record<NotificationSortBy, (a: Notification, b: Notification) => number> = {
  createdAt: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  // Ties on priority fall back to recency, so the order is total and stable.
  priority: (a, b) => a.priority - b.priority || Date.parse(a.createdAt) - Date.parse(b.createdAt),
};

/**
 * The ONE filter/sort/paginate pipeline, shared by the real and the mock source.
 * Scope is applied FIRST so no later filter can widen it.
 */
export function filterAndPaginateNotifications(
  all: Notification[],
  params: NotificationListParams,
  scope: NotificationScope,
): NotificationListResult {
  let items = applyNotificationScope(all, scope);

  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.body?.toLowerCase().includes(q) ?? false),
    );
  }

  if (params.type && params.type !== 'all') {
    items = items.filter((item) => item.type === params.type);
  }

  if (params.category && params.category !== 'all') {
    items = items.filter((item) => item.category === params.category);
  }

  if (params.readState && params.readState !== 'all') {
    const wantRead = params.readState === 'read';
    items = items.filter((item) => item.isRead === wantRead);
  }

  if (params.regionId && params.regionId !== 'all') {
    // Filter on LIVE membership, matching exactly what the region column shows.
    // Testing the raw `regionId` here would strand rows anchored to a since-
    // deactivated region: the table labels them "Platform-wide", but they would
    // match neither the platform bucket nor any region in the dropdown (which is
    // built from active regions only) — invisible under every filter value.
    items =
      params.regionId === PLATFORM_SCOPE
        ? items.filter((item) => !hasLiveRegion(item, scope))
        : items.filter((item) => item.regionId === params.regionId && hasLiveRegion(item, scope));
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

  // Clamp the page so marking-as-read or filtering never strands the admin past
  // the end of the list.
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(params.page ?? 1, 1), pageCount);

  const result = filterPaginate(items, { page, pageSize });
  return { ...result, items: result.items.map((item) => projectForScope(item, scope)) };
}

/**
 * KPI counters over everything the admin may see — not just the current page.
 * `nowMs` is a parameter rather than a `Date.now()` call so "today" is testable
 * and so the whole function stays pure.
 */
export function computeNotificationStats(
  all: Notification[],
  scope: NotificationScope,
  nowMs: number = Date.now(),
): NotificationStats {
  const visible = applyNotificationScope(all, scope);
  // Local midnight, matching what the admin reading the screen means by "today".
  const startOfDay = new Date(nowMs);
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();

  return {
    total: visible.length,
    unread: visible.filter((item) => !item.isRead).length,
    today: visible.filter((item) => Date.parse(item.createdAt) >= startMs).length,
    highPriority: visible.filter((item) => item.isHighPriority && !item.isRead).length,
  };
}

/** The badge number: unread only, across the admin's whole scope. */
export function countUnread(all: Notification[], scope: NotificationScope): number {
  return applyNotificationScope(all, scope).filter((item) => !item.isRead).length;
}

/** Newest-first slice for the topbar bell. Unread first, then by recency. */
export function selectRecent(
  all: Notification[],
  scope: NotificationScope,
  limit: number,
): Notification[] {
  return applyNotificationScope(all, scope)
    .slice()
    .sort(
      (a, b) =>
        Number(a.isRead) - Number(b.isRead) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    .slice(0, limit)
    .map((item) => projectForScope(item, scope));
}
