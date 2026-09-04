/**
 * Player Management — domain types.
 *
 * Players self-register in the Bplay app; the super-admin views and moderates
 * them (no admin create-path). The primary account state is:
 *   - PlayerAccountStatus (account_status): active | suspended
 *   - isBlocked: a separate, permanent ban (super-admin), orthogonal to the status.
 * Everything a player accumulates (bookings, club memberships, the paid Bplay
 * subscription, play rooms, ratings, reports) is modelled as related collections
 * fetched per-player on the detail page.
 */

import type { BadgeVariant } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { resolveUploadUrl } from '@shared/utils/url';
import type { GeoPoint } from '@shared/lib/geo';

/** Runtime account lifecycle for a player. */
export type PlayerAccountStatus = 'active' | 'suspended';

/** The single-glance state shown as the primary badge (account status + ban). */
export type PlayerState = PlayerAccountStatus | 'blocked';

/** Account-level moderation actions a super-admin can apply to a player. */
export type PlayerAction = 'suspend' | 'activate' | 'block' | 'unblock';

/** Whether the player carries an active paid Bplay membership. */
export type PlayerAccountType = 'free' | 'paid';

export type Gender = 'male' | 'female';

/** Sports a player can play, each with a per-sport skill level. */
/**
 * Every sport the platform seeds, as a lowercase slug — kept in step with
 * `SportType` in the facility feature and with the `sports` table.
 *
 * This held only six of the twelve seeded sports. `normalizeSport` returns null
 * for anything unlisted and the caller filters those out, so a player's
 * Badminton, Squash or Cycling simply vanished from their profile.
 */
export type SportKind =
  | 'football'
  | 'padel'
  | 'tennis'
  | 'basketball'
  | 'volleyball'
  | 'swimming'
  | 'badminton'
  | 'squash'
  | 'table_tennis'
  | 'cycling'
  | 'running'
  | 'gym_fitness';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';
export interface PlayerSport {
  sport: SportKind;
  skillLevel: SkillLevel;
}

export interface Player {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender?: Gender;
  dateOfBirth?: string;
  photoUrl?: string;
  /** Governorate-level location (used for search + the city filter). */
  city: string;
  bio?: string;
  /** Optional personal / social link the player added to their profile. */
  link?: string;
  sports: PlayerSport[];
  accountStatus: PlayerAccountStatus;
  /** Reason for the current suspended state (admin note). */
  statusReason?: string;
  /** Permanent ban (super-admin) — orthogonal to accountStatus. */
  isBlocked: boolean;
  /** Reason for the ban — kept separate from statusReason so neither clobbers the other. */
  blockedReason?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  /** Derived from an active paid Bplay subscription (free = none). */
  accountType: PlayerAccountType;
  /** Current Bplay plan name when accountType is 'paid'. */
  currentPlan?: string;
  /** No-show violations in the rolling 90-day window (SRS BOOK). */
  noShowViolations: number;
  /** Temporary booking suspension end (set automatically at ≥5 violations). */
  bookingSuspendedUntil?: string;
  /** Aggregate peer rating received (0–5), shown on the player profile. */
  overallRating?: number;
  /** Denormalised activity counters (hydrated for the list + KPI cards). */
  bookingsCount: number;
  roomsCount: number;
  ratingsGivenCount: number;
  totalSpentSyp: number;
  /** Reports filed against this player that are still open (moderation signal). */
  openReportsCount: number;
  /** The current location the player pinned from the app map (lat/lng), if shared. */
  location?: GeoPoint;
  /** Join date. */
  createdAt: string;
}

/** The single account state shown as the primary state badge. */
export function playerState(player: Player): PlayerState {
  return player.isBlocked ? 'blocked' : player.accountStatus;
}

const STATE_STATUS_KEY: Record<PlayerState, string> = {
  active: 'active',
  suspended: 'suspended',
  blocked: 'blocked',
};
export function playerStateBadgeVariant(state: PlayerState): BadgeVariant {
  return statusToBadgeVariant(STATE_STATUS_KEY[state]);
}

/** True while a player's automatic no-show booking suspension is still in effect. */
export function isBookingSuspended(player: Player): boolean {
  return (
    Boolean(player.bookingSuspendedUntil) &&
    new Date(player.bookingSuspendedUntil as string).getTime() > Date.now()
  );
}

/** A player is flagged on their profile once they reach 3 no-show violations. */
export function isNoShowFlagged(player: Player): boolean {
  return player.noShowViolations >= 3;
}

export const ACCOUNT_TYPE_VARIANT: Record<PlayerAccountType, BadgeVariant> = {
  free: 'neutral',
  paid: 'success',
};

// ---------------------------------------------------------------------------
// Related collections (fetched per-player on the detail page)
//
// A player's bookings and club memberships are owned by the booking-management
// and club-subscriptions oversight features — the player-profile tabs consume
// those feature APIs directly (getBookings / getMemberships filtered by player).
// ---------------------------------------------------------------------------

/** The player's paid Bplay platform subscription (or free). */
export type SubscriptionStatus = 'active' | 'expired';
/**
 * A club membership's billing cadence, matching `membership_plans.plan_type`
 * one-for-one.
 *
 * `quarterly` and `class_pack` are real plan types in the database. While this
 * was only `monthly | annual`, the backend had to collapse both into "monthly",
 * so a 10-class pack displayed as a monthly subscription.
 */
export type BillingPeriod = 'monthly' | 'quarterly' | 'annual' | 'class_pack';
export interface PlayerInvoice {
  id: string;
  date: string;
  amountSyp: number;
  planName: string;
  status: 'paid';
}
export interface PlayerSubscription {
  accountType: PlayerAccountType;
  planName?: string;
  status?: SubscriptionStatus;
  billingPeriod?: BillingPeriod;
  startDate?: string;
  renewalDate?: string;
  priceSyp?: number;
  invoices: PlayerInvoice[];
}

/** A play room the player created (leader) or joined (member). */
export type RoomRole = 'leader' | 'member';
export type RoomStatus = 'open' | 'full' | 'ended' | 'cancelled';
export type RoomType = 'public' | 'private';
export type MatchStyle = 'friendly' | 'competitive' | 'training';
export interface PlayerRoom {
  id: string;
  sport: SportKind;
  facilityName: string;
  courtName?: string;
  date: string;
  startTime: string;
  role: RoomRole;
  type: RoomType;
  matchStyle: MatchStyle;
  joinedCount: number;
  requiredCount: number;
  status: RoomStatus;
}
const ROOM_STATUS_KEY: Record<RoomStatus, string> = {
  open: 'active',
  full: 'processing',
  ended: 'archived',
  cancelled: 'cancelled',
};
export function roomStatusBadgeVariant(status: RoomStatus): BadgeVariant {
  return statusToBadgeVariant(ROOM_STATUS_KEY[status]);
}

/** A rating + written comment the player left for a facility / club / player. */
export type RatingTarget = 'facility' | 'club' | 'player';
export interface PlayerRating {
  id: string;
  target: RatingTarget;
  targetName: string;
  /** Facility id when the target is a facility / club — links to its profile. */
  targetId?: string;
  stars: number;
  comment?: string;
  date: string;
  /** Hidden by an admin moderating an abusive review. */
  hidden: boolean;
}

/**
 * A rating the player RECEIVED — left by another player after a match, or by a
 * facility. Distinct from PlayerRating, which is what the player GAVE: the two
 * carry opposite ends of the relationship, so a shared shape would leave half
 * the fields meaningless in each direction.
 */
export interface PlayerRatingReceived {
  id: string;
  /** Who left it. Null when the reviewer's account no longer exists. */
  reviewerName?: string | null;
  reviewerId?: string | null;
  stars: number;
  comment?: string;
  date: string;
  hidden: boolean;
  /** Player reviews are per-match — the room it was earned in. */
  roomId?: string | null;
}

/** Both directions of a player's ratings, plus the average of those received. */
export interface PlayerRatingsResult {
  given: PlayerRating[];
  received: PlayerRatingReceived[];
  averageReceived: number | null;
  receivedCount: number;
}

/** A player-vs-player / content report (filed by, or against, this player). */
export type ReportDirection = 'filed' | 'against';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportContext = 'room' | 'chat' | 'community' | 'booking';
export type ReportAction = 'resolve' | 'dismiss';
export interface PlayerReport {
  id: string;
  direction: ReportDirection;
  counterpartyName: string;
  /** The other player's id — links to their profile. */
  counterpartyId?: string;
  reason: string;
  details?: string;
  context: ReportContext;
  status: ReportStatus;
  date: string;
  resolutionNote?: string;
}
const REPORT_STATUS_KEY: Record<ReportStatus, string> = {
  open: 'pending',
  reviewing: 'review',
  resolved: 'completed',
  dismissed: 'cancelled',
};
export function reportStatusBadgeVariant(status: ReportStatus): BadgeVariant {
  return statusToBadgeVariant(REPORT_STATUS_KEY[status]);
}

// ---------------------------------------------------------------------------
// List params / result / stats
// ---------------------------------------------------------------------------

/** Platform-wide player counts for the list KPI row. */
export interface PlayerStats {
  total: number;
  active: number;
  suspended: number;
  blocked: number;
}

/** Registration-date window (relative to now) for the "Joined" filter. */
export type PlayerJoinedWindow = 'all' | '7d' | '30d' | '90d' | 'year';

export interface PlayerListParams {
  q?: string;
  /** Account-state filter (single): active/suspended/blocked. */
  status?: 'all' | PlayerState;
  /** Paid Bplay membership vs free. */
  accountType?: 'all' | PlayerAccountType;
  /** Governorate filter. */
  city?: string;
  /** Sport the player plays. */
  sport?: 'all' | SportKind;
  /** Registration recency window. */
  joined?: PlayerJoinedWindow;
  page?: number;
  pageSize?: number;
}

export interface PlayerListResult {
  items: Player[];
  total: number;
  page: number;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Wire DTO (snake_case, tolerant aliases) + normaliser — go-live is a flag flip
// ---------------------------------------------------------------------------

export interface PlayerSportDto {
  sport?: string;
  skill_level?: string;
  skillLevel?: string;
  level?: string;
}

export interface PlayerDto {
  id?: string | number;
  _id?: string;
  user_id?: string | number;
  player_id?: string | number;
  name?: string;
  full_name?: string;
  /** What the admin list/detail endpoints actually send. */
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
  email_address?: string;
  phone?: string;
  phone_number?: string;
  gender?: string;
  date_of_birth?: string;
  avatar_url?: string;
  photo_url?: string;
  city?: string;
  region?: string;
  bio?: string;
  link?: string;
  website?: string;
  social_link?: string;
  sports?: PlayerSportDto[];
  account_status?: string;
  status?: string;
  status_reason?: string;
  is_blocked?: boolean;
  isBlocked?: boolean;
  blocked?: boolean;
  blocked_reason?: string;
  email_verified?: boolean;
  two_factor_enabled?: boolean;
  account_type?: string;
  current_plan?: string;
  no_show_violations?: number;
  booking_suspended_until?: string;
  overall_rating?: number;
  bookings_count?: number;
  rooms_count?: number;
  ratings_given_count?: number;
  total_spent_syp?: number;
  open_reports_count?: number;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  location?: { lat?: number; lng?: number };
  join_date?: string;
  created_at?: string;
  createdAt?: string;
}

const ACCOUNT_STATUSES: PlayerAccountStatus[] = ['active', 'suspended'];
const SPORTS: SportKind[] = [
  'football',
  'padel',
  'tennis',
  'basketball',
  'volleyball',
  'swimming',
  'badminton',
  'squash',
  'table_tennis',
  'cycling',
  'running',
  'gym_fitness',
];
const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'pro'];

function normalizeAccountStatus(value: string | undefined): PlayerAccountStatus {
  const s = (value ?? '').toLowerCase();
  return (ACCOUNT_STATUSES as string[]).includes(s) ? (s as PlayerAccountStatus) : 'active';
}

/**
 * Map an API sport onto a known slug, or null when it is genuinely unknown.
 *
 * Slugified rather than merely lowercased: the `sports` table stores display
 * names, so 'Table Tennis' and 'Gym / Fitness' only match after the separators
 * collapse. Objects are tolerated because detail endpoints send `{ id, name }`
 * for sports in some payloads.
 *
 * Returning null (and being filtered out by the caller) is right for a sport
 * this build has no label for — better an omission than a wrong label.
 */
function normalizeSport(value: unknown): SportKind | null {
  const raw =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object'
        ? ((value as { slug?: unknown; name?: unknown }).slug ??
            (value as { name?: unknown }).name)
        : undefined;
  const s =
    typeof raw === 'string'
      ? raw
          .toLowerCase()
          .replace(/[\s/]+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
      : '';
  return (SPORTS as string[]).includes(s) ? (s as SportKind) : null;
}

function normalizeSkill(value: string | undefined): SkillLevel {
  const s = (value ?? '').toLowerCase();
  return (SKILL_LEVELS as string[]).includes(s) ? (s as SkillLevel) : 'beginner';
}

export function toPlayer(dto: PlayerDto): Player {
  const sports: PlayerSport[] = Array.isArray(dto.sports)
    ? dto.sports
        .map((entry) => {
          const sport = normalizeSport(entry.sport);
          return sport
            ? { sport, skillLevel: normalizeSkill(entry.skill_level ?? entry.skillLevel ?? entry.level) }
            : null;
        })
        .filter((entry): entry is PlayerSport => entry !== null)
    : [];

  const gender = dto.gender === 'male' || dto.gender === 'female' ? dto.gender : undefined;

  const lat = dto.latitude ?? dto.lat ?? dto.location?.lat;
  const lng = dto.longitude ?? dto.lng ?? dto.location?.lng;
  const location =
    typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined;

  return {
    id: String(dto.id ?? dto._id ?? dto.user_id ?? dto.player_id ?? ''),
    // The admin endpoints send `fullName` (camelCase); only `name`/`full_name`
    // were read, so every row in the directory rendered a BLANK name. The
    // username is the last resort — a handle is still better than an empty cell
    // for a player who never set a display name.
    name: dto.name ?? dto.fullName ?? dto.full_name ?? dto.username ?? '',
    email: dto.email ?? dto.email_address ?? '',
    phone: dto.phone ?? dto.phone_number ?? '',
    gender,
    dateOfBirth: dto.date_of_birth,
    // Resolved against the API origin for the same reason the owner documents
    // are: a row stamped with an empty or scheme-less APP_URL otherwise points at
    // the dashboard's own host and renders as a broken avatar in every row.
    photoUrl: resolveUploadUrl(dto.avatarUrl ?? dto.avatar_url ?? dto.photo_url),
    city: dto.city ?? dto.region ?? '',
    bio: dto.bio,
    link: dto.link ?? dto.website ?? dto.social_link,
    sports,
    accountStatus: normalizeAccountStatus(dto.account_status ?? dto.status),
    statusReason: dto.status_reason,
    isBlocked: dto.is_blocked ?? dto.isBlocked ?? dto.blocked ?? false,
    blockedReason: dto.blocked_reason,
    emailVerified: dto.email_verified ?? true,
    twoFactorEnabled: dto.two_factor_enabled ?? false,
    accountType: dto.account_type === 'paid' ? 'paid' : 'free',
    currentPlan: dto.current_plan,
    noShowViolations: typeof dto.no_show_violations === 'number' ? dto.no_show_violations : 0,
    bookingSuspendedUntil: dto.booking_suspended_until,
    overallRating: typeof dto.overall_rating === 'number' ? dto.overall_rating : undefined,
    bookingsCount: typeof dto.bookings_count === 'number' ? dto.bookings_count : 0,
    roomsCount: typeof dto.rooms_count === 'number' ? dto.rooms_count : 0,
    ratingsGivenCount: typeof dto.ratings_given_count === 'number' ? dto.ratings_given_count : 0,
    totalSpentSyp: typeof dto.total_spent_syp === 'number' ? dto.total_spent_syp : 0,
    openReportsCount: typeof dto.open_reports_count === 'number' ? dto.open_reports_count : 0,
    location,
    createdAt: dto.join_date ?? dto.createdAt ?? dto.created_at ?? new Date().toISOString(),
  };
}

/**
 * Gender as the CREATE endpoint accepts it.
 *
 * Deliberately wider than the display-side `Gender`: the backend's
 * `createPlayerSchema` enumerates male/female/other, and sending anything else
 * is rejected. `Gender` stays narrow because the rest of the UI only ever
 * renders the two it knows how to label.
 */
export type CreatePlayerGender = 'male' | 'female' | 'other';

export interface CreatePlayerInput {
  fullName: string;
  username: string;
  email: string;
  /** 9-digit local part; the api prepends 963. */
  phone: string;
  gender: CreatePlayerGender;
  /** ISO date (YYYY-MM-DD). Omitted from the request when blank. */
  dateOfBirth?: string;
}

/** Raw create response. `id` and `userId` are DIFFERENT rows — see createPlayer. */
export interface CreatedPlayerDto {
  id?: string;
  userId?: string;
  username?: string;
  email?: string;
  temporaryPassword?: string;
  requiresPasswordChange?: boolean;
}

/** The result of creating a player — carries the one-time temporary password. */
export interface CreatedPlayer {
  /** players.id — the id every other player route takes. Use this to navigate. */
  id: string;
  /** users.id — kept for completeness; NOT a valid path param for player routes. */
  userId: string;
  username: string;
  email: string;
  tempPassword: string;
}
