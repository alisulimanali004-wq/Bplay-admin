import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import {
  toOwnerSubscription,
  toPlatformPlan,
  toSubscriptionInvoice,
  type OwnerSubscription,
  type OwnerSubscriptionDto,
  type PlatformPlan,
  type PlatformPlanDto,
  type SubscriptionChangeInput,
  type SubscriptionInvoice,
  type SubscriptionInvoiceDto,
} from './subscription.types';

const BASE = '/admin/owners-management/owners';

export async function getPlatformPlans(): Promise<PlatformPlan[]> {
  const res = await apiClient.get('/admin/platform-plans', { params: { sector: 'sports' } });
  return unwrapList<PlatformPlanDto>(res.data, ['plans']).map(toPlatformPlan);
}

export async function getOwnerSubscription(ownerId: string): Promise<OwnerSubscription> {
  const res = await apiClient.get(`${BASE}/${ownerId}/subscription`);
  return toOwnerSubscription(unwrap<OwnerSubscriptionDto>(res.data));
}

export async function getOwnerInvoices(ownerId: string): Promise<SubscriptionInvoice[]> {
  const res = await apiClient.get(`${BASE}/${ownerId}/subscription/invoices`);
  return unwrapList<SubscriptionInvoiceDto>(res.data, ['invoices']).map(toSubscriptionInvoice);
}

export async function changeOwnerSubscription(
  ownerId: string,
  input: SubscriptionChangeInput,
): Promise<void> {
  await apiClient.post(`${BASE}/${ownerId}/subscription/change`, {
    target_tier: input.targetTier,
    billing_period: input.billingPeriod,
    change_type: input.changeType,
  });
}
