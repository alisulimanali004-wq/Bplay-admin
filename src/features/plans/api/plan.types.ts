/**
 * PLATFORM PLANS — the super-admin-owned catalog the apps consume dynamically
 * (SRS module 11 · FR-ADM-PLAN-001..005).
 *
 * Nothing about a subscription is hardcoded in the apps: the catalog IS the
 * contract. One catalog serves two audiences (mirroring how athlux keys its plan
 * definitions by segment):
 *
 *  • `player` — the Bplay plans a PLAYER buys. `free` vs `paid`; a paid plan is
 *    what unlocks posting in the community (FR-ADM-PLAN-005 / PN2). Priced once
 *    for a term of `durationDays` (SRS: المدّة بالأيام).
 *  • `owner`  — the platform tiers a FACILITY OWNER subscribes to (Free/Pro/Elite).
 *    Priced monthly + yearly and capped by a `featureGate`, matching the mobile
 *    `PlatformPlanEntity` / `FeatureGateEntity` wire contract 1:1 so the owner app
 *    renders this catalog with no mapper change.
 *
 * Deliberately NOT `club-subscriptions` (a club's own membership plans, sold by an
 * owner to players — per-facility and owner-managed) and NOT the club plan
 * snapshot embedded on a membership.
 */

import type { BadgeVariant } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';

/** Which app surface the plan is sold on. Immutable once the plan exists. */
export type PlanAudience = 'player' | 'owner';

/**
 * SRS FR-ADM-PLAN-002 — النوع (مجاني/مدفوع). Named `PlanKind` on purpose:
 * `PlanType` already means a CLUB plan's audience in `club-subscriptions`.
 */
export type PlanKind = 'free' | 'paid';

/** Derived catalog state — a deactivated plan is hidden from new subscriptions. */
export type PlanStatus = 'active' | 'inactive';

export type PlanSortBy = 'displayOrder' | 'name' | 'price' | 'subscribers';

export const PLAN_AUDIENCES: PlanAudience[] = ['player', 'owner'];
export const PLAN_KINDS: PlanKind[] = ['free', 'paid'];

/** The app's currency — a plan is always priced in Syrian pounds. */
const DEFAULT_CURRENCY = 'SYP';

/**
 * The market sector the catalog belongs to. The apps query the public catalog by
 * it (`GET /platform/plans?sector=sports`) and today both hardcode `sports`, so
 * it is a stored constant here rather than an authored field.
 */
export const DEFAULT_SECTOR = 'sports';

/** Max marketing highlights per plan (the apps render a short bullet list). */
export const MAX_PLAN_HIGHLIGHTS = 6;

// ---------------------------------------------------------------------------
// Entitlements — what a plan actually grants
// ---------------------------------------------------------------------------

/**
 * PLAYER entitlements. Numeric ceilings follow the catalog convention used
 * everywhere in the app: `null` = unlimited (∞), `0` = not allowed, `n` = quota.
 */
export interface PlanEntitlements {
  /** ⭐ FR-ADM-PLAN-005 / PN2 — the paid plan's headline perk: posting in the community. */
  communityPost: boolean;
  /** Attach photos/video to a community post. */
  communityMedia: boolean;
  /** Advanced personal statistics and full history in the player app. */
  advancedStats: boolean;
  /** Priority support queue. */
  prioritySupport: boolean;
  /** Bookings allowed per month — `null` = unlimited, `0` = none. */
  monthlyBookingLimit: number | null;
}

/**
 * OWNER capability ceiling — mirrors the mobile `FeatureGateEntity` field for
 * field (and the read-only `FeatureGate` owner-management already consumes).
 */
export interface PlanFeatureGate {
  /** Facilities the owner may run — `null` = unlimited (∞). */
  maxFacilities: number | null;
  bannerUpload: boolean;
  reviewReply: boolean;
  campaigns: boolean;
  /** Statistics retention window in days — `null` = unlimited history. */
  statsRetentionDays: number | null;
  prioritySupport: boolean;
}

export const BLANK_ENTITLEMENTS: PlanEntitlements = {
  communityPost: false,
  communityMedia: false,
  advancedStats: false,
  prioritySupport: false,
  monthlyBookingLimit: null,
};

export const BLANK_FEATURE_GATE: PlanFeatureGate = {
  maxFacilities: null,
  bannerUpload: false,
  reviewReply: false,
  campaigns: false,
  statsRetentionDays: null,
  prioritySupport: false,
};

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export interface Plan {
  id: string;
  /** Set on create, never changed — the apps key their catalog on it. */
  audience: PlanAudience;
  /** The market sector the apps request the catalog by. Always `sports` today. */
  sector: string;
  kind: PlanKind;
  /**
   * Stable machine key the apps match a subscriber's plan on. Unique per audience
   * and IMMUTABLE after creation — renaming it would orphan every live
   * subscription that stores this key.
   */
  tier: string;
  name: string;
  description: string;
  currency: string;
  /** Player: the plan price for one term. Owner: the MONTHLY price. `0` when free. */
  priceSyp: number;
  /** Owner only — the yearly price. `null` for player plans. */
  yearlyPriceSyp: number | null;
  /** Player: the term length in days (SRS). `null` for owner plans (they bill monthly/yearly). */
  durationDays: number | null;
  /** Free trial length in days — `null` = no trial. */
  trialDays: number | null;
  entitlements: PlanEntitlements;
  featureGate: PlanFeatureGate;
  /** Marketing bullets rendered in the apps (mobile `top_features`). */
  highlights: string[];
  /** Catalog position — the apps classify upgrade vs downgrade from it. */
  displayOrder: number;
  isActive: boolean;
  /** The "most popular" mark — at most one per audience. */
  isRecommended: boolean;
  /** Live subscribers — the FR-ADM-PLAN-001 column AND the delete guard (PN4). */
  subscriberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanListParams {
  q?: string;
  audience?: 'all' | PlanAudience;
  kind?: 'all' | PlanKind;
  status?: 'all' | PlanStatus;
  /** FR-ADM-PLAN-005 lens — plans that do / don't unlock community posting. */
  community?: 'all' | 'unlocks' | 'locked';
  sortBy?: PlanSortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PlanListResult {
  items: Plan[];
  total: number;
  page: number;
  pageCount: number;
}

/** Catalog counters for the list KPI row. */
export interface PlanStats {
  total: number;
  active: number;
  paid: number;
  /** Total live subscribers across the whole catalog. */
  subscribers: number;
}

/** Everything an admin authors. `audience` + `tier` are create-only (see `UpdatePlanInput`). */
export interface CreatePlanInput {
  audience: PlanAudience;
  kind: PlanKind;
  tier: string;
  name: string;
  description: string;
  priceSyp: number;
  yearlyPriceSyp: number | null;
  durationDays: number | null;
  trialDays: number | null;
  entitlements: PlanEntitlements;
  featureGate: PlanFeatureGate;
  highlights: string[];
  isRecommended: boolean;
}

/**
 * Edits never touch `audience` or `tier`: moving a plan between catalogs, or
 * renaming the key a live subscription stores, would orphan its subscribers —
 * and FR-ADM-PLAN-003 requires an edit to leave active subscriptions untouched.
 */
export type UpdatePlanInput = Omit<CreatePlanInput, 'audience' | 'tier'>;

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export function planStatus(plan: Plan): PlanStatus {
  return plan.isActive ? 'active' : 'inactive';
}

export function planStatusBadgeVariant(plan: Plan): BadgeVariant {
  return statusToBadgeVariant(planStatus(plan));
}

const KIND_VARIANT: Record<PlanKind, BadgeVariant> = { free: 'neutral', paid: 'success' };
export function planKindBadgeVariant(kind: PlanKind): BadgeVariant {
  return KIND_VARIANT[kind];
}

const AUDIENCE_VARIANT: Record<PlanAudience, BadgeVariant> = { player: 'info', owner: 'warning' };
export function planAudienceBadgeVariant(audience: PlanAudience): BadgeVariant {
  return AUDIENCE_VARIANT[audience];
}

/**
 * FR-ADM-PLAN-005 — does subscribing to this plan make a player eligible to post
 * in the community? Only an ACTIVE player plan can grant it.
 */
export function unlocksCommunity(plan: Plan): boolean {
  return plan.audience === 'player' && plan.isActive && plan.entitlements.communityPost;
}

/**
 * PN4 — a plan with subscribers may never be deleted, only deactivated.
 * The same rule the backend must enforce at go-live (409 on delete).
 */
export function canDeletePlan(plan: Plan): boolean {
  return plan.subscriberCount === 0;
}

/** The yearly discount vs paying 12 months — `0` when there is no yearly price. */
export function yearlySavingPercent(plan: Plan): number {
  const full = plan.priceSyp * 12;
  if (full <= 0 || plan.yearlyPriceSyp === null) return 0;
  return Math.max(0, Math.round(((full - plan.yearlyPriceSyp) / full) * 100));
}

// ---------------------------------------------------------------------------
// Wire DTOs (snake_case — mirrors the mobile platform-plan contract) + mapper
// ---------------------------------------------------------------------------

export interface PlanEntitlementsDto {
  community_post?: boolean;
  community_media?: boolean;
  advanced_stats?: boolean;
  priority_support?: boolean;
  monthly_booking_limit?: number | null;
}

export interface PlanFeatureGateDto {
  max_facilities?: number | null;
  banner_upload?: boolean;
  review_reply?: boolean;
  campaigns?: boolean;
  stats_retention_days?: number | null;
  priority_support?: boolean;
}

export interface PlanDto {
  id?: string | number;
  audience?: string;
  /** Mirrors the mobile `PlatformPlanJsonKeys.sector`. */
  sector?: string;
  kind?: string;
  tier?: string;
  name?: string;
  description?: string | null;
  currency?: string;
  /** The owner catalog names it `monthly_price`; a player plan sends plain `price`. */
  price?: number;
  monthly_price?: number;
  yearly_price?: number | null;
  duration_days?: number | null;
  trial_days?: number | null;
  entitlements?: PlanEntitlementsDto;
  feature_gate?: PlanFeatureGateDto;
  top_features?: string[];
  display_order?: number;
  is_active?: boolean;
  is_recommended?: boolean;
  subscriber_count?: number;
  created_at?: string;
  updated_at?: string;
}

function normalizeAudience(value: string | undefined): PlanAudience {
  return value === 'owner' ? 'owner' : 'player';
}

function normalizeKind(value: string | undefined, price: number): PlanKind {
  if (value === 'free' || value === 'paid') return value;
  // A backend that omits the discriminator still tells us via the price.
  return price > 0 ? 'paid' : 'free';
}

/** `null`/absent stays null (= unlimited); anything numeric is kept as-is. */
function nullableNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' ? value : null;
}

export function toPlan(dto: PlanDto): Plan {
  const ent = dto.entitlements ?? {};
  const gate = dto.feature_gate ?? {};
  const priceSyp = dto.monthly_price ?? dto.price ?? 0;
  const now = new Date().toISOString();
  return {
    id: String(dto.id ?? ''),
    audience: normalizeAudience(dto.audience),
    sector: dto.sector ?? DEFAULT_SECTOR,
    kind: normalizeKind(dto.kind, priceSyp),
    tier: dto.tier ?? '',
    name: dto.name ?? '',
    description: dto.description ?? '',
    currency: dto.currency ?? DEFAULT_CURRENCY,
    priceSyp,
    yearlyPriceSyp: nullableNumber(dto.yearly_price),
    durationDays: nullableNumber(dto.duration_days),
    trialDays: nullableNumber(dto.trial_days),
    entitlements: {
      communityPost: ent.community_post ?? false,
      communityMedia: ent.community_media ?? false,
      advancedStats: ent.advanced_stats ?? false,
      prioritySupport: ent.priority_support ?? false,
      monthlyBookingLimit: nullableNumber(ent.monthly_booking_limit),
    },
    featureGate: {
      maxFacilities: nullableNumber(gate.max_facilities),
      bannerUpload: gate.banner_upload ?? false,
      reviewReply: gate.review_reply ?? false,
      campaigns: gate.campaigns ?? false,
      statsRetentionDays: nullableNumber(gate.stats_retention_days),
      prioritySupport: gate.priority_support ?? false,
    },
    highlights: dto.top_features ?? [],
    displayOrder: dto.display_order ?? 0,
    isActive: dto.is_active ?? true,
    isRecommended: dto.is_recommended ?? false,
    subscriberCount: dto.subscriber_count ?? 0,
    createdAt: dto.created_at ?? now,
    updatedAt: dto.updated_at ?? dto.created_at ?? now,
  };
}

/** Domain → wire, for POST/PATCH. Mirrors `toPlan` so a round-trip is lossless. */
export function toPlanPayload(input: CreatePlanInput | UpdatePlanInput): PlanDto {
  // `audience` and `tier` exist on create only — an update must not send them.
  const audience = 'audience' in input ? input.audience : undefined;
  const tier = 'tier' in input ? input.tier : undefined;
  return {
    ...(audience ? { audience, sector: DEFAULT_SECTOR } : {}),
    ...(tier ? { tier } : {}),
    kind: input.kind,
    name: input.name,
    description: input.description,
    monthly_price: input.priceSyp,
    yearly_price: input.yearlyPriceSyp,
    duration_days: input.durationDays,
    trial_days: input.trialDays,
    entitlements: {
      community_post: input.entitlements.communityPost,
      community_media: input.entitlements.communityMedia,
      advanced_stats: input.entitlements.advancedStats,
      priority_support: input.entitlements.prioritySupport,
      monthly_booking_limit: input.entitlements.monthlyBookingLimit,
    },
    feature_gate: {
      max_facilities: input.featureGate.maxFacilities,
      banner_upload: input.featureGate.bannerUpload,
      review_reply: input.featureGate.reviewReply,
      campaigns: input.featureGate.campaigns,
      stats_retention_days: input.featureGate.statsRetentionDays,
      priority_support: input.featureGate.prioritySupport,
    },
    top_features: input.highlights,
    is_recommended: input.isRecommended,
  };
}
