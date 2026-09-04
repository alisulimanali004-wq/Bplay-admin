/**
 * Club Subscriptions — domain types (the master contract for the slice).
 *
 * A super-admin, strictly READ-ONLY oversight of players' club-membership
 * subscriptions. Ported from the Bplay mobile club-membership model (plan
 * snapshot, member segments, entry limits) per the owner Plans & Members CRM.
 * Wire DTOs mirror the mobile snake_case contract so go-live is a flag flip.
 * There are NO mutations in this feature — view + export only.
 */

import type { BadgeVariant, DateRangeValue } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';

// ---------------------------------------------------------------------------
// Enums (wire values match the mobile app's apiValue strings)
// ---------------------------------------------------------------------------

export type MembershipStatus =
  | 'pending_activation'
  | 'active'
  | 'paused'
  | 'expired'
  | 'cancelled';

/** A member can naturally fall into several segments at once (see computeMemberSegments). */
export type MemberSegment = 'premium' | 'new' | 'near_expiry' | 'churn_risk';

export type PlanType = 'individual' | 'family' | 'corporate' | 'trial';

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'day_pass';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type PaymentMethod = 'cash' | 'transfer';

export type CheckInMethod = 'qr' | 'manual';

export const MEMBERSHIP_STATUSES: MembershipStatus[] = [
  'pending_activation',
  'active',
  'paused',
  'expired',
  'cancelled',
];

export const MEMBER_SEGMENTS: MemberSegment[] = ['premium', 'new', 'near_expiry', 'churn_risk'];

export const PLAN_TYPES: PlanType[] = ['individual', 'family', 'corporate', 'trial'];

// ---------------------------------------------------------------------------
// Badge helpers — the single source of the status/segment → Badge mapping
// ---------------------------------------------------------------------------

/**
 * Membership status → the shared status vocabulary key that feeds
 * statusToBadgeVariant. `paused` maps to the reversible orange 'inactive'
 * family (never terminal red), `expired` to danger, `cancelled` to neutral.
 */
const MEMBERSHIP_STATUS_KEY: Record<MembershipStatus, string> = {
  pending_activation: 'pending',
  active: 'active',
  paused: 'inactive',
  expired: 'expired',
  cancelled: 'cancelled',
};

export function membershipStatusBadgeVariant(status: MembershipStatus): BadgeVariant {
  return statusToBadgeVariant(MEMBERSHIP_STATUS_KEY[status]);
}

/** Member segment → Badge variant (premium amber, new blue, near-expiry orange, churn red). */
export const memberSegmentBadgeVariant: Record<MemberSegment, BadgeVariant> = {
  premium: 'warning',
  new: 'info',
  near_expiry: 'caution',
  churn_risk: 'danger',
};

// ---------------------------------------------------------------------------
// Value objects
// ---------------------------------------------------------------------------

/** The plan snapshot captured at subscription time (immutable from the member's view). */
export interface PlanSnapshot {
  name: string;
  priceSyp: number;
  durationDays: number;
  planType: PlanType;
  billingCycle: BillingCycle;
  /** Entries allowed per month, or null for unlimited. */
  monthlyEntryLimit: number | null;
  features: string[];
}

export interface MembershipPayment {
  id: string;
  date: string;
  amountSyp: number;
  method: PaymentMethod;
  status: PaymentStatus;
}

export interface MembershipCheckIn {
  id: string;
  date: string;
  method: CheckInMethod;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/** The full membership record — used by the detail page. */
export interface Membership {
  id: string;
  playerId: string;
  playerName: string;
  playerPhotoUrl?: string;
  clubId: string;
  clubName: string;
  clubLogoUrl?: string;
  plan: PlanSnapshot;
  status: MembershipStatus;
  startDate: string;
  endDate: string;
  /**
   * null = NOT TRACKED, which is not the same as 0 ("none used").
   *
   * This schema has no membership entry log, so the server cannot produce a
   * real count and deliberately sends null. Coercing it to 0 here would render
   * "0 / 12" — a claim that the member has never used their membership, which
   * is indistinguishable from a genuine zero and is not something we know.
   */
  entriesUsed: number | null;
  payments: MembershipPayment[];
  checkIns: MembershipCheckIn[];
  createdAt: string;
}

/** Flat projection for the directory table (segments + region membership derived). */
export interface MembershipListItem {
  id: string;
  playerId: string;
  playerName: string;
  playerPhotoUrl?: string;
  clubId: string;
  clubName: string;
  clubLogoUrl?: string;
  planName: string;
  planType: PlanType;
  status: MembershipStatus;
  segments: MemberSegment[];
  startDate: string;
  endDate: string;
  priceSyp: number;
  /** null = not tracked, not 0. See Membership.entriesUsed. */
  entriesUsed: number | null;
  monthlyEntryLimit: number | null;
  /** Names of the active scope regions containing this membership's club. */
  regionNames: string[];
  /** True when no active scope region contains the club (super_admin only). */
  isOrphan: boolean;
  createdAt: string;
}

const DAY_MS = 86_400_000;

/**
 * The member segments a membership falls into (a member may be several at once).
 * Thresholds mirror the mobile app's authoritative CRM rules:
 * - premium: an elite/annual tier (>= 1.2M SYP) or a long-tenured member (>= 300 days).
 * - new: started within the last 30 days (active or pending activation).
 * - near_expiry: active with 0–30 days left before the end date.
 * - churn_risk: expired/cancelled, or an active membership already past its end date
 *   with more than 90 days of tenure.
 */
export function computeMemberSegments(
  m: { status: MembershipStatus; startDate: string; endDate: string; priceSyp: number },
  nowMs: number,
): MemberSegment[] {
  const daysLeft = Math.floor((Date.parse(m.endDate) - nowMs) / DAY_MS);
  const daysSinceStart = Math.floor((nowMs - Date.parse(m.startDate)) / DAY_MS);
  const segments: MemberSegment[] = [];

  if (m.priceSyp >= 1_200_000 || daysSinceStart >= 300) {
    segments.push('premium');
  }
  if (daysSinceStart <= 30 && (m.status === 'active' || m.status === 'pending_activation')) {
    segments.push('new');
  }
  if (m.status === 'active' && daysLeft >= 0 && daysLeft <= 30) {
    segments.push('near_expiry');
  }
  if (
    m.status === 'expired' ||
    m.status === 'cancelled' ||
    (m.status === 'active' && daysSinceStart > 90 && daysLeft < 0)
  ) {
    segments.push('churn_risk');
  }
  return segments;
}

export function toMembershipListItem(
  m: Membership,
  regionNames: string[],
  isOrphan: boolean,
  nowMs: number,
): MembershipListItem {
  return {
    id: m.id,
    playerId: m.playerId,
    playerName: m.playerName,
    playerPhotoUrl: m.playerPhotoUrl,
    clubId: m.clubId,
    clubName: m.clubName,
    clubLogoUrl: m.clubLogoUrl,
    planName: m.plan.name,
    planType: m.plan.planType,
    status: m.status,
    segments: computeMemberSegments(
      { status: m.status, startDate: m.startDate, endDate: m.endDate, priceSyp: m.plan.priceSyp },
      nowMs,
    ),
    startDate: m.startDate,
    endDate: m.endDate,
    priceSyp: m.plan.priceSyp,
    entriesUsed: m.entriesUsed,
    monthlyEntryLimit: m.plan.monthlyEntryLimit,
    regionNames,
    isOrphan,
    createdAt: m.createdAt,
  };
}

// ---------------------------------------------------------------------------
// The canonical plan catalog (feeds the Plan filter Select with no extra hook)
// ---------------------------------------------------------------------------

export const PLAN_CATALOG: PlanSnapshot[] = [
  {
    name: 'Monthly Basic',
    priceSyp: 300_000,
    durationDays: 30,
    planType: 'individual',
    billingCycle: 'monthly',
    monthlyEntryLimit: 12,
    features: ['Off-peak court access', '1 guest pass'],
  },
  {
    name: 'Quarterly Pro',
    priceSyp: 750_000,
    durationDays: 90,
    planType: 'individual',
    billingCycle: 'quarterly',
    monthlyEntryLimit: null,
    features: ['Unlimited court access', 'Locker room', '2 guest passes/mo'],
  },
  {
    name: 'Annual Elite',
    priceSyp: 2_400_000,
    durationDays: 365,
    planType: 'individual',
    billingCycle: 'yearly',
    monthlyEntryLimit: null,
    features: ['Unlimited access', 'Priority booking', 'Free coaching sessions', 'Spa access'],
  },
  {
    name: 'Family Plan',
    priceSyp: 900_000,
    durationDays: 30,
    planType: 'family',
    billingCycle: 'monthly',
    monthlyEntryLimit: null,
    features: ['Up to 4 members', 'Unlimited access'],
  },
  {
    name: 'Day Pass',
    priceSyp: 25_000,
    durationDays: 1,
    planType: 'individual',
    billingCycle: 'day_pass',
    monthlyEntryLimit: 1,
    features: ['Single-day access'],
  },
  {
    name: 'Free Trial',
    priceSyp: 0,
    durationDays: 7,
    planType: 'trial',
    billingCycle: 'monthly',
    monthlyEntryLimit: 3,
    features: ['7-day trial', 'Limited entries'],
  },
];

// ---------------------------------------------------------------------------
// List query params / result
// ---------------------------------------------------------------------------

export type MembershipSortBy = 'startDate' | 'endDate' | 'createdAt' | 'priceSyp';

export interface MembershipListParams {
  /** Matches player name, club name or plan name. */
  q?: string;
  status?: 'all' | MembershipStatus;
  clubId?: 'all' | string;
  planName?: 'all' | string;
  segment?: 'all' | MemberSegment;
  /** A scope-region NAME, 'orphans' (super_admin only) or 'all'. */
  regionId?: 'all' | 'orphans' | string;
  /** Filters by the membership start date. */
  dateRange?: DateRangeValue;
  /** INTERNAL only — the player-profile Memberships tab; never surfaced in the UI. */
  playerId?: string;
  sortBy?: MembershipSortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/** Scope-aware KPI figures for the directory header (one lightweight call). */
export interface MembershipStats {
  total: number;
  active: number;
  pendingActivation: number;
  paused: number;
  expired: number;
  cancelled: number;
  nearExpiry: number;
  churnRisk: number;
  /** Sum of paid payments across all visible memberships. */
  revenueSyp: number;
}

export interface MembershipListResult {
  items: MembershipListItem[];
  total: number;
  page: number;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Wire DTO (snake_case, mirrors the mobile/backend contract) + normalizer
// ---------------------------------------------------------------------------

export interface MembershipDto {
  id?: string | number;
  player_id?: string | number;
  player_name?: string;
  player_photo_url?: string;
  club_id?: string | number;
  club_name?: string;
  club_logo_url?: string;
  plan?: {
    name?: string;
    price_syp?: number;
    duration_days?: number;
    plan_type?: string;
    billing_cycle?: string;
    monthly_entry_limit?: number | null;
    features?: string[];
  };
  status?: string;
  start_date?: string;
  end_date?: string;
  entries_used?: number;
  payments?: Array<{
    id?: string | number;
    date?: string;
    amount_syp?: number;
    method?: string;
    status?: string;
  }>;
  check_ins?: Array<{ id?: string | number; date?: string; method?: string }>;
  created_at?: string;
}

function normalizeMembershipStatus(value: string | undefined): MembershipStatus {
  const s = (value ?? '').toLowerCase();
  return (MEMBERSHIP_STATUSES as string[]).includes(s) ? (s as MembershipStatus) : 'pending_activation';
}

function normalizePlanType(value: string | undefined): PlanType {
  const s = (value ?? '').toLowerCase();
  return (PLAN_TYPES as string[]).includes(s) ? (s as PlanType) : 'individual';
}

function normalizeBillingCycle(value: string | undefined): BillingCycle {
  const s = (value ?? '').toLowerCase();
  const cycles: BillingCycle[] = ['monthly', 'quarterly', 'yearly', 'day_pass'];
  return (cycles as string[]).includes(s) ? (s as BillingCycle) : 'monthly';
}

function normalizePaymentMethod(value: string | undefined): PaymentMethod {
  return value === 'transfer' ? 'transfer' : 'cash';
}

function normalizePaymentStatus(value: string | undefined): PaymentStatus {
  const s = (value ?? '').toLowerCase();
  if (s === 'paid') return 'paid';
  if (s === 'refunded') return 'refunded';
  return 'unpaid';
}

function normalizeCheckInMethod(value: string | undefined): CheckInMethod {
  return value === 'manual' ? 'manual' : 'qr';
}

export function toMembership(dto: MembershipDto): Membership {
  const plan = dto.plan ?? {};
  return {
    id: String(dto.id ?? ''),
    playerId: String(dto.player_id ?? ''),
    playerName: dto.player_name ?? '',
    playerPhotoUrl: dto.player_photo_url,
    clubId: String(dto.club_id ?? ''),
    clubName: dto.club_name ?? '',
    clubLogoUrl: dto.club_logo_url,
    plan: {
      name: plan.name ?? '',
      priceSyp: plan.price_syp ?? 0,
      durationDays: plan.duration_days ?? 0,
      planType: normalizePlanType(plan.plan_type),
      billingCycle: normalizeBillingCycle(plan.billing_cycle),
      monthlyEntryLimit: plan.monthly_entry_limit ?? null,
      features: Array.isArray(plan.features) ? plan.features : [],
    },
    status: normalizeMembershipStatus(dto.status),
    startDate: dto.start_date ?? new Date().toISOString(),
    endDate: dto.end_date ?? new Date().toISOString(),
    // Preserved as null when the server does not track it — see the field doc.
    entriesUsed: dto.entries_used ?? null,
    payments: Array.isArray(dto.payments)
      ? dto.payments.map((p, index) => ({
          id: String(p.id ?? index),
          date: p.date ?? '',
          amountSyp: p.amount_syp ?? 0,
          method: normalizePaymentMethod(p.method),
          status: normalizePaymentStatus(p.status),
        }))
      : [],
    checkIns: Array.isArray(dto.check_ins)
      ? dto.check_ins.map((c, index) => ({
          id: String(c.id ?? index),
          date: c.date ?? '',
          method: normalizeCheckInMethod(c.method),
        }))
      : [],
    createdAt: dto.created_at ?? new Date().toISOString(),
  };
}
