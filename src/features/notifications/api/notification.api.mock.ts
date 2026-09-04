import { mockDelay } from '@shared/lib/mock';
import { useAuthStore } from '@shared/stores/authStore';
import { getScopeRegions } from '@features/region-management/api';
import {
  computeNotificationStats,
  countUnread,
  filterAndPaginateNotifications,
  isNotificationVisible,
  selectRecent,
  type NotificationScope,
} from './notification.filter';
import {
  RECENT_LIMIT,
  categoryForType,
  resolveNotificationLink,
  type MarkAllReadResult,
  type Notification,
  type NotificationListParams,
  type NotificationListResult,
  type NotificationPreference,
  type NotificationReadResult,
  type NotificationStats,
  type NotificationSubject,
  type NotificationType,
  type SetNotificationPreferenceInput,
} from './notification.types';

/**
 * In-memory notification centre. Marking one (or all) as read really mutates it,
 * so the badge, the KPI row and the list all move together on a refetch. State
 * lives for the session and resets on reload.
 *
 * ── WHY THESE PARTICULAR FIXTURES ────────────────────────────────────────────
 * Every seed exists to exercise something the real feature must survive:
 *
 *  · All five FR-ADM-SET-007 events, plus both ➕ additions and the one event the
 *    backend emits today (`coverage_gap`) — so the type filter, the icons and the
 *    category badges each have real data behind them.
 *  · An `other` row (wire type `admin.storage_quota`, which this client has never
 *    heard of). It proves the explicit unknown fallback renders safely instead of
 *    impersonating a real type the way the mobile app's `orElse` does — and that
 *    an unmapped subject yields NO deep link rather than a wrong one.
 *  · Rows anchored to INACTIVE regions (c5 Hama, c7 Idlib). A regional admin
 *    assigned to a region that has since been deactivated must stop seeing them;
 *    that is the case a scope bug leaks, so it has to exist in the fixture.
 *  · Platform-wide rows (`regionId: null`). These must stay visible to a regional
 *    admin — they are addressed to them. Getting this backwards is the single
 *    most likely bug in this feature, so the fixture makes it observable.
 *  · EVERY subject id resolves to a record that exists in the target feature's
 *    own mock, and the copy matches that record. Owners are `String(300+i)` in
 *    owner-management (307 Nour Kassem · 314 Bassel Aouad · 315 Rima Khaddour ·
 *    304 Karim Aziz); facilities are f1..f24; feedback is fb-1001..fb-1012;
 *    community POSTS are `String(700+i)` = 700..713 — note that 5xx ids in that
 *    file are AUTHORS, not posts, which is an easy and silent mistake to make.
 *    The deep links therefore open a populated page in mock mode, which is the
 *    only way to see FR-ADM-SET-006's "رابط مباشر" work end to end.
 *  · ntf-2016 points at a `region`, a SUPER-ADMIN-ONLY route. For a regional
 *    admin `projectForScope` must strip that link rather than send them to a
 *    silent redirect — so the fixture makes that path observable too.
 *  · A high-priority row and a read/unread mix, so the badge and the KPI row are
 *    never trivially 0 or N.
 *
 * Region ids match region-management's seeds: c1 Damascus · c2 Aleppo ·
 * c3 Homs · c4 Latakia · c5 Hama (INACTIVE) · c6 Tartus · c7 Idlib (INACTIVE).
 */

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

// A single clock reading, so every relative timestamp in the fixture stays
// consistent with the others however long the session runs.
const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function hoursAgo(hours: number): string {
  return new Date(NOW - hours * HOUR).toISOString();
}
function daysAgo(days: number): string {
  return new Date(NOW - days * DAY).toISOString();
}

interface Seed {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  subject: NotificationSubject | null;
  regionId: string | null;
  regionNames: string[];
  createdAt: string;
  readAt: string | null;
  priority?: number;
  data?: Record<string, unknown>;
}

const SEEDS: Seed[] = [
  // ── Governance: the two approval queues ───────────────────────────────────
  {
    id: 'ntf-2001',
    type: 'owner_request',
    title: 'New facility-owner account request',
    body: 'Bassel Aouad applied to open a sports club in Damascus. Identity documents are attached and awaiting review.',
    subject: { type: 'owner', id: '314' },
    regionId: 'c1',
    regionNames: ['Damascus'],
    createdAt: hoursAgo(2),
    readAt: null,
    priority: 1,
    data: { ownerName: 'Bassel Aouad', city: 'Damascus' },
  },
  {
    id: 'ntf-2002',
    type: 'facility_request',
    title: 'New facility submitted for approval',
    body: 'Mezzeh Padel Arena submitted its documents and is waiting in the verification queue.',
    subject: { type: 'facility', id: 'f2' },
    regionId: 'c1',
    regionNames: ['Damascus'],
    createdAt: hoursAgo(5),
    readAt: null,
    data: { facilityName: 'Mezzeh Padel Arena' },
  },
  {
    id: 'ntf-2003',
    type: 'owner_request',
    title: 'New facility-owner account request',
    body: 'Rima Khaddour applied to register an independent court in Aleppo.',
    subject: { type: 'owner', id: '315' },
    regionId: 'c2',
    regionNames: ['Aleppo'],
    createdAt: hoursAgo(9),
    readAt: null,
    data: { ownerName: 'Rima Khaddour', city: 'Aleppo' },
  },
  {
    id: 'ntf-2004',
    type: 'facility_request',
    title: 'New facility submitted for approval',
    body: 'Aleppo Champions Academy submitted its commercial registration for the second time after the first upload was unreadable.',
    subject: { type: 'facility', id: 'f9' },
    regionId: 'c2',
    regionNames: ['Aleppo'],
    createdAt: daysAgo(1),
    readAt: hoursAgo(20),
    data: { facilityName: 'Aleppo Champions Academy' },
  },

  // ── Service: feedback ─────────────────────────────────────────────────────
  {
    id: 'ntf-2005',
    type: 'feedback_new',
    title: 'New complaint received',
    body: 'A player in Damascus reported that the court lights were off during a 7pm booking and no refund was offered.',
    subject: { type: 'feedback', id: 'fb-1001' },
    regionId: 'c1',
    regionNames: ['Damascus'],
    createdAt: hoursAgo(11),
    readAt: null,
    priority: 1,
    data: { kind: 'complaint' },
  },
  {
    id: 'ntf-2006',
    type: 'feedback_new',
    title: 'New suggestion received',
    body: 'A facility owner in Aleppo asked for a way to block a whole day from the owner calendar.',
    subject: { type: 'feedback', id: 'fb-1002' },
    regionId: 'c2',
    regionNames: ['Aleppo'],
    createdAt: daysAgo(2),
    readAt: daysAgo(1),
    data: { kind: 'suggestion' },
  },

  // ── Community: reports needing review ─────────────────────────────────────
  {
    id: 'ntf-2007',
    type: 'community_report',
    title: 'Community post reported',
    body: 'A post was reported three times for repeated self-promotion. It is queued for moderation review.',
    subject: { type: 'post', id: '707' },
    regionId: 'c1',
    regionNames: ['Damascus'],
    createdAt: hoursAgo(4),
    readAt: null,
    priority: 1,
    data: { reportCount: 3, reason: 'self_promotion' },
  },
  {
    id: 'ntf-2008',
    type: 'community_report',
    title: 'Community post reported',
    body: 'A comment on a Latakia post was flagged for harassment and is awaiting a decision.',
    subject: { type: 'post', id: '713' },
    regionId: 'c4',
    regionNames: ['Latakia'],
    createdAt: daysAgo(3),
    readAt: daysAgo(2),
    data: { reportCount: 1, reason: 'harassment' },
  },

  // ── Billing: paid subscriptions ───────────────────────────────────────────
  {
    id: 'ntf-2009',
    type: 'plan_subscription',
    title: 'New paid subscription',
    body: 'Latakia Premium Club upgraded to the Owner Pro tier. The first manual payment is recorded as received.',
    subject: { type: 'plan', id: 'plan-owner-pro' },
    regionId: 'c4',
    regionNames: ['Latakia'],
    createdAt: hoursAgo(30),
    readAt: null,
    data: { planName: 'Owner Pro', amount: 450000 },
  },
  {
    id: 'ntf-2010',
    type: 'plan_subscription',
    title: 'New paid subscription',
    body: 'A player in Tartus subscribed to the Player Plus plan.',
    subject: { type: 'plan', id: 'plan-player-plus' },
    regionId: 'c6',
    regionNames: ['Tartus'],
    createdAt: daysAgo(4),
    readAt: daysAgo(4),
    data: { planName: 'Player Plus', amount: 60000 },
  },

  // ── System: the ➕ reminder, platform events, and what the backend emits ───
  {
    id: 'ntf-2011',
    type: 'pending_reminder',
    title: 'An owner request has been waiting 6 days',
    body: 'Nour Kassem’s account request has had no decision since it was submitted. Review it or reject it with a reason.',
    subject: { type: 'owner', id: '307' },
    // Daraa has no region record at all — this is a platform-level reminder.
    regionId: null,
    regionNames: [],
    createdAt: hoursAgo(7),
    readAt: null,
    priority: 1,
    data: { waitingDays: 6 },
  },
  {
    id: 'ntf-2012',
    type: 'coverage_gap',
    title: 'A player is in an area with no city or neighbourhood',
    body: 'A player set a location that falls outside every drawn boundary. Add a city or neighbourhood to cover it.',
    // The one subject the backend emits today; it maps to the Regions list, not
    // to a record, because a coverage gap is a map problem rather than a row.
    subject: { type: 'coverage_gap', id: 'gap-88' },
    regionId: null,
    regionNames: [],
    createdAt: hoursAgo(13),
    readAt: null,
    data: { latitude: 32.6189, longitude: 36.1021 },
  },
  {
    id: 'ntf-2013',
    type: 'platform_event',
    title: 'Weekly platform summary is ready',
    body: 'Bookings are up 12% week over week; two regions have no active facility. Open the dashboard for the breakdown.',
    subject: null,
    regionId: null,
    regionNames: [],
    createdAt: daysAgo(1),
    readAt: null,
    data: { bookingsDelta: 0.12 },
  },
  {
    id: 'ntf-2014',
    type: 'platform_event',
    title: 'A region was deactivated',
    body: 'Hama was set to inactive. Facilities inside it are hidden from players until it is re-enabled.',
    subject: { type: 'region', id: 'c5' },
    regionId: null,
    regionNames: [],
    createdAt: daysAgo(6),
    readAt: daysAgo(5),
    data: { regionName: 'Hama' },
  },

  // ── Rows anchored to regions that are no longer live ──────────────────────
  {
    id: 'ntf-2015',
    type: 'facility_request',
    title: 'Facility documents resubmitted',
    body: 'Hama Norias Sports Club resubmitted its documents shortly before the region was deactivated.',
    subject: { type: 'facility', id: 'f21' },
    regionId: 'c5',
    regionNames: ['Hama'],
    createdAt: daysAgo(8),
    readAt: null,
    data: { facilityName: 'Hama Norias Sports Club' },
  },
  {
    id: 'ntf-2016',
    type: 'pending_reminder',
    title: 'Idlib has been inactive for 9 days',
    body: 'Facilities inside Idlib stay hidden from players until the region is re-enabled.',
    // `region` is a super-admin-only route, so a regional admin gets NO link
    // here — the case `projectForScope` exists to handle.
    subject: { type: 'region', id: 'c7' },
    regionId: 'c7',
    regionNames: ['Idlib'],
    createdAt: daysAgo(9),
    readAt: daysAgo(8),
    data: { regionName: 'Idlib', inactiveDays: 9 },
  },

  // ── The unknown-type guard ────────────────────────────────────────────────
  {
    id: 'ntf-2017',
    type: 'other',
    title: 'Media storage is at 85% of quota',
    body: 'Uploaded facility photos and feedback attachments are approaching the storage limit for this environment.',
    // `storage` is not in the deep-link map, so this row must resolve to NO link
    // rather than guessing one. That is the behaviour this fixture pins down.
    subject: { type: 'storage', id: 'bucket-media' },
    regionId: null,
    regionNames: [],
    createdAt: hoursAgo(19),
    readAt: null,
    data: { usedPercent: 85 },
  },

  // ── Older read rows, so pagination and the date filter have depth ─────────
  {
    id: 'ntf-2018',
    type: 'owner_request',
    title: 'New facility-owner account request',
    body: 'Karim Aziz applied to register an independent court in Tartus.',
    subject: { type: 'owner', id: '304' },
    regionId: 'c6',
    regionNames: ['Tartus'],
    createdAt: daysAgo(12),
    readAt: daysAgo(11),
  },
  {
    id: 'ntf-2019',
    type: 'community_report',
    title: 'Community post reported',
    body: 'A promotional post was flagged as spam by two players in Homs.',
    subject: { type: 'post', id: '706' },
    regionId: 'c3',
    regionNames: ['Homs'],
    createdAt: daysAgo(15),
    readAt: daysAgo(14),
    data: { reportCount: 2, reason: 'spam' },
  },
  {
    id: 'ntf-2020',
    type: 'plan_subscription',
    title: 'New paid subscription',
    body: 'A Damascus club upgraded to the Owner Elite tier.',
    subject: { type: 'plan', id: 'plan-owner-elite' },
    regionId: 'c1',
    regionNames: ['Damascus'],
    createdAt: daysAgo(18),
    readAt: daysAgo(17),
    data: { planName: 'Owner Elite', amount: 900000 },
  },
  {
    id: 'ntf-2021',
    type: 'feedback_new',
    title: 'New complaint received',
    body: 'A player in Latakia reported being charged twice for the same monthly subscription.',
    subject: { type: 'feedback', id: 'fb-1004' },
    regionId: 'c4',
    regionNames: ['Latakia'],
    createdAt: daysAgo(21),
    readAt: daysAgo(20),
    data: { kind: 'complaint' },
  },
  {
    id: 'ntf-2022',
    type: 'facility_request',
    title: 'New facility submitted for approval',
    body: 'Latakia Coastal Pitch submitted its court layout for verification.',
    subject: { type: 'facility', id: 'f16' },
    regionId: 'c4',
    regionNames: ['Latakia'],
    createdAt: daysAgo(26),
    readAt: daysAgo(25),
    data: { facilityName: 'Latakia Coastal Pitch' },
  },
];

/** Deep-copies every nested value so a mutation can never reach into a seed. */
function clone(notification: Notification): Notification {
  return {
    ...notification,
    subject: notification.subject ? { ...notification.subject } : null,
    regionNames: [...notification.regionNames],
    data: { ...notification.data },
  };
}

function build(seed: Seed): Notification {
  const priority = seed.priority ?? 0;
  return {
    id: seed.id,
    type: seed.type,
    category: categoryForType(seed.type),
    title: seed.title,
    body: seed.body,
    subject: seed.subject,
    link: resolveNotificationLink(seed.subject),
    data: seed.data ?? {},
    priority,
    isHighPriority: priority > 0,
    regionId: seed.regionId,
    regionNames: seed.regionNames,
    isPlatformWide: seed.regionId === null,
    readAt: seed.readAt,
    isRead: seed.readAt !== null,
    createdAt: seed.createdAt,
  };
}

const db: Notification[] = SEEDS.map(build).map(clone);

/**
 * Preferences start EMPTY, exactly like the real table: the backend treats the
 * absence of a row as "use the channel's default", and a mock that pre-populated
 * every combination would hide any bug in that fallback.
 */
const preferences: NotificationPreference[] = [];

function find(id: string): Notification {
  const row = db.find((item) => item.id === id);
  // Exact phrasing: `isNotFoundError()` matches /\bnot found\.?$/i and the
  // queryClient uses it to skip retries and suppress the global error toast.
  if (!row) throw new Error('Notification not found');
  return row;
}

export async function getNotifications(
  params: NotificationListParams,
): Promise<NotificationListResult> {
  await mockDelay();
  const scope = await currentScope();
  return filterAndPaginateNotifications(db.map(clone), params, scope);
}

export async function getNotificationStats(): Promise<NotificationStats> {
  await mockDelay();
  const scope = await currentScope();
  return computeNotificationStats(db, scope);
}

export async function getUnreadCount(): Promise<number> {
  await mockDelay(200);
  const scope = await currentScope();
  return countUnread(db, scope);
}

export async function getRecentNotifications(
  limit: number = RECENT_LIMIT,
): Promise<Notification[]> {
  await mockDelay(250);
  const scope = await currentScope();
  return selectRecent(db.map(clone), scope, limit);
}

export async function markNotificationRead(id: string): Promise<NotificationReadResult> {
  await mockDelay();
  const scope = await currentScope();
  const row = find(id);
  // Out-of-scope rows read as "not found", never as forbidden, so an id cannot
  // be probed by watching which error comes back.
  if (!isNotificationVisible(row, scope)) throw new Error('Notification not found');
  // Idempotent, like the server's `read_at = COALESCE(read_at, NOW())`.
  if (!row.isRead) {
    row.readAt = new Date().toISOString();
    row.isRead = true;
  }
  return { id: row.id, readAt: row.readAt };
}

export async function markAllNotificationsRead(): Promise<MarkAllReadResult> {
  await mockDelay();
  const scope = await currentScope();
  const now = new Date().toISOString();
  let updated = 0;
  for (const row of db) {
    if (row.isRead || !isNotificationVisible(row, scope)) continue;
    row.readAt = now;
    row.isRead = true;
    updated += 1;
  }
  return { updated };
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  await mockDelay(250);
  return preferences.map((row) => ({ ...row }));
}

export async function setNotificationPreference(
  input: SetNotificationPreferenceInput,
): Promise<NotificationPreference> {
  await mockDelay(250);
  const existing = preferences.find(
    (row) => row.category === input.category && row.channel === input.channel,
  );
  if (existing) {
    existing.enabled = input.enabled;
    return { ...existing };
  }
  const row: NotificationPreference = { ...input };
  preferences.push(row);
  return { ...row };
}
