import { filterPaginate } from '@shared/lib/paginate';
import { resolveDateRange } from '@ui';
import type { FacilityListItem } from '@features/facility-management/api';
import {
  toBookingListItem,
  type Booking,
  type BookingListItem,
  type BookingListParams,
  type BookingListResult,
  type BookingStats,
} from './booking.types';

/**
 * A precomputed lookup over the caller's ALREADY-scoped facility list — the
 * oracle for which bookings the signed-in admin may see and where they sit in
 * the region model. There is no haversine here: the facility-management list is
 * already scope-filtered and carries region membership, so we simply index it.
 */
export interface FacilityScopeIndex {
  /** Ids of every facility the admin may see (visibility). */
  visibleIds: Set<string>;
  /** facility id → containing region NAMES. */
  regionNamesById: Map<string, string[]>;
  /** facility id → outside every active region (super_admin only). */
  isOrphanById: Map<string, boolean>;
}

/** Build the scope index from the facility-management list (its own scope oracle). */
export function buildFacilityScopeIndex(items: FacilityListItem[]): FacilityScopeIndex {
  const visibleIds = new Set<string>();
  const regionNamesById = new Map<string, string[]>();
  const isOrphanById = new Map<string, boolean>();
  for (const item of items) {
    visibleIds.add(item.id);
    regionNamesById.set(item.id, item.regionNames);
    isOrphanById.set(item.id, item.isOrphan);
  }
  return { visibleIds, regionNamesById, isOrphanById };
}

function compareBy(
  a: BookingListItem,
  b: BookingListItem,
  sortBy: BookingListParams['sortBy'],
): number {
  switch (sortBy) {
    case 'reference':
      return a.reference.localeCompare(b.reference);
    case 'totalSyp':
      return a.totalSyp - b.totalSyp;
    case 'createdAt':
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    case 'date':
    default: {
      const at = Date.parse(a.date) || 0;
      const bt = Date.parse(b.date) || 0;
      if (at !== bt) return at - bt;
      return a.startTime.localeCompare(b.startTime);
    }
  }
}

/**
 * The single scope + filter + sort + paginate pipeline shared by the real and
 * mock sources.
 *
 * regionId filtering is NAME-based: the FiltersBar offers region options whose
 * value is the region's NAME (because the scope index only carries names per
 * facility). So a non-'all'/'orphans' regionId is matched against the item's
 * `regionNames`. 'orphans' matches items outside every active region.
 */
export function buildBookingListResult(
  all: Booking[],
  params: BookingListParams,
  idx: FacilityScopeIndex,
): BookingListResult {
  let items: BookingListItem[] = all
    .filter((booking) => idx.visibleIds.has(booking.facilityId))
    .map((booking) =>
      toBookingListItem(
        booking,
        idx.regionNamesById.get(booking.facilityId) ?? [],
        idx.isOrphanById.get(booking.facilityId) ?? false,
      ),
    );

  const playerId = params.playerId;
  if (playerId) {
    items = items.filter((item) => item.playerId === playerId);
  }

  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (item) =>
        item.reference.toLowerCase().includes(q) ||
        item.partyName.toLowerCase().includes(q) ||
        item.facilityName.toLowerCase().includes(q),
    );
  }

  const status = params.status;
  if (status && status !== 'all') {
    items = items.filter((item) => item.status === status);
  }

  const paymentStatus = params.paymentStatus;
  if (paymentStatus && paymentStatus !== 'all') {
    items = items.filter((item) => item.paymentStatus === paymentStatus);
  }

  const facilityId = params.facilityId;
  if (facilityId && facilityId !== 'all') {
    items = items.filter((item) => item.facilityId === facilityId);
  }

  const sport = params.sport;
  if (sport && sport !== 'all') {
    items = items.filter((item) => item.sport === sport);
  }

  const source = params.source;
  if (source && source !== 'all') {
    items = items.filter((item) => item.source === source);
  }

  const regionId = params.regionId;
  if (regionId && regionId !== 'all') {
    items =
      regionId === 'orphans'
        ? items.filter((item) => item.isOrphan)
        : items.filter((item) => item.regionNames.includes(regionId));
  }

  const dateRange = params.dateRange;
  if (dateRange && dateRange.preset !== 'all') {
    const nowMs = Date.now();
    const { fromMs, toMs } = resolveDateRange(dateRange, nowMs);
    // A booking's `date` is the SCHEDULED slot — it spans past AND future. The
    // "last N days" presets have an open upper bound, so cap them at today here;
    // otherwise a future-dated booking would leak into e.g. "Last 7 days". Custom
    // ranges keep whatever bound the user chose.
    const upperMs = toMs ?? (dateRange.preset === 'custom' ? null : nowMs);
    items = items.filter((item) => {
      const when = Date.parse(item.date);
      if (fromMs !== null && when < fromMs) return false;
      if (upperMs !== null && when > upperMs) return false;
      return true;
    });
  }

  if (params.sortBy) {
    const dir = params.sortDir === 'asc' ? 1 : -1;
    items = [...items].sort((a, b) => compareBy(a, b, params.sortBy) * dir);
  }

  return filterPaginate(items, params);
}

/** Scope-aware KPI aggregate over the visible booking set (ignores param filters). */
export function computeBookingStats(all: Booking[], idx: FacilityScopeIndex): BookingStats {
  const scoped = all.filter((booking) => idx.visibleIds.has(booking.facilityId));
  return {
    total: scoped.length,
    underReview: scoped.filter((booking) => booking.status === 'under_review').length,
    confirmed: scoped.filter((booking) => booking.status === 'confirmed').length,
    completed: scoped.filter((booking) => booking.status === 'completed').length,
    attention: scoped.filter(
      (booking) =>
        booking.status === 'cancelled' ||
        booking.status === 'rejected' ||
        booking.status === 'no_show',
    ).length,
    revenueSyp: scoped
      .filter((booking) => booking.paymentStatus === 'paid')
      .reduce((sum, booking) => sum + booking.money.totalSyp, 0),
  };
}
