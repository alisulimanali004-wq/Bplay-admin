import { filterPaginate } from '@shared/lib/paginate';
import type { Admin, AdminListParams, AdminListResult } from './admin.types';

/**
 * Shared search + filters + pagination (used by both the real and mock sources).
 * Runs AFTER the source has hydrated each admin's assignedRegion* fields, so the
 * search, scope and assignment filters can read them.
 */
export function filterAndPaginateAdmins(all: Admin[], params: AdminListParams): AdminListResult {
  // Against the real API this never removes anything: deletion is permanent, so
  // a deleted admin has no row left to return. The guard stays because the mock
  // source still marks records deleted rather than dropping them, and a deleted
  // admin must not appear in the list either way.
  let items = all.filter((admin) => !admin.isDeleted);

  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (admin) =>
        admin.name.toLowerCase().includes(q) ||
        admin.email.toLowerCase().includes(q) ||
        admin.assignedRegionNames.some((name) => name.toLowerCase().includes(q)),
    );
  }

  if (params.status && params.status !== 'all') {
    items = items.filter((admin) => admin.status === params.status);
  }

  if (params.scope && params.scope !== 'all') {
    items = items.filter((admin) => admin.scope === params.scope);
  }

  // Assignment applies to regional admins only: "assigned" = holds >=1 region,
  // "unassigned" = a regional admin with no region yet (needs attention).
  if (params.assignment && params.assignment !== 'all') {
    if (params.assignment === 'assigned') {
      items = items.filter((admin) => admin.assignedRegionIds.length > 0);
    } else {
      items = items.filter(
        (admin) => admin.scope === 'regional' && admin.assignedRegionIds.length === 0,
      );
    }
  }

  return filterPaginate(items, params);
}
