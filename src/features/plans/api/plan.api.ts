import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import { computePlanStats, filterAndPaginatePlans } from './plan.filter';
import {
  toPlan,
  toPlanPayload,
  type CreatePlanInput,
  type Plan,
  type PlanDto,
  type PlanListParams,
  type PlanListResult,
  type PlanStats,
  type UpdatePlanInput,
} from './plan.types';

/**
 * Backend contract for the platform-plan catalog. NOT `/admin/platform-plans`
 * (owner-management already consumes that read-only path for the owner tiers) and
 * NOT `/owner/plans` (a club's own membership plans).
 *
 * Expected endpoints:
 *   GET    /admin/plans                  → the whole catalog (both audiences)
 *   GET    /admin/plans/{id}             → one plan
 *   POST   /admin/plans                  → create (server sets is_active = true)
 *   PATCH  /admin/plans/{id}             → update (must NOT touch live subscriptions)
 *   PATCH  /admin/plans/{id}/active      → { is_active }
 *   PATCH  /admin/plans/{id}/move        → { direction: 'up' | 'down' }
 *   DELETE /admin/plans/{id}             → 409 when subscriber_count > 0 (PN4)
 *
 * The apps read the same rows through the public catalog endpoint
 * (`GET /platform/plans?sector=sports&audience=…`), which must return a BARE JSON
 * ARRAY — the mobile data source parses the response root, not a `{ data: [] }`
 * envelope — with the snake_case keys `toPlan`/`toPlanPayload` already speak.
 *
 * GO-LIVE NOTE — the owner tiers currently have TWO admin-side readers: this
 * catalog and `owner-management`'s read-only `GET /admin/platform-plans?sector=`
 * (`PlatformPlan`/`FeatureGate`). The seeds here are kept identical to that one on
 * purpose, but when the backend lands, `owner-management` should be repointed at
 * this catalog so a tier is defined in exactly one place.
 *
 * The catalog is a handful of rows, so search/sort/paging run through the same
 * `filterAndPaginatePlans` the mock uses — one behaviour, both sources.
 */
const PATH = '/admin/plans';

/**
 * PAGINATION: client-side by design, and correct as written.
 *
 * Unlike the other list clients, this one never forwarded page/pageSize to the
 * server, so it was not affected by the double-pagination bug. The catalog is a handful of rows and every consumer needs all of them to render an upgrade ladder, so truncating it server-side would be worse than the query cost. The endpoint now returns a meta block anyway, for any client that wants a total.
 */
export async function getPlans(params: PlanListParams): Promise<PlanListResult> {
  const res = await apiClient.get(PATH);
  const all = unwrapList<PlanDto>(res.data, ['plans']).map(toPlan);
  return filterAndPaginatePlans(all, params);
}

export async function getPlanStats(): Promise<PlanStats> {
  const res = await apiClient.get(PATH);
  return computePlanStats(unwrapList<PlanDto>(res.data, ['plans']).map(toPlan));
}

export async function getPlanById(id: string): Promise<Plan> {
  const res = await apiClient.get(`${PATH}/${id}`);
  return toPlan(unwrap<PlanDto>(res.data));
}

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  const res = await apiClient.post(PATH, toPlanPayload(input));
  return toPlan(unwrap<PlanDto>(res.data));
}

export async function updatePlan(id: string, input: UpdatePlanInput): Promise<Plan> {
  const res = await apiClient.patch(`${PATH}/${id}`, toPlanPayload(input));
  return toPlan(unwrap<PlanDto>(res.data));
}

export async function setPlanActive(id: string, isActive: boolean): Promise<void> {
  await apiClient.patch(`${PATH}/${id}/active`, { is_active: isActive });
}

export async function movePlan(id: string, direction: 'up' | 'down'): Promise<void> {
  await apiClient.patch(`${PATH}/${id}/move`, { direction });
}

export async function deletePlan(id: string): Promise<void> {
  await apiClient.delete(`${PATH}/${id}`);
}
