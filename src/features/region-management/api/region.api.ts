import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import { filterAndPaginateRegions } from './region.filter';
import {
  toRegion,
  type Region,
  type RegionDto,
  type RegionListParams,
  type RegionListResult,
  type RegionStats,
  type CreateRegionInput,
  type UpdateRegionInput,
} from './region.types';

/**
 * A "region" in this dashboard IS A CITY. The backend exposes two surfaces over
 * the same rows and only one of each kind works:
 *
 *   GET  /admin/regions          — the read list (statistics module). Returns
 *                                  every active city WITH its geo circle, which
 *                                  is what `getScopeRegions` and nine other
 *                                  slices depend on.
 *   .../regions/cities           — the actual CRUD (regions module).
 *
 * Every write used to be aimed at `/admin/regions/*` directly — create, update,
 * toggle, assign, delete and restore — and all six 404'd, so nothing on this
 * screen could be changed. The reads are unchanged; the writes now go to
 * `/cities`.
 */
const REGIONS_PATH = '/admin/regions';
const CITIES_PATH = `${REGIONS_PATH}/cities`;

/** Metres on the wire, kilometres in the UI. */
const M_PER_KM = 1000;

/**
 * Attach each region's admins.
 *
 * The region payload carries no admins — the link is stored on the ADMIN side
 * (`admin_cities`) and surfaces as each admin's `cities`. Without this every
 * region read as unassigned, which made the "unassigned regions" KPI wrong and
 * left the assign dialog with nothing to pre-check.
 *
 * A failure here must not take the region list down with it: the admin list is
 * a super_admin-only endpoint, so a regional admin legitimately cannot read it.
 * In that case the regions are returned unhydrated rather than not at all.
 */
async function withAssignedAdmins(regions: Region[]): Promise<Region[]> {
  let admins: Array<{ id: string; name: string; assignedRegionIds: string[] }>;
  try {
    const { getAdmins } = await import('@features/admin-management/api');
    admins = (await getAdmins({ pageSize: 1000 })).items;
  } catch {
    return regions;
  }

  const byRegion = new Map<string, { ids: string[]; names: string[] }>();
  for (const admin of admins) {
    for (const regionId of admin.assignedRegionIds) {
      const entry = byRegion.get(regionId) ?? { ids: [], names: [] };
      entry.ids.push(admin.id);
      entry.names.push(admin.name);
      byRegion.set(regionId, entry);
    }
  }

  return regions.map((region) => {
    const entry = byRegion.get(region.id);
    return entry
      ? { ...region, assignedAdminIds: entry.ids, assignedAdminNames: entry.names }
      : region;
  });
}

/**
 * PAGINATION: client-side by design, and correct as written.
 *
 * This client never forwarded page/pageSize to the server, so it was not
 * affected by the double-pagination bug. It must stay that way: `getScopeRegions`
 * below reads the SAME endpoint and nine other slices depend on it returning the
 * COMPLETE set to resolve their region scope. A paginated response there would
 * silently narrow scoping across the whole dashboard.
 */
export async function getRegions(params: RegionListParams): Promise<RegionListResult> {
  const res = await apiClient.get(REGIONS_PATH);
  const regions = unwrapList<RegionDto>(res.data, ['regions']).map(toRegion);
  return filterAndPaginateRegions(await withAssignedAdmins(regions), params);
}

/** Fetch a single region by id. */
export async function getRegionById(id: string): Promise<Region> {
  const res = await apiClient.get(`${CITIES_PATH}/${id}`);
  return toRegion(unwrap<RegionDto>(res.data));
}

/** Platform-wide region counts — derived client-side until a stats endpoint exists. */
export async function getRegionStats(): Promise<RegionStats> {
  const res = await apiClient.get(REGIONS_PATH);
  // Hydrated too: the "unassigned" figure counts regions with no admin, which
  // is only knowable from the admin side.
  const live = (
    await withAssignedAdmins(unwrapList<RegionDto>(res.data, ['regions']).map(toRegion))
  ).filter((region) => !region.isDeleted);
  return {
    total: live.length,
    active: live.filter((region) => region.isActive).length,
    unassigned: live.filter((region) => region.assignedAdminIds.length === 0).length,
  };
}

/** Live regions with a geo circle (deleted ones never scope); callers filter isActive. */
export async function getScopeRegions(): Promise<Region[]> {
  const res = await apiClient.get(REGIONS_PATH);
  return unwrapList<RegionDto>(res.data, ['regions'])
    .map(toRegion)
    .filter(
      (region) =>
        !region.isDeleted &&
        typeof region.centerLat === 'number' &&
        typeof region.centerLng === 'number' &&
        typeof region.radiusKm === 'number',
    );
}

/**
 * A neighbourhood as the scope selectors need it: an id the facilities filter
 * accepts, a label, and the city to group it under.
 *
 * NOT filtered on the geo circle the way cities are. That filter exists because
 * the dashboard resolves region membership by testing coordinates against each
 * city's circle in the browser; a neighbourhood id is only ever handed back to
 * the API as `regionId`, which matches the stored `neighbourhood_id`. Dropping
 * circle-less neighbourhoods here would hide them from the filter for no reason.
 */
export interface ScopeNeighbourhood {
  id: string;
  name: string;
  cityId: string;
  isActive: boolean;
}

interface ScopeNeighbourhoodDto {
  id?: string | number;
  name?: string;
  city_id?: string | number;
  is_active?: boolean;
}

/**
 * Cities AND neighbourhoods in one call — both are valid values for the
 * facilities `regionId` filter, which matches
 * `city_id = $1 OR neighbourhood_id = $1`.
 *
 * Consumers share one query key so the endpoint is fetched once and read
 * through two selectors, rather than once per consumer.
 */
export async function getScopeTree(): Promise<{
  regions: Region[];
  neighbourhoods: ScopeNeighbourhood[];
}> {
  const res = await apiClient.get(REGIONS_PATH);
  const payload = (res.data?.data ?? res.data ?? {}) as {
    regions?: RegionDto[];
    neighbourhoods?: ScopeNeighbourhoodDto[];
  };

  const regions = (payload.regions ?? [])
    .map(toRegion)
    .filter(
      (region) =>
        !region.isDeleted &&
        typeof region.centerLat === 'number' &&
        typeof region.centerLng === 'number' &&
        typeof region.radiusKm === 'number',
    );

  const neighbourhoods = (payload.neighbourhoods ?? [])
    .filter((n) => n.id != null && n.city_id != null)
    .map((n) => ({
      id: String(n.id),
      name: n.name ?? '',
      cityId: String(n.city_id),
      isActive: n.is_active !== false,
    }));

  return { regions, neighbourhoods };
}

/**
 * The wire form of a region's geo circle.
 *
 * Two conversions, both easy to get wrong and both silent if missed:
 *  - `center` is a COORDINATE PAIR IN [lng, lat] ORDER, not two named fields.
 *    Swapping them puts a Saudi city in Somalia without any error.
 *  - the radius is in METRES on the wire, kilometres in the UI.
 */
function toCirclePayload(input: CreateRegionInput | UpdateRegionInput) {
  return {
    name: input.name,
    center: [input.centerLng, input.centerLat],
    radiusMeters: input.radiusKm * M_PER_KM,
  };
}

export async function createRegion(input: CreateRegionInput): Promise<Region> {
  const res = await apiClient.post(CITIES_PATH, toCirclePayload(input));
  return toRegion(unwrap<RegionDto>(res.data));
}

export async function updateRegion(id: string, input: UpdateRegionInput): Promise<Region> {
  const res = await apiClient.patch(`${CITIES_PATH}/${id}`, toCirclePayload(input));
  return toRegion(unwrap<RegionDto>(res.data));
}

export async function toggleRegionActive(id: string, isActive: boolean): Promise<void> {
  await apiClient.post(`${CITIES_PATH}/is_active/${id}`, { is_active: isActive });
}

/**
 * Set exactly which admins cover a region.
 *
 * The relationship is owned by the ADMIN side: `PATCH /admin-management/:id`
 * replaces one admin's whole `cities` set. There is no region-side endpoint —
 * `/regions/assign/:id` never existed and 404'd, so this silently did nothing.
 *
 * So the region-side view is reconstructed here: read every admin's current
 * cities, work out who gained and who lost THIS region, and write only those.
 * Untouched admins are never rewritten, so a concurrent edit to a different
 * region cannot be clobbered by this call.
 *
 * This is several requests and is NOT atomic — a mid-way failure leaves some
 * admins updated. The writes are independent and individually valid, so the
 * result is always a consistent (if partial) assignment, and the error is
 * surfaced rather than swallowed. Re-running it converges.
 */
export async function assignAdmins(
  id: string,
  adminIds: string[],
  _adminNames: string[],
): Promise<void> {
  const { getAdmins, assignRegions } = await import('@features/admin-management/api');
  const { items } = await getAdmins({ pageSize: 1000 });

  const wanted = new Set(adminIds);
  const writes: Array<Promise<void>> = [];

  for (const admin of items) {
    const holds = admin.assignedRegionIds.includes(id);
    const shouldHold = wanted.has(admin.id);
    if (holds === shouldHold) continue;

    const next = shouldHold
      ? [...admin.assignedRegionIds, id]
      : admin.assignedRegionIds.filter((regionId) => regionId !== id);
    writes.push(assignRegions(admin.id, next));
  }

  await Promise.all(writes);
}

/**
 * Cities have no delete route — deactivating one is how a region is retired, and
 * it is reversible. A hard delete would orphan every facility, booking and admin
 * scope that references the city.
 */
export async function deleteRegion(id: string): Promise<void> {
  await toggleRegionActive(id, false);
}

/** The inverse of {@link deleteRegion}: reactivate a retired region. */
export async function restoreRegion(id: string): Promise<void> {
  await toggleRegionActive(id, true);
}
