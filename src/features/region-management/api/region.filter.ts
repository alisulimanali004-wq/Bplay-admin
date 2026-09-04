import { filterPaginate } from '@shared/lib/paginate';
import type { Region, RegionListParams, RegionListResult } from './region.types';

/** Shared search + status filter + pagination (used by both the real and mock sources). */
export function filterAndPaginateRegions(
  all: Region[],
  params: RegionListParams,
): RegionListResult {
  // Soft-deleted regions are hidden unless the "show deleted" view is on, in
  // which case ONLY deleted regions are listed (a trash/recycle view).
  let items = all.filter((region) => Boolean(region.isDeleted) === Boolean(params.showDeleted));
  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (region) =>
        region.name.toLowerCase().includes(q) ||
        region.assignedAdminNames.some((name) => name.toLowerCase().includes(q)),
    );
  }
  if (params.status && params.status !== 'all') {
    items = items.filter((region) => region.status === params.status);
  }
  if (params.assignment && params.assignment !== 'all') {
    const wantAssigned = params.assignment === 'assigned';
    items = items.filter((region) => region.assignedAdminIds.length > 0 === wantAssigned);
  }
  return filterPaginate(items, params);
}
