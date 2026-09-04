import { filterPaginate } from '@shared/lib/paginate';
import { haversineKm } from '@shared/lib/geo';
import { resolveDateRange } from '@ui';
import type { UserRole } from '@shared/stores/authStore';
import type { Region } from '@features/region-management/api/region.types';
import {
  isAged,
  toFacilityListItem,
  type Facility,
  type FacilityListItem,
  type FacilityListParams,
  type FacilityListResult,
  type FacilityStats,
} from './facility.types';

/** The signed-in admin's visibility scope (read from the auth store by the api layer). */
export interface AdminScope {
  role: UserRole | null;
  assignedRegionIds?: string[];
}

/** A region that can scope facilities: active + a full geo circle. */
interface GeoRegion extends Region {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

function isGeoRegion(region: Region): region is GeoRegion {
  return (
    typeof region.centerLat === 'number' &&
    typeof region.centerLng === 'number' &&
    typeof region.radiusKm === 'number'
  );
}

/** Only ACTIVE regions with geo ever scope — an inactive city (e.g. Hama) never counts. */
function activeGeoRegions(regions: Region[]): GeoRegion[] {
  return regions.filter((region): region is GeoRegion => region.isActive && isGeoRegion(region));
}

function contains(region: GeoRegion, facility: Facility): boolean {
  return (
    haversineKm(
      { lat: facility.location.lat, lng: facility.location.lng },
      { lat: region.centerLat, lng: region.centerLng },
    ) <= region.radiusKm
  );
}

/** Names of ALL active geo regions containing the facility (overlap allowed); orphan = none. */
export function computeMembership(
  facility: Facility,
  regions: Region[],
): { regionNames: string[]; isOrphan: boolean } {
  const containing = activeGeoRegions(regions).filter((region) => contains(region, facility));
  return { regionNames: containing.map((region) => region.name), isOrphan: containing.length === 0 };
}

interface ScopedEntry {
  item: FacilityListItem;
  containingIds: string[];
}

/**
 * Project every facility to a scoped entry.
 *
 * Membership comes from the SERVER's stored `city_id` / `neighbourhood_id`
 * (surfaced as `location.city` / `location.district`), not from a distance test
 * in the browser. Those FK columns are what the API itself filters on, so this
 * is the same definition rather than a second, disagreeing one — and a facility
 * whose pin sits just outside a hand-drawn circle no longer reads as belonging
 * to no region at all.
 */
function buildEntries(facilities: Facility[]): ScopedEntry[] {
  return facilities.map((facility) => {
    const regionNames = [facility.location.city, facility.location.district].filter(
      (name): name is string => Boolean(name),
    );
    return {
      containingIds: [],
      // Orphan = the server resolved no region for it. That is a real state
      // worth surfacing (it means the row is invisible to every regional
      // admin), but it is no longer inferred from coordinates.
      item: toFacilityListItem(facility, regionNames, regionNames.length === 0),
    };
  });
}

/**
 * No client-side narrowing. The API already applied the caller's region scope —
 * `city_id`/`neighbourhood_id` against `admin_cities`/`admin_neighbourhoods`,
 * including the general-oversight tier — so re-filtering here could only ever
 * subtract rows the server deliberately returned.
 *
 * It did exactly that: this used to drop every "orphan" for all roles except
 * super_admin, where orphan meant "outside every drawn circle". A
 * general-oversight admin, whom the backend grants the whole platform, was
 * shown an EMPTY facilities screen. Facilities with absent or NaN coordinates
 * vanished the same way, for everyone.
 *
 * Kept as a named pass-through so the seam stays visible: if per-role hiding is
 * ever wanted again it belongs in the query, not here.
 */
function applyScope(entries: ScopedEntry[], _scope: AdminScope): ScopedEntry[] {
  return entries;
}

function scopedEntries(facilities: Facility[], _regions: Region[], scope: AdminScope): ScopedEntry[] {
  return applyScope(buildEntries(facilities), scope);
}

function compareBy(a: FacilityListItem, b: FacilityListItem, sortBy: FacilityListParams['sortBy']): number {
  switch (sortBy) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'rating':
      return (a.rating ?? 0) - (b.rating ?? 0);
    case 'createdAt':
    default:
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  }
}

/**
 * The single scope + filter + sort + paginate pipeline shared by the real and
 * mock sources.
 */
export function buildFacilityListResult(
  facilities: Facility[],
  params: FacilityListParams,
  regions: Region[],
  scope: AdminScope,
): FacilityListResult {
  let entries = scopedEntries(facilities, regions, scope);

  const q = params.q?.trim().toLowerCase();
  if (q) {
    entries = entries.filter(
      (entry) =>
        entry.item.name.toLowerCase().includes(q) ||
        entry.item.ownerName.toLowerCase().includes(q),
    );
  }
  const status = params.status;
  if (status && status !== 'all') {
    entries = entries.filter((entry) => entry.item.status === status);
  }
  const kind = params.kind;
  if (kind && kind !== 'all') {
    entries = entries.filter((entry) => entry.item.kind === kind);
  }
  const sport = params.sport;
  if (sport && sport !== 'all') {
    entries = entries.filter((entry) => entry.item.sports.includes(sport));
  }
  const regionId = params.regionId;
  if (regionId && regionId !== 'all') {
    entries =
      regionId === 'orphans'
        ? entries.filter((entry) => entry.item.isOrphan)
        : entries.filter((entry) => entry.containingIds.includes(regionId));
  }
  const ownerId = params.ownerId;
  if (ownerId && ownerId !== 'all') {
    entries = entries.filter((entry) => entry.item.ownerId === ownerId);
  }
  const source = params.source;
  if (source && source !== 'all') {
    entries = entries.filter((entry) => entry.item.source === source);
  }
  const minRating = params.minRating;
  if (typeof minRating === 'number') {
    entries = entries.filter(
      (entry) => typeof entry.item.rating === 'number' && entry.item.rating >= minRating,
    );
  }
  const governorate = params.governorate;
  if (governorate && governorate !== 'all') {
    entries = entries.filter((entry) => entry.item.governorate === governorate);
  }
  const city = params.city?.trim().toLowerCase();
  if (city) {
    entries = entries.filter((entry) => (entry.item.city ?? '').toLowerCase().includes(city));
  }
  const verification = params.verification;
  if (verification && verification !== 'all') {
    entries = entries.filter((entry) => entry.item.verification === verification);
  }
  const amenities = params.amenities;
  if (amenities && amenities.length > 0) {
    entries = entries.filter((entry) =>
      amenities.every((amenity) => entry.item.amenities.includes(amenity)),
    );
  }
  const dateRange = params.dateRange;
  if (dateRange && dateRange.preset !== 'all') {
    const { fromMs, toMs } = resolveDateRange(dateRange, Date.now());
    entries = entries.filter((entry) => {
      const created = Date.parse(entry.item.createdAt);
      if (fromMs !== null && created < fromMs) return false;
      if (toMs !== null && created > toMs) return false;
      return true;
    });
  }

  if (params.sortBy) {
    const dir = params.sortDir === 'asc' ? 1 : -1;
    entries = [...entries].sort((a, b) => compareBy(a.item, b.item, params.sortBy) * dir);
  }

  return filterPaginate(
    entries.map((entry) => entry.item),
    params,
  );
}

/** Scope-aware KPI aggregate over the visible facility set (ignores param filters). */
export function computeFacilityStats(
  facilities: Facility[],
  regions: Region[],
  scope: AdminScope,
): FacilityStats {
  const items = scopedEntries(facilities, regions, scope).map((entry) => entry.item);
  const rated = items.filter((item) => typeof item.rating === 'number');
  const avgRating = rated.length
    ? rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length
    : 0;
  return {
    total: items.length,
    active: items.filter((item) => item.status === 'active').length,
    pending: items.filter((item) => item.status === 'pending').length,
    suspended: items.filter(
      (item) => item.status === 'suspended' || item.status === 'owner_suspended',
    ).length,
    rejected: items.filter((item) => item.status === 'rejected').length,
    avgRating: Math.round(avgRating * 10) / 10,
    aged: items.filter((item) => item.status === 'pending' && isAged(item.createdAt)).length,
    orphan: items.filter((item) => item.isOrphan).length,
  };
}
