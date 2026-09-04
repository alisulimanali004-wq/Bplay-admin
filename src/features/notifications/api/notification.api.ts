import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import { useAuthStore } from '@shared/stores/authStore';
import { getScopeRegions } from '@features/region-management/api';
import {
  computeNotificationStats,
  filterAndPaginateNotifications,
  selectRecent,
  type NotificationScope,
} from './notification.filter';
import { RECENT_LIMIT, toNotification, toNotificationPreferences } from './notification.types';
import type {
  MarkAllReadResult,
  Notification,
  NotificationCategory,
  NotificationDto,
  NotificationListParams,
  NotificationListResult,
  NotificationPreference,
  NotificationPreferenceDto,
  NotificationReadResult,
  NotificationStats,
  SetNotificationPreferenceInput,
  UnreadCountDto,
} from './notification.types';

/**
 * NOTIFICATIONS — the live source (SRS module 14 branch ج, FR-ADM-SET-006/008).
 *
 * ── BACKEND CONTRACT · WHAT EXISTS TODAY ─────────────────────────────────────
 * Unusually for this dashboard, most of this slice is already served. The module
 * lives at bplay-backend/src/modules/notifications and every route below is
 * mounted under `/notifications` with `app.authenticate` only — no role check, no
 * permission, no city scope. Each route is scoped to `request.user.sub`, so an
 * admin JWT reads THAT ADMIN'S OWN rows, which is exactly what a notification
 * centre needs.
 *
 *   GET    /notifications                  ?unreadOnly&category&limit(1..100)&before&locale
 *                                          → { success, data: NotificationDto[] }   ← BARE ARRAY
 *   GET    /notifications/unread-count      → { success, data: { unread: int } }
 *   POST   /notifications/{id}/read         → { success, data: { id, readAt } }
 *   POST   /notifications/read-all          { category? } → { success, data: { updated } }
 *   GET    /notifications/preferences       → { success, data: [{category, channel, enabled}] }
 *   PUT    /notifications/preferences       { category, channel, enabled } → the row
 *   GET    /realtime/stream?token=<jwt>     SSE, `data: {"type":"notification",…}`
 *
 * Note the response envelope here is `{ success, data }` — there is no `message`
 * and no `meta`, unlike the snake_case admin endpoints. `unwrapList` handles it.
 *
 * ── DELIBERATE CLIENT-SIDE WORK, AND WHY ─────────────────────────────────────
 * 1. PAGINATION. `GET /notifications` paginates by KEYSET (`before` = an ISO
 *    cursor) and returns no total. The dashboard's `Pagination` is page-based, so
 *    this fetches one `limit=100` window and re-paginates in
 *    `notification.filter.ts` — the same approach every other list in this app
 *    takes. A backend that later returns `{ items, meta:{ page, pageSize, total } }`
 *    can be adopted by changing `unwrapList` here and nothing else.
 * 2. FILTERS. The server understands only `unreadOnly` and `category`; AJV runs
 *    with `removeAdditional: 'all'`, so any other query param is SILENTLY DROPPED
 *    rather than rejected. Sending `q`/`type`/`regionId` would therefore look like
 *    it worked and quietly return unfiltered rows — so params are NOT forwarded,
 *    and every filter is applied client-side over the fetched window.
 * 3. STATS. There is no `/stats` endpoint; the counters are computed over the
 *    fetched window. They are honest for a window of 100 and must move server-side
 *    if that ever stops being enough.
 *
 * ── WHAT THE BACKEND STILL OWES THIS FEATURE ─────────────────────────────────
 * a. PRODUCERS. The five FR-ADM-SET-007 events emit nothing today. `notifyRole()`
 *    exists and works; what is missing is a call site in each module —
 *    owner request (FR-ADM-OWNER-001) · facility request (FR-ADM-FAC-001) ·
 *    new feedback (FR-ADM-FEED-001) · community report (FR-ADM-COMM-001) ·
 *    paid subscription (FR-ADM-PLAN-001) — plus an ar+en `notification_templates`
 *    pair per event, keyed `admin.<event>` (see `TYPE_BY_WIRE` in
 *    notification.types.ts for the exact keys this client already understands).
 *    Until then the only row an admin ever receives is
 *    `admin.location_coverage_gap`, written by a Postgres trigger.
 * b. SUBJECTS. Each producer must set `subject_type`/`subject_id` to the record
 *    the admin should open — `owner`, `facility`, `feedback`, `post`, `plan`.
 *    Without them the row is delivered but has no deep link, which is half of
 *    FR-ADM-SET-006.
 * c. REGION (FR-ADM-SET-008). Scoping must happen at EMIT time —
 *    `notifyRole({ roles:['admin','super_admin'], cityId })`, which already fans
 *    out over `admin_cities` and always includes the unscoped super_admins. If
 *    the row additionally carries `regionId`/`regionNames`, this client will
 *    surface a region tag and a region filter; both degrade cleanly to
 *    "platform-wide" when absent.
 * d. LIST PAGINATION metadata, so the window above can be retired.
 *
 * ── SECURITY OBLIGATIONS ON THE BACKEND ──────────────────────────────────────
 * The scope gate in notification.filter.ts runs in the browser and is defence in
 * depth ONLY. What actually protects an admin's inbox is that every route is
 * keyed to `user_id` from the JWT — that invariant must survive any future
 * "list all notifications" endpoint, which would need its own permission slug
 * (none of the 25 seeded slugs is notification-related, so anything gated by
 * `requirePermission` is super-admin-only until one is added).
 */

const PATH = '/notifications';

/**
 * One window of the caller's notifications. 100 is the server's hard maximum
 * (`limit: { maximum: 100 }` in notifications.schema.js) — asking for more is
 * silently coerced, not an error.
 */
const WINDOW_LIMIT = 100;

/**
 * The scope is read outside React, exactly like apiClient reads the token. The
 * live region set is re-read every time so deactivating a region narrows the
 * view on the next request instead of on the next deploy.
 */
async function currentScope(): Promise<NotificationScope> {
  const { role, user } = useAuthStore.getState();
  const regions = await getScopeRegions();
  return {
    role,
    assignedRegionIds: user?.assignedRegionIds,
    activeRegionIds: new Set(regions.filter((region) => region.isActive).map((region) => region.id)),
  };
}

/**
 * Fetch one window of the caller's rows. No filter params are forwarded — see
 * note 2 in the contract block above.
 */
/**
 * PAGINATION: client-side, applied exactly once.
 *
 * The endpoint now supports BOTH modes — keyset (`before`, what the mobile feed
 * uses) and offset (`page`/`pageSize`, which also returns a `meta` block). This
 * client still cannot use offset mode, and the reason is the scope gate in
 * `filterAndPaginateNotifications`: it runs in the browser and can drop rows, so
 * a server page would be filtered after the fact and the totals would lie.
 *
 * Nothing here was double-paginating — `fetchWindow` never forwarded a page —
 * so this is a window-size change, not a bug fix. The window is the honest
 * limit: beyond it, older notifications are simply not in the working set.
 */
async function fetchWindow(): Promise<Notification[]> {
  const res = await apiClient.get(PATH, { params: { limit: WINDOW_LIMIT } });
  return unwrapList<NotificationDto>(res.data, ['notifications', 'items']).map(toNotification);
}

export async function getNotifications(
  params: NotificationListParams,
): Promise<NotificationListResult> {
  const [all, scope] = await Promise.all([fetchWindow(), currentScope()]);
  return filterAndPaginateNotifications(all, params, scope);
}

export async function getNotificationStats(): Promise<NotificationStats> {
  const [all, scope] = await Promise.all([fetchWindow(), currentScope()]);
  return computeNotificationStats(all, scope);
}

/**
 * The badge number. Uses the dedicated cheap endpoint rather than counting a
 * fetched window — it is one indexed COUNT and it is polled, so it must stay
 * light. The server already excludes expired rows.
 *
 * It counts across the caller's whole inbox, which is the same set the scope
 * gate would return, so no client-side re-scoping is applied here: doing so
 * would need the full window and defeat the point of the endpoint.
 */
export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get(`${PATH}/unread-count`);
  const dto = unwrap<UnreadCountDto>(res.data);
  return dto?.unread ?? 0;
}

/** The bell's short list: unread first, then newest. */
export async function getRecentNotifications(
  limit: number = RECENT_LIMIT,
): Promise<Notification[]> {
  const [all, scope] = await Promise.all([fetchWindow(), currentScope()]);
  return selectRecent(all, scope, limit);
}

export async function markNotificationRead(id: string): Promise<NotificationReadResult> {
  const res = await apiClient.post(`${PATH}/${id}/read`);
  const dto = unwrap<{ id?: string; readAt?: string | null }>(res.data);
  return { id: String(dto?.id ?? id), readAt: dto?.readAt ?? new Date().toISOString() };
}

/**
 * Clear the badge. `category` is accepted by the server, but the wire vocabulary
 * is the backend's (`admin`, `rooms`, …) and this dashboard's categories are
 * derived client-side, so nothing is sent: "mark all read" means all.
 */
export async function markAllNotificationsRead(): Promise<MarkAllReadResult> {
  const res = await apiClient.post(`${PATH}/read-all`, {});
  const dto = unwrap<{ updated?: number }>(res.data);
  return { updated: dto?.updated ?? 0 };
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const res = await apiClient.get(`${PATH}/preferences`);
  return toNotificationPreferences(
    unwrapList<NotificationPreferenceDto>(res.data, ['preferences', 'items']),
  );
}

export async function setNotificationPreference(
  input: SetNotificationPreferenceInput,
): Promise<NotificationPreference> {
  await apiClient.put(`${PATH}/preferences`, {
    category: input.category,
    channel: input.channel,
    enabled: input.enabled,
  });
  // The server echoes the row, but it is exactly what was sent; returning the
  // input avoids a second normalise pass and keeps the optimistic path honest.
  return { category: input.category as NotificationCategory, channel: input.channel, enabled: input.enabled };
}
