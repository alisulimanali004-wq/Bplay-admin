/**
 * Owner PLATFORM subscription — mirrors the mobile SUBS domain 1:1 (platform_plan,
 * owner_subscription, subscription_invoice). This is the plan an OWNER buys to use
 * the platform (Free / Pro / Elite) — distinct from the club plans an owner sells
 * to players. V1 is mock-pay (instant, always succeeds), currency always SYP.
 */

import type { BadgeVariant } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';

export type PlanTier = 'free' | 'pro' | 'elite';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'pending_activation';
export type BillingPeriod = 'monthly' | 'yearly';
export type TierChangeType = 'subscribe' | 'upgrade' | 'downgrade' | 'renewal' | 'reactivation';
export type SubscriptionInvoiceStatus = 'paid' | 'pending' | 'failed';
/** Payment rail — V1 is always `mock` (instant); `gateway` reserved for V2. */
export type PlatformPaymentMethod = 'mock' | 'gateway';

export const PLAN_CURRENCY = 'SYP';

/** Term length in days per billing period (mobile: 30 / 365). */
export const PERIOD_DAYS: Record<BillingPeriod, number> = { monthly: 30, yearly: 365 };

/** Tier rank — upgrades move up, downgrades move down (blocked for the admin). */
export const TIER_ORDER: Record<PlanTier, number> = { free: 0, pro: 1, elite: 2 };

export interface FeatureGate {
  /** null = unlimited (∞). */
  maxFacilities: number | null;
  bannerUpload: boolean;
  reviewReply: boolean;
  campaigns: boolean;
  statsRetentionDays: number | null;
  prioritySupport: boolean;
}

export interface PlatformPlan {
  id: string;
  tier: PlanTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  featureGate: FeatureGate;
  displayOrder: number;
  isActive: boolean;
}

export function planPrice(plan: PlatformPlan, period: BillingPeriod): number {
  return period === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
}

export interface OwnerSubscription {
  id: string;
  ownerId: string;
  tier: PlanTier;
  tierName: string;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  startDate: string;
  renewalDate: string;
  trialEndDate?: string;
  autoRenew: boolean;
}

/** Active AND ≤7 days to renewal (derived, mirrors the mobile isExpiringSoon). */
export function isExpiringSoon(subscription: OwnerSubscription): boolean {
  if (subscription.status !== 'active') return false;
  const days = (new Date(subscription.renewalDate).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days <= 7;
}

export interface SubscriptionInvoice {
  id: string;
  ownerId: string;
  tier: PlanTier;
  tierName: string;
  billingPeriod: BillingPeriod;
  amount: number;
  currency: string;
  paymentMethod: PlatformPaymentMethod;
  status: SubscriptionInvoiceStatus;
  issuedAt: string;
  reference: string;
}

/** Admin change to an owner's subscription (upgrade to a higher tier, or renew/extend). */
export interface SubscriptionChangeInput {
  targetTier: PlanTier;
  billingPeriod: BillingPeriod;
  changeType: TierChangeType;
}

// ---------------------------------------------------------------------------
// Badge variants (reuse the shared status map)
// ---------------------------------------------------------------------------

const TIER_VARIANT: Record<PlanTier, BadgeVariant> = {
  free: 'neutral',
  pro: 'info',
  elite: 'success',
};
export function planTierBadgeVariant(tier: PlanTier): BadgeVariant {
  return TIER_VARIANT[tier];
}

const SUB_STATUS_KEY: Record<SubscriptionStatus, string> = {
  trial: 'review',
  active: 'active',
  expired: 'expired',
  pending_activation: 'pending',
};
export function subscriptionStatusBadgeVariant(status: SubscriptionStatus): BadgeVariant {
  return statusToBadgeVariant(SUB_STATUS_KEY[status]);
}

const INVOICE_STATUS_KEY: Record<SubscriptionInvoiceStatus, string> = {
  paid: 'approved',
  pending: 'pending',
  failed: 'rejected',
};
export function invoiceStatusBadgeVariant(status: SubscriptionInvoiceStatus): BadgeVariant {
  return statusToBadgeVariant(INVOICE_STATUS_KEY[status]);
}

// ---------------------------------------------------------------------------
// Wire DTOs (snake_case, mirror the mobile models) + normalisers
// ---------------------------------------------------------------------------

export interface FeatureGateDto {
  max_facilities?: number | null;
  banner_upload?: boolean;
  review_reply?: boolean;
  campaigns?: boolean;
  stats_retention_days?: number | null;
  priority_support?: boolean;
}

export interface PlatformPlanDto {
  id?: string | number;
  tier?: string;
  name?: string;
  monthly_price?: number;
  yearly_price?: number;
  currency?: string;
  feature_gate?: FeatureGateDto;
  display_order?: number;
  is_active?: boolean;
}

export interface OwnerSubscriptionDto {
  id?: string | number;
  owner_id?: string | number;
  tier?: string;
  tier_name?: string;
  status?: string;
  billing_period?: string;
  start_date?: string;
  renewal_date?: string;
  trial_end_date?: string | null;
  auto_renew?: boolean;
}

export interface SubscriptionInvoiceDto {
  id?: string | number;
  owner_id?: string | number;
  tier?: string;
  tier_name?: string;
  billing_period?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  status?: string;
  issued_at?: string;
  reference?: string;
}

const TIERS: PlanTier[] = ['free', 'pro', 'elite'];
const SUB_STATUSES: SubscriptionStatus[] = ['trial', 'active', 'expired', 'pending_activation'];
const INVOICE_STATUSES: SubscriptionInvoiceStatus[] = ['paid', 'pending', 'failed'];

function normalizeTier(value: string | undefined): PlanTier {
  const s = (value ?? '').toLowerCase();
  return (TIERS as string[]).includes(s) ? (s as PlanTier) : 'free';
}
function normalizePeriod(value: string | undefined): BillingPeriod {
  return value === 'yearly' ? 'yearly' : 'monthly';
}
function normalizeSubStatus(value: string | undefined): SubscriptionStatus {
  const s = (value ?? '').toLowerCase();
  return (SUB_STATUSES as string[]).includes(s) ? (s as SubscriptionStatus) : 'active';
}
function normalizeInvoiceStatus(value: string | undefined): SubscriptionInvoiceStatus {
  const s = (value ?? '').toLowerCase();
  return (INVOICE_STATUSES as string[]).includes(s) ? (s as SubscriptionInvoiceStatus) : 'paid';
}
function normalizePaymentMethod(value: string | undefined): PlatformPaymentMethod {
  return value === 'gateway' ? 'gateway' : 'mock';
}

export function toPlatformPlan(dto: PlatformPlanDto): PlatformPlan {
  const gate = dto.feature_gate ?? {};
  return {
    id: String(dto.id ?? ''),
    tier: normalizeTier(dto.tier),
    name: dto.name ?? '',
    monthlyPrice: dto.monthly_price ?? 0,
    yearlyPrice: dto.yearly_price ?? 0,
    currency: dto.currency ?? PLAN_CURRENCY,
    featureGate: {
      maxFacilities: gate.max_facilities ?? null,
      bannerUpload: gate.banner_upload ?? false,
      reviewReply: gate.review_reply ?? false,
      campaigns: gate.campaigns ?? false,
      statsRetentionDays: gate.stats_retention_days ?? null,
      prioritySupport: gate.priority_support ?? false,
    },
    displayOrder: dto.display_order ?? 0,
    isActive: dto.is_active ?? true,
  };
}

export function toOwnerSubscription(dto: OwnerSubscriptionDto): OwnerSubscription {
  return {
    id: String(dto.id ?? ''),
    ownerId: String(dto.owner_id ?? ''),
    tier: normalizeTier(dto.tier),
    tierName: dto.tier_name ?? '',
    status: normalizeSubStatus(dto.status),
    billingPeriod: normalizePeriod(dto.billing_period),
    startDate: dto.start_date ?? new Date().toISOString(),
    renewalDate: dto.renewal_date ?? new Date().toISOString(),
    trialEndDate: dto.trial_end_date ?? undefined,
    autoRenew: dto.auto_renew ?? false,
  };
}

export function toSubscriptionInvoice(dto: SubscriptionInvoiceDto): SubscriptionInvoice {
  return {
    id: String(dto.id ?? ''),
    ownerId: String(dto.owner_id ?? ''),
    tier: normalizeTier(dto.tier),
    tierName: dto.tier_name ?? '',
    billingPeriod: normalizePeriod(dto.billing_period),
    amount: dto.amount ?? 0,
    currency: dto.currency ?? PLAN_CURRENCY,
    paymentMethod: normalizePaymentMethod(dto.payment_method),
    status: normalizeInvoiceStatus(dto.status),
    issuedAt: dto.issued_at ?? new Date().toISOString(),
    reference: dto.reference ?? '',
  };
}
