/**
 * NOTIFICATIONS (SET · فرع ج) — the admin's INBOUND notification centre
 * (SRS module 14 `14-settings.md`, FR-ADM-SET-006 / 007 / 008).
 *
 * The governing principle is INBOUND ONLY. SRS §0.2 puts "التسويق والحملات
 * والإحالات · البثّ متعدّد القنوات" (marketing, campaigns, multi-channel
 * broadcast) explicitly OUT of scope, so this slice has no composer, no
 * audience picker, no scheduling and no template editor. The admin reads,
 * follows the deep link, and marks as read.
 *
 * Outbound notifications to owners and players remain automatic side-effects of
 * governance actions (approve/reject, suspend, feedback reply) owned by those
 * modules — never authored here.
 *
 * ── ONE DELIBERATE DIVERGENCE FROM THE HOUSE DTO CONVENTION ──────────────────
 * Every other slice maps snake_case DTOs. `GET /notifications` is the one live
 * endpoint that emits **camelCase** (`readAt`, `createdAt`, `subject:{type,id}`
 * — see bplay-backend/src/modules/notifications/notifications.service.js:382).
 * The mappers below therefore accept BOTH casings rather than pretending the
 * backend is consistent.
 */

import type { BadgeVariant } from '@ui';
import type { UserRole } from '@shared/stores/authStore';
import { PATHS } from '@app/router/paths';

// ---------------------------------------------------------------------------
// Type palette (FR-ADM-SET-007)
// ---------------------------------------------------------------------------

/**
 * The five SRS event sources, the two ➕ professional additions, and the one
 * event bplay-backend actually emits today (`admin.location_coverage_gap`).
 *
 * `other` is a REAL member, not a fallback to some plausible-looking sibling.
 * The mobile app's `NotificationType.fromApi` uses `orElse: () => adminApproval`,
 * so an unrecognised type there renders with the wrong icon, the wrong colour
 * and the wrong deep link — silently. That trap is not repeated here: anything
 * unrecognised lands on `other`, which is visibly generic and never links
 * anywhere it cannot verify.
 */
export type NotificationType =
  | 'owner_request'
  | 'facility_request'
  | 'feedback_new'
  | 'community_report'
  | 'plan_subscription'
  | 'pending_reminder'
  | 'platform_event'
  | 'coverage_gap'
  | 'other';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'owner_request',
  'facility_request',
  'feedback_new',
  'community_report',
  'plan_subscription',
  'pending_reminder',
  'platform_event',
  'coverage_gap',
  'other',
];

/**
 * Wire value → domain type. The backend stores `type` as a free-text
 * VARCHAR(64) that defaults to the template key (`resolvedType = type ?? template`
 * in notifications.service.js:106), so both the dotted template key and the bare
 * slug are accepted.
 */
const TYPE_BY_WIRE: Record<string, NotificationType> = {
  'admin.owner_request': 'owner_request',
  'admin.facility_request': 'facility_request',
  'admin.feedback_new': 'feedback_new',
  'admin.community_report': 'community_report',
  'admin.plan_subscription': 'plan_subscription',
  'admin.pending_reminder': 'pending_reminder',
  'admin.platform_event': 'platform_event',
  // The only admin template seeded today (migration 077, line 383).
  'admin.location_coverage_gap': 'coverage_gap',
  owner_request: 'owner_request',
  facility_request: 'facility_request',
  feedback_new: 'feedback_new',
  community_report: 'community_report',
  plan_subscription: 'plan_subscription',
  pending_reminder: 'pending_reminder',
  platform_event: 'platform_event',
  location_coverage_gap: 'coverage_gap',
  coverage_gap: 'coverage_gap',
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * The grouping the admin filters and sets preferences by.
 *
 * DERIVED FROM `type`, never trusted from the wire. The backend's `category`
 * vocabulary (`rooms|chat|classes|gamification|admin|general`) was written for
 * the player/owner apps and has ZERO overlap with anything an admin cares about;
 * every admin row it emits today is just `'admin'`. Deriving keeps the UI
 * coherent whatever the server sends, and keeps one row's badge from
 * contradicting its icon.
 */
export type NotificationCategory =
  | 'governance'
  | 'service'
  | 'community'
  | 'billing'
  | 'system';

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'governance',
  'service',
  'community',
  'billing',
  'system',
];

const CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
  owner_request: 'governance',
  facility_request: 'governance',
  feedback_new: 'service',
  community_report: 'community',
  plan_subscription: 'billing',
  pending_reminder: 'system',
  platform_event: 'system',
  coverage_gap: 'system',
  other: 'system',
};

export function categoryForType(type: NotificationType): NotificationCategory {
  return CATEGORY_BY_TYPE[type];
}

// ---------------------------------------------------------------------------
// Subjects → the deep link (FR-ADM-SET-006: "رابط مباشر للعنصر المعني")
// ---------------------------------------------------------------------------

/**
 * `subject` is the backend's generic deep-link anchor — `subject_type` +
 * `subject_id` on the row, flattened to `subjectType`/`subjectId` in the FCM
 * data block. Values observed in bplay-backend today: `room`, `conversation`,
 * `class`, `class_booking`, `coverage_gap`. The admin-facing ones below are the
 * contract this dashboard needs the five SRS producers to emit.
 */
export interface NotificationSubject {
  type: string;
  id: string;
}

interface SubjectRoute {
  /** `null` id means the destination is a list, not a record. */
  build: (id: string) => string;
  needsId: boolean;
  /**
   * The destination route is wrapped in `RequireRole role="super_admin"` in
   * app/router/index.tsx. A regional `admin` who follows it is silently
   * redirected to their profile by `guards.tsx`, so for them the link must
   * resolve to `null` instead.
   */
  superAdminOnly: boolean;
}

/**
 * subject.type → the dashboard route that opens it.
 *
 * A subject type absent from this map resolves to `null`, and a `null` link
 * renders a non-clickable row. Guessing a destination is strictly worse than
 * admitting there isn't one: a wrong deep link sends an admin to the wrong
 * record and invites the wrong decision.
 *
 * The same principle covers the reader: a link that is right about the record
 * but wrong about who may open it is still a broken link. The `superAdminOnly`
 * flags below mirror the guards in app/router/index.tsx exactly.
 *
 * ⚠️ CONSEQUENCE WORTH KNOWING: FR-ADM-SET-007 tells a REGIONAL admin about new
 * owner requests and new paid subscriptions, but this dashboard restricts
 * Owners, Players and Plans to the super-admin. So for a regional admin those
 * notifications arrive with no destination. That is a genuine gap between the
 * SRS event list and the app's route guards, not something to paper over here —
 * either the guards widen, or the SRS narrows the regional admin's event list.
 */
const SUBJECT_ROUTES: Record<string, SubjectRoute> = {
  owner: { build: (id) => `${PATHS.ownerManagement}/${id}`, needsId: true, superAdminOnly: true },
  owner_request: {
    build: (id) => `${PATHS.ownerManagement}/${id}`,
    needsId: true,
    superAdminOnly: true,
  },
  facility: {
    build: (id) => `${PATHS.facilityManagement}/${id}`,
    needsId: true,
    superAdminOnly: false,
  },
  venue: {
    build: (id) => `${PATHS.facilityManagement}/${id}`,
    needsId: true,
    superAdminOnly: false,
  },
  feedback: { build: (id) => `${PATHS.feedback}/${id}`, needsId: true, superAdminOnly: false },
  post: {
    build: (id) => `${PATHS.communityManagement}/${id}`,
    needsId: true,
    superAdminOnly: false,
  },
  community_post: {
    build: (id) => `${PATHS.communityManagement}/${id}`,
    needsId: true,
    superAdminOnly: false,
  },
  player: { build: (id) => `${PATHS.playerManagement}/${id}`, needsId: true, superAdminOnly: true },
  booking: {
    build: (id) => `${PATHS.bookingManagement}/${id}`,
    needsId: true,
    superAdminOnly: false,
  },
  membership: {
    build: (id) => `${PATHS.clubSubscriptions}/${id}`,
    needsId: true,
    superAdminOnly: false,
  },
  subscription: {
    build: (id) => `${PATHS.clubSubscriptions}/${id}`,
    needsId: true,
    superAdminOnly: false,
  },
  plan: { build: (id) => `${PATHS.plans}/${id}`, needsId: true, superAdminOnly: true },
  region: {
    build: (id) => `${PATHS.regionManagement}/${id}`,
    needsId: true,
    superAdminOnly: true,
  },
  admin: { build: (id) => `${PATHS.adminManagement}/${id}`, needsId: true, superAdminOnly: true },
  // A coverage gap is a map problem, not a record: send the admin to Regions.
  coverage_gap: { build: () => PATHS.regionManagement, needsId: false, superAdminOnly: true },
};

/**
 * The RAW in-app destination for a subject, ignoring who is reading. Kept
 * separate from the role check so the entity stays a statement of fact ("this
 * notification is about owner 314") and the permission question is answered
 * once, in `projectForScope`.
 */
export function resolveNotificationLink(subject: NotificationSubject | null): string | null {
  if (!subject) return null;
  const route = SUBJECT_ROUTES[subject.type];
  if (!route) return null;
  if (route.needsId && !subject.id) return null;
  return route.build(subject.id);
}

/** Can this role actually enter the destination the subject points at? */
export function canFollowSubject(
  subject: NotificationSubject | null,
  role: UserRole | null,
): boolean {
  if (!subject) return false;
  const route = SUBJECT_ROUTES[subject.type];
  if (!route) return false;
  return !route.superAdminOnly || role === 'super_admin';
}

// ---------------------------------------------------------------------------
// Channels & preferences
// ---------------------------------------------------------------------------

/**
 * The four transports the dispatcher runs
 * (bplay-backend/src/modules/notifications/notifications.dispatch.js:26).
 */
export type NotificationChannel = 'inapp' | 'realtime' | 'push' | 'email';

export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  'inapp',
  'realtime',
  'push',
  'email',
];

/**
 * `inapp` and `realtime` declare `disableable: false` on the server — the row IS
 * the in-app delivery and realtime is just its live view, so switching them off
 * would drop the record everything else derives from. The UI renders them as
 * locked-on rather than hiding them, so the admin can see the full delivery
 * picture (channels/inapp.js:14, channels/realtime.js:17).
 */
export const DISABLEABLE_CHANNELS: NotificationChannel[] = ['push', 'email'];

export function isChannelDisableable(channel: NotificationChannel): boolean {
  return DISABLEABLE_CHANNELS.includes(channel);
}

/** `email` is `defaultEnabled: false` server-side; the rest default on. */
const CHANNEL_DEFAULT: Record<NotificationChannel, boolean> = {
  inapp: true,
  realtime: true,
  push: true,
  email: false,
};

export function channelDefaultEnabled(channel: NotificationChannel): boolean {
  return CHANNEL_DEFAULT[channel];
}

/** One (category, channel) delivery setting. Absence of a row = the default. */
export interface NotificationPreference {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface SetNotificationPreferenceInput {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
}

/**
 * Resolve the effective switch state: an explicit row wins, otherwise the
 * channel default. A non-disableable channel is always on regardless.
 */
export function resolvePreference(
  preferences: NotificationPreference[],
  category: NotificationCategory,
  channel: NotificationChannel,
): boolean {
  if (!isChannelDisableable(channel)) return true;
  const row = preferences.find((p) => p.category === category && p.channel === channel);
  return row ? row.enabled : channelDefaultEnabled(channel);
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  type: NotificationType;
  /** Derived from `type` — see the note on NotificationCategory. */
  category: NotificationCategory;
  /** Already rendered by the server in the reader's locale. Plain text, never HTML. */
  title: string;
  body: string | null;
  subject: NotificationSubject | null;
  /** Pre-resolved dashboard route, or `null` when the subject maps nowhere. */
  link: string | null;
  /** The template's interpolation vars, surfaced for context on the row. */
  data: Record<string, unknown>;
  /** Backend SMALLINT; only `> 0` is meaningful (it maps to android priority high). */
  priority: number;
  isHighPriority: boolean;
  /**
   * FR-ADM-SET-008. `null` = a platform-level notice with no regional anchor —
   * visible to every addressee, NOT an orphan. A notification is addressed to a
   * user, unlike feedback which is addressed to the platform, so `null` here
   * must never mean "super-admin only".
   */
  regionId: string | null;
  regionNames: string[];
  isPlatformWide: boolean;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
}

/**
 * How many rows the topbar bell shows. Lives here rather than in either data
 * source so the mock and the real service cannot drift apart on it.
 */
export const RECENT_LIMIT = 5;

export type NotificationSortBy = 'createdAt' | 'priority';

export type NotificationReadState = 'all' | 'unread' | 'read';

export interface NotificationListParams {
  q?: string;
  type?: 'all' | NotificationType;
  category?: 'all' | NotificationCategory;
  readState?: NotificationReadState;
  /** Region id, or the `platform` sentinel. */
  regionId?: string;
  dateRange?: import('@ui').DateRangeValue;
  sortBy?: NotificationSortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface NotificationListResult {
  items: Notification[];
  total: number;
  page: number;
  pageCount: number;
}

/** KPI row — computed over the whole SCOPED collection, never one page. */
export interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  highPriority: number;
}

/** `POST /notifications/:id/read` returns only these two fields. */
export interface NotificationReadResult {
  id: string;
  readAt: string | null;
}

export interface MarkAllReadResult {
  updated: number;
}

// ---------------------------------------------------------------------------
// Badge variants
// ---------------------------------------------------------------------------

const CATEGORY_VARIANT: Record<NotificationCategory, BadgeVariant> = {
  // Something is waiting on an admin decision.
  governance: 'warning',
  service: 'info',
  // A report is a harm signal — it reads red everywhere else in the dashboard.
  community: 'danger',
  billing: 'success',
  system: 'neutral',
};

export function notificationCategoryBadgeVariant(category: NotificationCategory): BadgeVariant {
  return CATEGORY_VARIANT[category];
}

export function notificationReadBadgeVariant(isRead: boolean): BadgeVariant {
  return isRead ? 'neutral' : 'caution';
}

/** Rows the admin has not opened yet — drives the "needs attention" affordance. */
export function isUnread(notification: Pick<Notification, 'isRead'>): boolean {
  return !notification.isRead;
}

// ---------------------------------------------------------------------------
// Wire DTOs + normalisers
// ---------------------------------------------------------------------------

export interface NotificationSubjectDto {
  type?: string | null;
  id?: string | number | null;
}

/**
 * Tolerant of both casings: the notifications endpoint is camelCase, the rest of
 * the admin API is snake_case, and FCM flattens `subject` into `subjectType` /
 * `subjectId`. Accepting all three costs a few lines and removes a whole class
 * of "the field is there but undefined" bug.
 */
export interface NotificationDto {
  id?: string | number;
  type?: string;
  template?: string;
  category?: string;
  title?: string;
  body?: string | null;
  /** The API exposes the row's `vars` JSONB under the name `data`. */
  data?: Record<string, unknown> | null;
  vars?: Record<string, unknown> | null;
  subject?: NotificationSubjectDto | null;
  subjectType?: string | null;
  subjectId?: string | number | null;
  subject_type?: string | null;
  subject_id?: string | number | null;
  priority?: number | null;
  readAt?: string | null;
  read_at?: string | null;
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
  created_at?: string;
  /** FR-ADM-SET-008 — a backend obligation; absent from today's rows. */
  regionId?: string | number | null;
  region_id?: string | number | null;
  regionNames?: string[] | null;
  region_names?: string[] | null;
}

export interface NotificationPreferenceDto {
  category?: string;
  channel?: string;
  enabled?: boolean;
}

export interface UnreadCountDto {
  unread?: number;
}

export function normalizeNotificationType(value: string | undefined | null): NotificationType {
  if (!value) return 'other';
  return TYPE_BY_WIRE[value.toLowerCase()] ?? 'other';
}

function normalizeChannel(value: string | undefined): NotificationChannel | null {
  const channel = (value ?? '').toLowerCase();
  return (NOTIFICATION_CHANNELS as string[]).includes(channel)
    ? (channel as NotificationChannel)
    : null;
}

function normalizePreferenceCategory(value: string | undefined): NotificationCategory | null {
  const category = (value ?? '').toLowerCase();
  if ((NOTIFICATION_CATEGORIES as string[]).includes(category)) {
    return category as NotificationCategory;
  }
  // Legacy: everything the backend emits for admins today is category 'admin'.
  return category === 'admin' ? 'system' : null;
}

function readSubject(dto: NotificationDto): NotificationSubject | null {
  const type = dto.subject?.type ?? dto.subjectType ?? dto.subject_type ?? null;
  if (!type) return null;
  const rawId = dto.subject?.id ?? dto.subjectId ?? dto.subject_id ?? null;
  return { type: String(type), id: rawId === null || rawId === undefined ? '' : String(rawId) };
}

export function toNotification(dto: NotificationDto): Notification {
  // `type` first, then `template`: the server sets type from the template key
  // anyway, so the fallback only matters for rows written before that default.
  const type = normalizeNotificationType(dto.type ?? dto.template);
  const subject = readSubject(dto);
  const readAt = dto.readAt ?? dto.read_at ?? null;
  const priority = dto.priority ?? 0;
  const rawRegion = dto.regionId ?? dto.region_id ?? null;
  const regionId = rawRegion === null || rawRegion === undefined ? null : String(rawRegion);

  return {
    id: String(dto.id ?? ''),
    type,
    category: categoryForType(type),
    title: dto.title ?? '',
    body: dto.body ?? null,
    subject,
    link: resolveNotificationLink(subject),
    data: dto.data ?? dto.vars ?? {},
    priority,
    isHighPriority: priority > 0,
    regionId,
    regionNames: dto.regionNames ?? dto.region_names ?? [],
    isPlatformWide: regionId === null,
    readAt,
    // `readAt` is authoritative; the boolean is only a fallback for a server
    // that sends one without the other.
    isRead: readAt !== null || Boolean(dto.isRead ?? dto.is_read),
    createdAt: dto.createdAt ?? dto.created_at ?? new Date().toISOString(),
  };
}

/** Drops rows whose category or channel this dashboard does not manage. */
export function toNotificationPreferences(
  dtos: NotificationPreferenceDto[],
): NotificationPreference[] {
  const rows: NotificationPreference[] = [];
  for (const dto of dtos) {
    const category = normalizePreferenceCategory(dto.category);
    const channel = normalizeChannel(dto.channel);
    if (!category || !channel) continue;
    rows.push({ category, channel, enabled: dto.enabled ?? true });
  }
  return rows;
}

/** The role label used by the scope banner; kept here so the page stays dumb. */
export type NotificationScopeRole = UserRole | null;
