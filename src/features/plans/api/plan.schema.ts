import { z } from 'zod';
import { MAX_PLAN_HIGHLIGHTS } from './plan.types';

/** Machine key the apps match on — lowercase letters, digits and underscores only. */
export const PLAN_TIER_REGEX = /^[a-z][a-z0-9_]*$/;

/** A ceiling: `null` = unlimited, `0` = not allowed, `n` = quota. Never negative. */
const nullableCount = z.number().int().min(0, 'plan.errors.negative').nullable();

const entitlementsSchema = z.object({
  communityPost: z.boolean(),
  communityMedia: z.boolean(),
  advancedStats: z.boolean(),
  prioritySupport: z.boolean(),
  monthlyBookingLimit: nullableCount,
});

const featureGateSchema = z.object({
  maxFacilities: nullableCount,
  bannerUpload: z.boolean(),
  reviewReply: z.boolean(),
  campaigns: z.boolean(),
  statsRetentionDays: nullableCount,
  prioritySupport: z.boolean(),
});

const basePlanSchema = z.object({
  audience: z.enum(['player', 'owner']),
  kind: z.enum(['free', 'paid']),
  tier: z
    .string()
    .trim()
    .min(2, 'plan.errors.tierRequired')
    .max(24, 'plan.errors.tierLong')
    .regex(PLAN_TIER_REGEX, 'plan.errors.tierFormat'),
  name: z.string().trim().min(2, 'plan.errors.nameRequired').max(60, 'plan.errors.nameLong'),
  description: z.string().trim().max(240, 'plan.errors.descriptionLong'),
  priceSyp: z.number().min(0, 'plan.errors.priceNegative'),
  yearlyPriceSyp: z.number().min(0, 'plan.errors.priceNegative').nullable(),
  durationDays: z.number().int().positive('plan.errors.durationPositive').nullable(),
  trialDays: z.number().int().min(0, 'plan.errors.negative').nullable(),
  entitlements: entitlementsSchema,
  featureGate: featureGateSchema,
  highlights: z.array(z.string().trim().min(1)).max(MAX_PLAN_HIGHLIGHTS, 'plan.errors.tooManyHighlights'),
  isRecommended: z.boolean(),
});

type PlanShape = z.infer<typeof basePlanSchema>;

/**
 * The catalog's business rules (SRS FR-ADM-PLAN-002 + the two audience contracts):
 *  1. a PAID plan must carry a price — «سعر مفقود لخطة مدفوعة → يُرفض الإنشاء»;
 *  2. a FREE plan must be priced at zero, in both price fields;
 *  3. a paid PLAYER plan must state its term in days (السرد يسعّر لمدّة);
 *  4. a paid OWNER plan must carry a yearly price — the owner app renders monthly
 *     AND yearly on the same card and derives the saving from both.
 */
function applyCatalogRules(data: PlanShape, ctx: z.RefinementCtx): void {
  if (data.kind === 'paid' && data.priceSyp <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['priceSyp'],
      message: 'plan.errors.paidNeedsPrice',
    });
  }

  if (data.kind === 'free') {
    if (data.priceSyp !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceSyp'],
        message: 'plan.errors.freeMustBeZero',
      });
    }
    if (data.yearlyPriceSyp !== null && data.yearlyPriceSyp !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['yearlyPriceSyp'],
        message: 'plan.errors.freeMustBeZero',
      });
    }
  }

  if (data.audience === 'player' && data.kind === 'paid' && data.durationDays === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['durationDays'],
      message: 'plan.errors.playerNeedsDuration',
    });
  }

  if (
    data.audience === 'owner' &&
    data.kind === 'paid' &&
    (data.yearlyPriceSyp === null || data.yearlyPriceSyp <= 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['yearlyPriceSyp'],
      message: 'plan.errors.ownerNeedsYearly',
    });
  }
}

export const planFormSchema = basePlanSchema.superRefine(applyCatalogRules);

export type PlanFormValues = z.infer<typeof planFormSchema>;
