import { DEFAULT_PAGE_SIZE, filterPaginate } from '@shared/lib/paginate';
import {
  PLAN_AUDIENCES,
  planStatus,
  unlocksCommunity,
  type Plan,
  type PlanListParams,
  type PlanListResult,
  type PlanSortBy,
  type PlanStats,
} from './plan.types';

/** Catalog reading order: player plans first, then owner tiers, each by position. */
function catalogOrder(a: Plan, b: Plan): number {
  const byAudience = PLAN_AUDIENCES.indexOf(a.audience) - PLAN_AUDIENCES.indexOf(b.audience);
  if (byAudience !== 0) return byAudience;
  if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
  return a.name.localeCompare(b.name);
}

const COMPARE: Record<PlanSortBy, (a: Plan, b: Plan) => number> = {
  displayOrder: catalogOrder,
  name: (a, b) => a.name.localeCompare(b.name),
  price: (a, b) => a.priceSyp - b.priceSyp,
  subscribers: (a, b) => a.subscriberCount - b.subscriberCount,
};

/**
 * The ONE filter/sort/paginate pipeline — shared by the real and the mock source
 * so search semantics can never drift between them.
 */
export function filterAndPaginatePlans(all: Plan[], params: PlanListParams): PlanListResult {
  let items = [...all];

  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (plan) =>
        plan.name.toLowerCase().includes(q) ||
        plan.tier.toLowerCase().includes(q) ||
        plan.description.toLowerCase().includes(q) ||
        plan.highlights.some((highlight) => highlight.toLowerCase().includes(q)),
    );
  }

  if (params.audience && params.audience !== 'all') {
    items = items.filter((plan) => plan.audience === params.audience);
  }

  if (params.kind && params.kind !== 'all') {
    items = items.filter((plan) => plan.kind === params.kind);
  }

  if (params.status && params.status !== 'all') {
    items = items.filter((plan) => planStatus(plan) === params.status);
  }

  if (params.community && params.community !== 'all') {
    const wanted = params.community === 'unlocks';
    items = items.filter((plan) => unlocksCommunity(plan) === wanted);
  }

  const compare = COMPARE[params.sortBy ?? 'displayOrder'];
  items.sort(compare);
  if (params.sortDir === 'desc') items.reverse();

  // Clamp the requested page: deleting the last row of the last page would
  // otherwise return an empty page the admin cannot navigate away from
  // (Pagination hides itself once pageCount drops to 1).
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(params.page ?? 1, 1), pageCount);

  return filterPaginate(items, { page, pageSize });
}

/** KPI row counters — computed over the WHOLE catalog, never the current page. */
export function computePlanStats(all: Plan[]): PlanStats {
  return {
    total: all.length,
    active: all.filter((plan) => plan.isActive).length,
    paid: all.filter((plan) => plan.kind === 'paid').length,
    subscribers: all.reduce((sum, plan) => sum + plan.subscriberCount, 0),
  };
}
