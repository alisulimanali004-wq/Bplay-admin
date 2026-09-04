import { filterPaginate } from '@shared/lib/paginate';
import { ownerState, type Owner, type OwnerListParams, type OwnerListResult } from './owner.types';

/**
 * Search + filters + pagination for the MOCK source only — the live API runs all
 * three server-side and returns an already-narrowed page plus a `meta` total.
 * Filters mirror admin SRS FR-ADM-OWNER-003: a single account-state filter plus
 * region, facility-count and registration-date range.
 */
export function filterAndPaginateOwners(all: Owner[], params: OwnerListParams): OwnerListResult {
  let items = all;

  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (owner) =>
        owner.name.toLowerCase().includes(q) ||
        owner.email.toLowerCase().includes(q) ||
        owner.phone.toLowerCase().includes(q) ||
        owner.region.toLowerCase().includes(q),
    );
  }

  if (params.status && params.status !== 'all') {
    items = items.filter((owner) => ownerState(owner) === params.status);
  }

  if (params.facilities && params.facilities !== 'all') {
    const wantHas = params.facilities === 'has';
    items = items.filter((owner) => (owner.facilitiesCount ?? 0) > 0 === wantHas);
  }

  // Registration recency — owners who joined within the selected window.
  if (params.joined && params.joined !== 'all') {
    const cutoff = new Date();
    if (params.joined === '7d') cutoff.setDate(cutoff.getDate() - 7);
    else if (params.joined === '30d') cutoff.setDate(cutoff.getDate() - 30);
    else if (params.joined === '90d') cutoff.setDate(cutoff.getDate() - 90);
    else cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffTime = cutoff.getTime();
    items = items.filter(
      (owner) => Boolean(owner.createdAt) && new Date(owner.createdAt!).getTime() >= cutoffTime,
    );
  }

  return filterPaginate(items, params);
}
