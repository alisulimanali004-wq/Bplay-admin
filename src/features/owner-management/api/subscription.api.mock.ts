import { mockDelay } from '@shared/lib/mock';
import {
  PERIOD_DAYS,
  PLAN_CURRENCY,
  planPrice,
  type BillingPeriod,
  type OwnerSubscription,
  type PlanTier,
  type PlatformPlan,
  type SubscriptionChangeInput,
  type SubscriptionInvoice,
  type SubscriptionStatus,
} from './subscription.types';

const DAY = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY).toISOString();
const addDays = (isoDate: string, days: number): string =>
  new Date(new Date(isoDate).getTime() + days * DAY).toISOString();

// --- Catalog (mirrors the mobile fake catalog: sports sector, SYP) ----------
const CATALOG: PlatformPlan[] = [
  {
    id: 'plan-free',
    tier: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: PLAN_CURRENCY,
    featureGate: { maxFacilities: 1, bannerUpload: false, reviewReply: true, campaigns: false, statsRetentionDays: 30, prioritySupport: false },
    displayOrder: 0,
    isActive: true,
  },
  {
    id: 'plan-pro',
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 250_000,
    yearlyPrice: 2_500_000,
    currency: PLAN_CURRENCY,
    featureGate: { maxFacilities: 5, bannerUpload: true, reviewReply: true, campaigns: true, statsRetentionDays: 365, prioritySupport: false },
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'plan-elite',
    tier: 'elite',
    name: 'Elite',
    monthlyPrice: 600_000,
    yearlyPrice: 6_000_000,
    currency: PLAN_CURRENCY,
    featureGate: { maxFacilities: null, bannerUpload: true, reviewReply: true, campaigns: true, statsRetentionDays: null, prioritySupport: true },
    displayOrder: 2,
    isActive: true,
  },
];

const planByTier = (tier: PlanTier): PlatformPlan =>
  CATALOG.find((plan) => plan.tier === tier) ?? CATALOG[0];

// --- Per-owner subscription + invoice state (mutable; upgrades persist) ------
interface SubSeed {
  ownerId: string;
  tier: PlanTier;
  status: SubscriptionStatus;
  period: BillingPeriod;
  startedDaysAgo: number;
  history: Array<{ tier: PlanTier; period: BillingPeriod; daysAgo: number }>;
}

const SUB_SEED: SubSeed[] = [
  { ownerId: '300', tier: 'pro', status: 'active', period: 'monthly', startedDaysAgo: 24, history: [{ tier: 'pro', period: 'monthly', daysAgo: 24 }, { tier: 'pro', period: 'monthly', daysAgo: 54 }] },
  { ownerId: '302', tier: 'pro', status: 'active', period: 'yearly', startedDaysAgo: 130, history: [{ tier: 'pro', period: 'yearly', daysAgo: 130 }] },
  { ownerId: '303', tier: 'elite', status: 'active', period: 'yearly', startedDaysAgo: 80, history: [{ tier: 'elite', period: 'yearly', daysAgo: 80 }, { tier: 'pro', period: 'monthly', daysAgo: 210 }] },
  { ownerId: '305', tier: 'pro', status: 'expired', period: 'monthly', startedDaysAgo: 55, history: [{ tier: 'pro', period: 'monthly', daysAgo: 55 }] },
  { ownerId: '308', tier: 'pro', status: 'active', period: 'monthly', startedDaysAgo: 6, history: [{ tier: 'pro', period: 'monthly', daysAgo: 6 }, { tier: 'pro', period: 'monthly', daysAgo: 36 }] },
  { ownerId: '309', tier: 'elite', status: 'active', period: 'monthly', startedDaysAgo: 12, history: [{ tier: 'elite', period: 'monthly', daysAgo: 12 }, { tier: 'pro', period: 'yearly', daysAgo: 400 }] },
  { ownerId: '310', tier: 'pro', status: 'active', period: 'monthly', startedDaysAgo: 26, history: [{ tier: 'pro', period: 'monthly', daysAgo: 26 }] },
  { ownerId: '307', tier: 'free', status: 'trial', period: 'monthly', startedDaysAgo: 4, history: [] },
  { ownerId: '313', tier: 'free', status: 'trial', period: 'monthly', startedDaysAgo: 2, history: [] },
  { ownerId: '314', tier: 'free', status: 'trial', period: 'monthly', startedDaysAgo: 3, history: [] },
  { ownerId: '315', tier: 'free', status: 'trial', period: 'monthly', startedDaysAgo: 1, history: [] },
];

let invoiceSeq = 0;
function makeReference(): string {
  invoiceSeq += 1;
  return `BPL-SUB-${new Date().getFullYear()}-${String(invoiceSeq).padStart(6, '0')}`;
}

function makeInvoice(
  ownerId: string,
  tier: PlanTier,
  period: BillingPeriod,
  issuedIso: string,
): SubscriptionInvoice {
  const plan = planByTier(tier);
  return {
    id: `inv-${ownerId}-${invoiceSeq + 1}`,
    ownerId,
    tier,
    tierName: plan.name,
    billingPeriod: period,
    amount: planPrice(plan, period),
    currency: PLAN_CURRENCY,
    paymentMethod: 'mock',
    status: 'paid',
    issuedAt: issuedIso,
    reference: makeReference(),
  };
}

const subs: Record<string, OwnerSubscription> = {};
const invoices: Record<string, SubscriptionInvoice[]> = {};

for (const seed of SUB_SEED) {
  const plan = planByTier(seed.tier);
  const startDate = iso(seed.startedDaysAgo);
  subs[seed.ownerId] = {
    id: `sub-${seed.ownerId}`,
    ownerId: seed.ownerId,
    tier: seed.tier,
    tierName: plan.name,
    status: seed.status,
    billingPeriod: seed.period,
    startDate,
    renewalDate: addDays(startDate, PERIOD_DAYS[seed.period]),
    trialEndDate: seed.status === 'trial' ? addDays(startDate, 10) : undefined,
    autoRenew: false,
  };
  // History newest-first; each entry made at its issue date.
  invoices[seed.ownerId] = seed.history
    .map((entry) => makeInvoice(seed.ownerId, entry.tier, entry.period, iso(entry.daysAgo)))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

/** Lazily give any owner without a seed a Free/active subscription. */
function subscriptionFor(ownerId: string): OwnerSubscription {
  if (!subs[ownerId]) {
    const start = iso(15);
    subs[ownerId] = {
      id: `sub-${ownerId}`,
      ownerId,
      tier: 'free',
      tierName: planByTier('free').name,
      status: 'active',
      billingPeriod: 'monthly',
      startDate: start,
      renewalDate: addDays(start, PERIOD_DAYS.monthly),
      autoRenew: false,
    };
  }
  return subs[ownerId];
}

export async function getPlatformPlans(): Promise<PlatformPlan[]> {
  await mockDelay(200);
  return CATALOG.map((plan) => ({ ...plan }));
}

export async function getOwnerSubscription(ownerId: string): Promise<OwnerSubscription> {
  await mockDelay(200);
  return { ...subscriptionFor(ownerId) };
}

export async function getOwnerInvoices(ownerId: string): Promise<SubscriptionInvoice[]> {
  await mockDelay(200);
  return (invoices[ownerId] ?? []).map((invoice) => ({ ...invoice }));
}

/** Upgrade (higher tier) or renew/extend (same tier). Never downgrades or cancels. */
export async function changeOwnerSubscription(
  ownerId: string,
  input: SubscriptionChangeInput,
): Promise<void> {
  await mockDelay();
  const plan = planByTier(input.targetTier);
  const now = new Date().toISOString();
  const current = subscriptionFor(ownerId);
  subs[ownerId] = {
    ...current,
    tier: input.targetTier,
    tierName: plan.name,
    status: 'active',
    billingPeriod: input.billingPeriod,
    startDate: now,
    renewalDate: addDays(now, PERIOD_DAYS[input.billingPeriod]),
    trialEndDate: undefined,
  };
  // A paid plan records a paid invoice; a free renewal records nothing.
  const amount = planPrice(plan, input.billingPeriod);
  if (amount > 0) {
    invoices[ownerId] = [makeInvoice(ownerId, input.targetTier, input.billingPeriod, now), ...(invoices[ownerId] ?? [])];
  }
}
