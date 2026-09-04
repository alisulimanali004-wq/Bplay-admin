/**
 * Booking Management — domain types (the master contract for the slice).
 *
 * A super-admin, STRICTLY READ-ONLY oversight of court/pitch bookings across the
 * platform (view + export only — no mutations). Ported from the mobile app's
 * booking model (SRS BOOK): a booking is placed by a registered player, a manual
 * walk-in guest, or is a facility-side private block (maintenance / holiday /
 * event). Wire DTOs mirror the snake_case backend contract so go-live is a flag
 * flip.
 */

import type { BadgeVariant, DateRangeValue } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';

// ---------------------------------------------------------------------------
// Enums (wire values match the mobile app's apiValue strings)
// ---------------------------------------------------------------------------

export type BookingStatus =
  | 'under_review'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'no_show';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type PaymentMethod = 'cash' | 'transfer';

/** How the booking entered the system. A `private` booking is a facility block. */
export type BookingSource = 'electronic' | 'manual' | 'private';

export type CheckInMethod = 'qr' | 'manual';

/** Why a facility blocked a slot from booking (private source). */
export type BlockReason = 'maintenance' | 'holiday' | 'event';

/** A club is a venue with named courts; a pitch IS its own single court. */
export type BookingFacilityKind = 'club' | 'pitch';

/** Slugs for every seeded sport — kept in step with the `sports` table. */
export type BookingSport =
  | 'tennis'
  | 'padel'
  | 'football'
  | 'basketball'
  | 'swimming'
  | 'volleyball'
  | 'badminton'
  | 'squash'
  | 'table_tennis'
  | 'cycling'
  | 'running'
  | 'gym_fitness';

export const BOOKING_STATUSES: BookingStatus[] = [
  'under_review',
  'confirmed',
  'completed',
  'cancelled',
  'rejected',
  'no_show',
];

export const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];

export const BOOKING_SOURCES: BookingSource[] = ['electronic', 'manual', 'private'];

export const BOOKING_SPORTS: BookingSport[] = [
  'tennis',
  'padel',
  'football',
  'basketball',
  'swimming',
  'volleyball',
  'badminton',
  'squash',
  'table_tennis',
  'cycling',
  'running',
  'gym_fitness',
];

/**
 * The display name each slug corresponds to in the `sports` table.
 *
 * The bookings endpoint filters with `s.name = $1` — an exact, case-sensitive
 * comparison against the stored name. The dashboard's slug ('football') never
 * equalled the stored 'Football', so the sport filter returned zero rows for
 * EVERY sport. The filter value is translated back through this map before it
 * goes out; see `toQuery` in booking.api.ts.
 */
export const BOOKING_SPORT_WIRE_NAME: Record<BookingSport, string> = {
  tennis: 'Tennis',
  padel: 'Padel',
  football: 'Football',
  basketball: 'Basketball',
  swimming: 'Swimming',
  volleyball: 'Volleyball',
  badminton: 'Badminton',
  squash: 'Squash',
  table_tennis: 'Table Tennis',
  cycling: 'Cycling',
  running: 'Running',
  gym_fitness: 'Gym / Fitness',
};

const BLOCK_REASONS: BlockReason[] = ['maintenance', 'holiday', 'event'];

// ---------------------------------------------------------------------------
// Badge helpers (local key tables feeding the shared status→variant mapping)
// ---------------------------------------------------------------------------

/** Booking status → shared status token → Badge variant. */
const BOOKING_STATUS_KEY: Record<BookingStatus, string> = {
  under_review: 'under_review', // warning
  confirmed: 'confirmed', // success
  completed: 'completed', // success
  cancelled: 'cancelled', // neutral
  rejected: 'rejected', // danger
  no_show: 'failed', // danger
};
export function bookingStatusBadgeVariant(status: BookingStatus): BadgeVariant {
  return statusToBadgeVariant(BOOKING_STATUS_KEY[status]);
}

/** Payment status → shared status token → Badge variant. */
const PAYMENT_STATUS_KEY: Record<PaymentStatus, string> = {
  unpaid: 'pending', // warning
  paid: 'paid', // success
  refunded: 'cancelled', // neutral
};
export function paymentStatusBadgeVariant(status: PaymentStatus): BadgeVariant {
  return statusToBadgeVariant(PAYMENT_STATUS_KEY[status]);
}

/**
 * Source → Badge variant. Sources are not "statuses", so this maps directly to a
 * variant (electronic = info, manual = neutral, private/block = caution).
 */
const BOOKING_SOURCE_VARIANT: Record<BookingSource, BadgeVariant> = {
  electronic: 'info',
  manual: 'neutral',
  private: 'caution',
};
export function bookingSourceBadgeVariant(source: BookingSource): BadgeVariant {
  return BOOKING_SOURCE_VARIANT[source];
}

// ---------------------------------------------------------------------------
// Value objects
// ---------------------------------------------------------------------------

/** A manual walk-in party with no Bplay account. */
export interface BookingGuest {
  name: string;
  phone: string;
}

/** The money breakdown for a booking (all figures in SYP). */
export interface BookingMoney {
  appliedPriceSyp: number;
  feesSyp: number;
  taxSyp: number;
  totalSyp: number;
}

/** Check-in record when the party actually arrived. */
export interface BookingCheckIn {
  checkedInAt: string;
  method: CheckInMethod;
}

/** One entry in a booking's status timeline. */
export interface BookingTimelineEntry {
  status: BookingStatus;
  at: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Booking entity
// ---------------------------------------------------------------------------

/**
 * A single booking.
 *
 * RULES:
 *  - a `private` booking is a facility block: it has blockTitle + blockReason and
 *    NO player/guest.
 *  - an `electronic` booking has playerId + playerName.
 *  - a `manual` booking usually has a walk-in guest OR a registered playerId.
 *  - a club booking carries a courtName; a pitch IS its own court (courtName omitted).
 */
export interface Booking {
  id: string;
  /** Human reference, e.g. "BPL-2026-001234". */
  reference: string;
  playerId?: string;
  playerName?: string;
  playerPhotoUrl?: string;
  /** No-show violations in the rolling window (reputation signal on the detail page). */
  playerNoShowViolations?: number;
  guest?: BookingGuest;
  blockTitle?: string;
  blockReason?: BlockReason;
  facilityId: string;
  facilityName: string;
  facilityKind: BookingFacilityKind;
  /** Present only for club bookings (a pitch is its own court). */
  courtName?: string;
  sport: BookingSport;
  /** ISO date of the booking slot. */
  date: string;
  /** "HH:mm". */
  startTime: string;
  endTime: string;
  durationHours: number;
  status: BookingStatus;
  source: BookingSource;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  money: BookingMoney;
  checkIn?: BookingCheckIn;
  recurringSeriesId?: string;
  notes?: string;
  timeline: BookingTimelineEntry[];
  createdAt: string;
}

/** Flat projection for the directory table / export rows. */
export interface BookingListItem {
  id: string;
  reference: string;
  /** Which kind of party the booking is for. */
  partyKind: 'player' | 'guest' | 'block';
  /** Player name, guest name, or the block title. */
  partyName: string;
  playerId?: string;
  playerPhotoUrl?: string;
  facilityId: string;
  facilityName: string;
  facilityKind: BookingFacilityKind;
  courtName?: string;
  sport: BookingSport;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  source: BookingSource;
  totalSyp: number;
  /** Names of the scope regions containing this booking's facility. */
  regionNames: string[];
  /** True when no active scope region contains the facility (super_admin only). */
  isOrphan: boolean;
  createdAt: string;
}

/** Which kind of party a booking is for (private = block, then player, then guest). */
export function bookingPartyKind(booking: Booking): 'player' | 'guest' | 'block' {
  if (booking.source === 'private') return 'block';
  if (booking.playerId != null) return 'player';
  if (booking.guest != null) return 'guest';
  return 'player';
}

/** The display name of a booking's party (player name / guest name / block title). */
export function bookingPartyName(booking: Booking): string {
  if (booking.source === 'private') return booking.blockTitle ?? '';
  if (booking.playerId != null) return booking.playerName ?? '';
  if (booking.guest != null) return booking.guest.name;
  return booking.playerName ?? '';
}

export function toBookingListItem(
  booking: Booking,
  regionNames: string[],
  isOrphan: boolean,
): BookingListItem {
  const partyKind = bookingPartyKind(booking);
  return {
    id: booking.id,
    reference: booking.reference,
    partyKind,
    partyName: bookingPartyName(booking),
    playerId: partyKind === 'player' ? booking.playerId : undefined,
    playerPhotoUrl: partyKind === 'player' ? booking.playerPhotoUrl : undefined,
    facilityId: booking.facilityId,
    facilityName: booking.facilityName,
    facilityKind: booking.facilityKind,
    courtName: booking.courtName,
    sport: booking.sport,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    source: booking.source,
    totalSyp: booking.money.totalSyp,
    regionNames,
    isOrphan,
    createdAt: booking.createdAt,
  };
}

// ---------------------------------------------------------------------------
// List query params / result / stats
// ---------------------------------------------------------------------------

export type BookingSortBy = 'date' | 'createdAt' | 'totalSyp' | 'reference';

export interface BookingListParams {
  /** Matches reference OR party name OR facility name. */
  q?: string;
  status?: 'all' | BookingStatus;
  paymentStatus?: 'all' | PaymentStatus;
  facilityId?: 'all' | string;
  sport?: 'all' | BookingSport;
  source?: 'all' | BookingSource;
  /** A region NAME, 'orphans' (super_admin only) or 'all'. */
  regionId?: 'all' | 'orphans' | string;
  /** Filters the booking `date`; preset 'all' = no date filter. */
  dateRange?: DateRangeValue;
  /** INTERNAL only — scopes to one player's history (player-profile tab); never in the FiltersBar UI. */
  playerId?: string;
  sortBy?: BookingSortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/** Scope-aware KPI figures for the directory header. */
export interface BookingStats {
  total: number;
  underReview: number;
  confirmed: number;
  completed: number;
  /** cancelled + rejected + no_show — the "needs attention" figure. */
  attention: number;
  /** Sum of totalSyp across bookings whose paymentStatus is 'paid'. */
  revenueSyp: number;
}

export interface BookingListResult {
  items: BookingListItem[];
  total: number;
  page: number;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Wire DTO (snake_case, tolerant) + normalizer — go-live is a flag flip
// ---------------------------------------------------------------------------

export interface BookingDto {
  id?: string | number;
  reference?: string;
  player_id?: string | number;
  player_name?: string;
  player_photo_url?: string;
  player_no_show_violations?: number;
  guest?: { name?: string; phone?: string };
  block_title?: string;
  block_reason?: string;
  facility_id?: string | number;
  facility_name?: string;
  facility_kind?: string;
  court_name?: string;
  sport?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  status?: string;
  source?: string;
  payment_status?: string;
  payment_method?: string;
  money?: {
    applied_price_syp?: number;
    fees_syp?: number;
    tax_syp?: number;
    total_syp?: number;
  };
  check_in?: { checked_in_at?: string; method?: string };
  recurring_series_id?: string;
  notes?: string;
  timeline?: Array<{ status?: string; at?: string; note?: string }>;
  created_at?: string;
}

function normalizeBookingStatus(value: string | undefined): BookingStatus {
  const s = (value ?? '').toLowerCase();
  return (BOOKING_STATUSES as string[]).includes(s) ? (s as BookingStatus) : 'under_review';
}

function normalizePaymentStatus(value: string | undefined): PaymentStatus {
  const s = (value ?? '').toLowerCase();
  return (PAYMENT_STATUSES as string[]).includes(s) ? (s as PaymentStatus) : 'unpaid';
}

function normalizeSource(value: string | undefined): BookingSource {
  const s = (value ?? '').toLowerCase();
  return (BOOKING_SOURCES as string[]).includes(s) ? (s as BookingSource) : 'electronic';
}

/**
 * Rows carry the sport's DISPLAY name ('Table Tennis'), so slugify rather than
 * merely lowercase — otherwise every multi-word sport fell through to the
 * 'football' fallback and rendered as the wrong sport.
 */
function normalizeSport(value: string | undefined): BookingSport {
  const s = (value ?? '')
    .toLowerCase()
    .replace(/[\s/]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return (BOOKING_SPORTS as string[]).includes(s) ? (s as BookingSport) : 'football';
}

function normalizeBlockReason(value: string | undefined): BlockReason | undefined {
  const s = (value ?? '').toLowerCase();
  return (BLOCK_REASONS as string[]).includes(s) ? (s as BlockReason) : undefined;
}

function normalizePaymentMethod(value: string | undefined): PaymentMethod | undefined {
  if (value === 'cash') return 'cash';
  if (value === 'transfer') return 'transfer';
  return undefined;
}

function normalizeCheckInMethod(value: string | undefined): CheckInMethod {
  return value === 'qr' ? 'qr' : 'manual';
}

export function toBooking(dto: BookingDto): Booking {
  return {
    id: String(dto.id ?? ''),
    reference: dto.reference ?? '',
    playerId: dto.player_id != null ? String(dto.player_id) : undefined,
    playerName: dto.player_name,
    playerPhotoUrl: dto.player_photo_url,
    playerNoShowViolations:
      typeof dto.player_no_show_violations === 'number' ? dto.player_no_show_violations : undefined,
    guest: dto.guest
      ? { name: dto.guest.name ?? '', phone: dto.guest.phone ?? '' }
      : undefined,
    blockTitle: dto.block_title,
    blockReason: normalizeBlockReason(dto.block_reason),
    facilityId: String(dto.facility_id ?? ''),
    facilityName: dto.facility_name ?? '',
    facilityKind: dto.facility_kind === 'club' ? 'club' : 'pitch',
    courtName: dto.court_name,
    sport: normalizeSport(dto.sport),
    date: dto.date ?? new Date().toISOString(),
    startTime: dto.start_time ?? '',
    endTime: dto.end_time ?? '',
    durationHours: typeof dto.duration_hours === 'number' ? dto.duration_hours : 1,
    status: normalizeBookingStatus(dto.status),
    source: normalizeSource(dto.source),
    paymentStatus: normalizePaymentStatus(dto.payment_status),
    paymentMethod: normalizePaymentMethod(dto.payment_method),
    money: {
      appliedPriceSyp: dto.money?.applied_price_syp ?? 0,
      feesSyp: dto.money?.fees_syp ?? 0,
      taxSyp: dto.money?.tax_syp ?? 0,
      totalSyp: dto.money?.total_syp ?? 0,
    },
    checkIn:
      dto.check_in && dto.check_in.checked_in_at
        ? {
            checkedInAt: dto.check_in.checked_in_at,
            method: normalizeCheckInMethod(dto.check_in.method),
          }
        : undefined,
    recurringSeriesId: dto.recurring_series_id,
    notes: dto.notes,
    timeline: Array.isArray(dto.timeline)
      ? dto.timeline.map((entry) => ({
          status: normalizeBookingStatus(entry.status),
          at: entry.at ?? new Date().toISOString(),
          note: entry.note,
        }))
      : [],
    createdAt: dto.created_at ?? new Date().toISOString(),
  };
}
