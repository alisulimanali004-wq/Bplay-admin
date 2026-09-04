import { mockDelay } from '@shared/lib/mock';
import { computePlanStats, filterAndPaginatePlans } from './plan.filter';
import { DEFAULT_SECTOR } from './plan.types';
import type {
  CreatePlanInput,
  Plan,
  PlanAudience,
  PlanListParams,
  PlanListResult,
  PlanStats,
  UpdatePlanInput,
} from './plan.types';

/**
 * In-memory mutable catalog: create/edit/activate/reorder/delete really mutate it,
 * so a refetch reflects the change. State lives for the session and resets on reload.
 *
 * The seeds are deliberately contract-compatible with what already exists elsewhere:
 *  - the OWNER tiers match the mobile fake catalog (Free / Pro / Elite, the same SYP
 *    prices and the same feature gate) and the `PlatformPlan` owner-management reads;
 *  - the PLAYER tiers match `BPLAY_PLANS` in player-management's mock (Bplay Plus
 *    120,000/mo, Bplay Pro 250,000/mo), so a player's `currentPlan` always resolves
 *    to a catalog entry at the same price;
 *  - the subscriber counts reconcile with the 16 seeded players and 16 seeded owners
 *    of those slices, instead of inventing a number no other screen shows.
 * `Bplay Student` is seeded deactivated with zero subscribers - the one plan the
 * delete guard (PN4) actually lets you delete.
 */

let seq = 300;

const SEEDS: Plan[] = [
  {
    id: 'plan-player-free',
    audience: 'player',
    sector: DEFAULT_SECTOR,
    kind: 'free',
    tier: 'free',
    name: 'Bplay Free',
    description: 'The default plan every player starts on: browse, book and read the community.',
    currency: 'SYP',
    priceSyp: 0,
    yearlyPriceSyp: null,
    durationDays: null,
    trialDays: null,
    entitlements: {
      communityPost: false,
      communityMedia: false,
      advancedStats: false,
      prioritySupport: false,
      monthlyBookingLimit: 8,
    },
    featureGate: {
      maxFacilities: null,
      bannerUpload: false,
      reviewReply: false,
      campaigns: false,
      statsRetentionDays: null,
      prioritySupport: false,
    },
    highlights: ['Browse and book any facility', 'Read the community feed', '8 bookings per month'],
    displayOrder: 0,
    isActive: true,
    isRecommended: false,
    subscriberCount: 9,
    createdAt: '2025-01-06T09:00:00.000Z',
    updatedAt: '2025-01-06T09:00:00.000Z',
  },
  {
    id: 'plan-player-plus',
    audience: 'player',
    sector: DEFAULT_SECTOR,
    kind: 'paid',
    tier: 'plus',
    name: 'Bplay Plus',
    description: 'Unlocks posting in the community plus unlimited bookings.',
    currency: 'SYP',
    priceSyp: 120_000,
    yearlyPriceSyp: null,
    durationDays: 30,
    trialDays: 7,
    entitlements: {
      communityPost: true,
      communityMedia: true,
      advancedStats: true,
      prioritySupport: false,
      monthlyBookingLimit: null,
    },
    featureGate: {
      maxFacilities: null,
      bannerUpload: false,
      reviewReply: false,
      campaigns: false,
      statsRetentionDays: null,
      prioritySupport: false,
    },
    highlights: [
      'Post in the community',
      'Photos and video in your posts',
      'Unlimited bookings',
      'Advanced player statistics',
    ],
    displayOrder: 1,
    isActive: true,
    isRecommended: true,
    subscriberCount: 5,
    createdAt: '2025-01-06T09:05:00.000Z',
    updatedAt: '2026-05-18T11:20:00.000Z',
  },
  {
    id: 'plan-player-pro',
    audience: 'player',
    sector: DEFAULT_SECTOR,
    kind: 'paid',
    tier: 'pro',
    name: 'Bplay Pro',
    description: 'Everything in Plus, with priority support and the full statistics history.',
    currency: 'SYP',
    priceSyp: 250_000,
    yearlyPriceSyp: null,
    durationDays: 30,
    trialDays: null,
    entitlements: {
      communityPost: true,
      communityMedia: true,
      advancedStats: true,
      prioritySupport: true,
      monthlyBookingLimit: null,
    },
    featureGate: {
      maxFacilities: null,
      bannerUpload: false,
      reviewReply: false,
      campaigns: false,
      statsRetentionDays: null,
      prioritySupport: false,
    },
    highlights: [
      'Everything in Plus',
      'Priority support',
      'Full statistics history',
      'Unlimited bookings',
    ],
    displayOrder: 2,
    isActive: true,
    isRecommended: false,
    subscriberCount: 2,
    createdAt: '2025-01-06T09:10:00.000Z',
    updatedAt: '2026-03-02T08:40:00.000Z',
  },
  {
    id: 'plan-player-student',
    audience: 'player',
    sector: DEFAULT_SECTOR,
    kind: 'paid',
    tier: 'student',
    name: 'Bplay Student',
    description: 'Discounted term for verified students, retired for the current season.',
    currency: 'SYP',
    priceSyp: 60_000,
    yearlyPriceSyp: null,
    durationDays: 30,
    trialDays: null,
    entitlements: {
      communityPost: true,
      communityMedia: false,
      advancedStats: false,
      prioritySupport: false,
      monthlyBookingLimit: 12,
    },
    featureGate: {
      maxFacilities: null,
      bannerUpload: false,
      reviewReply: false,
      campaigns: false,
      statsRetentionDays: null,
      prioritySupport: false,
    },
    highlights: ['Post in the community', '12 bookings per month'],
    displayOrder: 3,
    isActive: false,
    isRecommended: false,
    subscriberCount: 0,
    createdAt: '2025-09-01T07:00:00.000Z',
    updatedAt: '2026-06-30T13:15:00.000Z',
  },
  {
    id: 'plan-owner-free',
    audience: 'owner',
    sector: DEFAULT_SECTOR,
    kind: 'free',
    tier: 'free',
    name: 'Free',
    description: 'One facility, review replies and a month of statistics.',
    currency: 'SYP',
    priceSyp: 0,
    yearlyPriceSyp: 0,
    durationDays: null,
    trialDays: null,
    entitlements: {
      communityPost: false,
      communityMedia: false,
      advancedStats: false,
      prioritySupport: false,
      monthlyBookingLimit: null,
    },
    featureGate: {
      maxFacilities: 1,
      bannerUpload: false,
      reviewReply: true,
      campaigns: false,
      statsRetentionDays: 30,
      prioritySupport: false,
    },
    highlights: ['1 facility', 'Reply to player reviews', '30 days of statistics'],
    displayOrder: 0,
    isActive: true,
    isRecommended: false,
    subscriberCount: 9,
    createdAt: '2025-01-06T09:20:00.000Z',
    updatedAt: '2025-01-06T09:20:00.000Z',
  },
  {
    id: 'plan-owner-pro',
    audience: 'owner',
    sector: DEFAULT_SECTOR,
    kind: 'paid',
    tier: 'pro',
    name: 'Pro',
    description: 'Up to five facilities with banners, campaigns and a year of statistics.',
    currency: 'SYP',
    priceSyp: 250_000,
    yearlyPriceSyp: 2_500_000,
    durationDays: null,
    trialDays: 14,
    entitlements: {
      communityPost: false,
      communityMedia: false,
      advancedStats: false,
      prioritySupport: false,
      monthlyBookingLimit: null,
    },
    featureGate: {
      maxFacilities: 5,
      bannerUpload: true,
      reviewReply: true,
      campaigns: true,
      statsRetentionDays: 365,
      prioritySupport: false,
    },
    highlights: [
      'Up to 5 facilities',
      'Banner & cover uploads',
      'Marketing campaigns',
      '1 year of statistics',
    ],
    displayOrder: 1,
    isActive: true,
    isRecommended: true,
    subscriberCount: 5,
    createdAt: '2025-01-06T09:25:00.000Z',
    updatedAt: '2026-04-11T10:05:00.000Z',
  },
  {
    id: 'plan-owner-elite',
    audience: 'owner',
    sector: DEFAULT_SECTOR,
    kind: 'paid',
    tier: 'elite',
    name: 'Elite',
    description: 'Unlimited facilities and statistics, with priority support.',
    currency: 'SYP',
    priceSyp: 600_000,
    yearlyPriceSyp: 6_000_000,
    durationDays: null,
    trialDays: 14,
    entitlements: {
      communityPost: false,
      communityMedia: false,
      advancedStats: false,
      prioritySupport: false,
      monthlyBookingLimit: null,
    },
    featureGate: {
      maxFacilities: null,
      bannerUpload: true,
      reviewReply: true,
      campaigns: true,
      statsRetentionDays: null,
      prioritySupport: true,
    },
    highlights: [
      'Unlimited facilities',
      'Unlimited statistics history',
      'Priority support',
      'Everything in Pro',
    ],
    displayOrder: 2,
    isActive: true,
    isRecommended: false,
    subscriberCount: 2,
    createdAt: '2025-01-06T09:30:00.000Z',
    updatedAt: '2026-04-11T10:06:00.000Z',
  },
];

/** Deep copy, so a mutation can never write through into the immutable seed row. */
function clone(plan: Plan): Plan {
  return {
    ...plan,
    entitlements: { ...plan.entitlements },
    featureGate: { ...plan.featureGate },
    highlights: [...plan.highlights],
  };
}

const db: Plan[] = SEEDS.map(clone);

function find(id: string): Plan {
  const plan = db.find((item) => item.id === id);
  // The exact phrasing matters: isNotFoundError() matches /\bnot found\.?$/i.
  if (!plan) throw new Error('Plan not found');
  return plan;
}

/** At most one recommended plan per audience - promoting one demotes the rest. */
function enforceSingleRecommended(audience: PlanAudience, winnerId: string): void {
  for (const plan of db) {
    if (plan.audience === audience && plan.id !== winnerId) plan.isRecommended = false;
  }
}

function nextDisplayOrder(audience: PlanAudience): number {
  const orders = db.filter((plan) => plan.audience === audience).map((plan) => plan.displayOrder);
  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}

export async function getPlans(params: PlanListParams): Promise<PlanListResult> {
  await mockDelay();
  return filterAndPaginatePlans(db, params);
}

export async function getPlanStats(): Promise<PlanStats> {
  await mockDelay();
  return computePlanStats(db);
}

export async function getPlanById(id: string): Promise<Plan> {
  await mockDelay();
  return clone(find(id));
}

/** FR-ADM-PLAN-002 - a new plan is created ACTIVE, last in its audience, with no subscribers. */
export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  await mockDelay();
  // The tier is the key a subscription stores, so it must be unique inside its own
  // catalog. The backend has to enforce the same constraint at go-live.
  const clash = db.some((plan) => plan.audience === input.audience && plan.tier === input.tier);
  if (clash) throw new Error('A plan with this key already exists for this audience.');

  const now = new Date().toISOString();
  const plan: Plan = {
    id: `plan-${(seq += 1)}`,
    audience: input.audience,
    sector: DEFAULT_SECTOR,
    kind: input.kind,
    tier: input.tier,
    name: input.name,
    description: input.description,
    currency: 'SYP',
    priceSyp: input.priceSyp,
    yearlyPriceSyp: input.yearlyPriceSyp,
    durationDays: input.durationDays,
    trialDays: input.trialDays,
    entitlements: { ...input.entitlements },
    featureGate: { ...input.featureGate },
    highlights: [...input.highlights],
    displayOrder: nextDisplayOrder(input.audience),
    isActive: true,
    isRecommended: input.isRecommended,
    subscriberCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  db.push(plan);
  if (plan.isRecommended) enforceSingleRecommended(plan.audience, plan.id);
  return clone(plan);
}

/**
 * FR-ADM-PLAN-003 - edits never touch existing subscriptions (they apply on renewal),
 * so `subscriberCount`, `displayOrder` and `isActive` are left alone here. `audience`
 * and `tier` are immutable: both are keys the apps and live subscriptions resolve on.
 */
export async function updatePlan(id: string, input: UpdatePlanInput): Promise<Plan> {
  await mockDelay();
  const plan = find(id);
  plan.kind = input.kind;
  plan.name = input.name;
  plan.description = input.description;
  plan.priceSyp = input.priceSyp;
  plan.yearlyPriceSyp = input.yearlyPriceSyp;
  plan.durationDays = input.durationDays;
  plan.trialDays = input.trialDays;
  plan.entitlements = { ...input.entitlements };
  plan.featureGate = { ...input.featureGate };
  plan.highlights = [...input.highlights];
  plan.isRecommended = input.isRecommended;
  plan.updatedAt = new Date().toISOString();
  if (plan.isRecommended) enforceSingleRecommended(plan.audience, plan.id);
  return clone(plan);
}

/** FR-ADM-PLAN-004 - a deactivated plan disappears from the apps' catalog. */
export async function setPlanActive(id: string, isActive: boolean): Promise<void> {
  await mockDelay();
  const plan = find(id);
  plan.isActive = isActive;
  plan.updatedAt = new Date().toISOString();
}

/**
 * Move a plan one position within its own audience. Position is load-bearing:
 * the apps classify upgrade vs downgrade from `displayOrder`.
 */
export async function movePlan(id: string, direction: 'up' | 'down'): Promise<void> {
  await mockDelay();
  const plan = find(id);
  const siblings = db
    .filter((item) => item.audience === plan.audience)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const index = siblings.findIndex((item) => item.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return;
  const neighbour = siblings[target];
  const order = plan.displayOrder;
  plan.displayOrder = neighbour.displayOrder;
  neighbour.displayOrder = order;
  const now = new Date().toISOString();
  plan.updatedAt = now;
  neighbour.updatedAt = now;
}

/** PN4 - a plan with subscribers is never deleted, only deactivated. */
export async function deletePlan(id: string): Promise<void> {
  await mockDelay();
  const plan = find(id);
  if (plan.subscriberCount > 0) {
    throw new Error('This plan has subscribers. Deactivate it instead of deleting.');
  }
  db.splice(db.indexOf(plan), 1);
}
