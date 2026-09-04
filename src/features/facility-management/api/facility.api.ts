import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import { useAuthStore } from '@shared/stores/authStore';
import { getScopeRegions } from '@features/region-management/api';
import {
  buildFacilityListResult,
  computeFacilityStats,
  type AdminScope,
} from './facility.filter';
import {
  toFacility,
  toRegionFacility,
  type BulkActionResult,
  type BulkFacilityAction,
  type CreateFacilityInput,
  type FacilityDocAction,
  type Facility,
  type FacilityDto,
  type FacilityListParams,
  type FacilityListResult,
  type FacilityStats,
  type RegionFacility,
  type UpdateFacilityInput,
} from './facility.types';

const BASE = '/admin/facilities-management';
const FACILITIES_PATH = `${BASE}/facilities`;

/**
 * How many rows to pull when the client must filter and paginate itself.
 *
 * Not unbounded: an explicit ceiling makes truncation a visible, chosen number
 * rather than whatever the server's default happens to be. The endpoint allows
 * up to 100000, so this leaves ample headroom while still being a real limit.
 */
const WORKING_SET = 2000;
/** Approve/reject live under /facilities/review, both singly and in bulk. */
const REVIEW_PATH = `${FACILITIES_PATH}/review`;

function currentScope(): AdminScope {
  const { role, user } = useAuthStore.getState();
  return { role, assignedRegionIds: user?.assignedRegionIds };
}

/**
 * PAGINATION: deliberately CLIENT-SIDE, and paginated exactly once.
 *
 * This list cannot use server paging, and the reason is worth stating so nobody
 * "fixes" it back. After the fetch, `buildFacilityListResult` still applies
 * filters the backend cannot express — `amenities`, `minRating`, `verification`
 * — and, more importantly, the geo REGION SCOPE, which is resolved in the
 * browser from each region's circle. Any of those can drop rows. Paginating on
 * the server first would therefore return "page 2 of 8" and then filter it down
 * to 3, so the count, the page boundaries and the row set would all disagree.
 *
 * The bug this replaces was the opposite mistake: `page`/`pageSize` were
 * forwarded to the server AND the returned page was sliced again locally. With
 * `page=2` the server returned rows 6–10 and the client then sliced that
 * 5-element array from index 5 — a blank table. Paginating twice is always
 * wrong; the fix is to pick one place, not to remove both.
 *
 * So the page params are stripped from the request and a full working set is
 * fetched instead. `pageSize` is capped high server-side (100000) precisely to
 * allow this.
 */
/**
 * The querystring the server actually declares.
 *
 * Only these keys exist on `listFacilitiesSchema`, and blank / 'all' values are
 * OMITTED rather than sent. Spreading the UI's filter state straight onto the
 * request meant an untouched search box sent `q=`, which fails the declared
 * `minLength: 1` — so the facilities page 400'd on FIRST LOAD and rendered
 * "Something went wrong" with no search typed and no filter touched.
 *
 * `regionId` and `ownerId` are declared `format: uuid`, so the sentinel 'all'
 * (and 'orphans') would 400 too.
 *
 * Everything else the UI filters on — source, minRating, verification,
 * amenities, dateRange, sortBy/sortDir — has no server-side counterpart and is
 * applied locally by buildFacilityListResult. Sending those keys is at best
 * ignored and at worst a 400, so they stay out of the request.
 */
function toFacilityQuery(params: FacilityListParams): Record<string, string | number> {
  const query: Record<string, string | number> = { pageSize: WORKING_SET };

  const q = params.q?.trim();
  if (q) query.q = q;
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.kind && params.kind !== 'all') query.kind = params.kind;
  if (params.sport && params.sport !== 'all') query.sport = params.sport;
  if (params.governorate && params.governorate !== 'all') query.governorate = params.governorate;

  const city = params.city?.trim();
  if (city) query.city = city;

  // uuid-typed: the 'all' / 'orphans' sentinels are resolved client-side.
  if (params.regionId && params.regionId !== 'all' && params.regionId !== 'orphans') {
    query.regionId = params.regionId;
  }
  if (params.ownerId && params.ownerId !== 'all') query.ownerId = params.ownerId;

  return query;
}

export async function getFacilities(params: FacilityListParams): Promise<FacilityListResult> {
  const [res, regions] = await Promise.all([
    apiClient.get(FACILITIES_PATH, { params: toFacilityQuery(params) }),
    getScopeRegions(),
  ]);
  const all = unwrapList<FacilityDto>(res.data, ['facilities']).map(toFacility);
  return buildFacilityListResult(all, params, regions, currentScope());
}

export async function getPendingFacilities(
  params: FacilityListParams,
): Promise<FacilityListResult> {
  return getFacilities({ ...params, status: 'pending' });
}

export async function getFacilityById(id: string): Promise<Facility> {
  const [res, regions] = await Promise.all([
    apiClient.get(`${FACILITIES_PATH}/${id}`),
    getScopeRegions(),
  ]);
  const facility = toFacility(unwrap<FacilityDto>(res.data));
  const visible = buildFacilityListResult(
    [facility],
    { page: 1, pageSize: 1 },
    regions,
    currentScope(),
  );
  if (visible.total === 0) throw new Error('Facility not found');
  return facility;
}

/**
 * Approve / reject a pending facility.
 *
 * The route is `/facilities/review/:id` — `/pending-review/:id` does not exist
 * on the backend, so every approve and reject 404'd from the dashboard.
 */
export async function approveFacility(id: string): Promise<void> {
  await apiClient.patch(`${REVIEW_PATH}/${id}`, { status: 'approved' });
}

export async function rejectFacility(id: string, reason: string): Promise<void> {
  if (reason.trim().length === 0) throw new Error('Reason is required');
  await apiClient.patch(`${REVIEW_PATH}/${id}`, { status: 'rejected', reason: reason.trim() });
}

/**
 * Suspend and reactivate are ONE endpoint taking a boolean, not two verbs:
 * `PATCH /facilities/:id/suspension { isSuspended }`. The previous
 * `/suspend` + `/reactivate` pair matched no route at all.
 */
export async function suspendFacility(id: string, reason: string): Promise<void> {
  if (reason.trim().length === 0) throw new Error('Reason is required');
  await apiClient.patch(`${FACILITIES_PATH}/${id}/suspension`, {
    isSuspended: true,
    reason: reason.trim(),
  });
}

export async function reactivateFacility(id: string): Promise<void> {
  await apiClient.patch(`${FACILITIES_PATH}/${id}/suspension`, { isSuspended: false });
}

export async function reviewFacilityDocument(
  facilityId: string,
  documentId: string,
  action: FacilityDocAction,
  reason?: string,
): Promise<void> {
  if (action === 'reject' && (!reason || reason.trim().length === 0)) {
    throw new Error('Reason is required');
  }
  await apiClient.patch(`${FACILITIES_PATH}/${facilityId}/documents/${documentId}`, {
    status: action === 'accept' ? 'approved' : 'rejected',
    reason: reason?.trim(),
  });
}

/**
 * Soft-delete a facility.
 *
 * The backend refuses (409 ERR_FACILITY_HAS_BOOKINGS) while upcoming bookings
 * exist, so the caller must surface that message rather than assume success.
 */
export async function deleteFacility(id: string): Promise<void> {
  await apiClient.delete(`${FACILITIES_PATH}/${id}`);
}

/**
 * Upload a photo or verification document, returning its stored URL.
 *
 * The wizard used to keep `URL.createObjectURL` blobs and post those as the
 * photo/document URLs. A `blob:` URL only resolves inside the tab that created
 * it, so every admin-created facility was saved with links that were already
 * dead — broken thumbnails in the gallery and unopenable KYC documents.
 *
 * Multipart, matching the owner-document upload; the field name is `file`.
 */
export async function uploadFacilityMedia(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  // `undefined` (not a literal string) so axios computes the multipart
  // Content-Type INCLUDING its boundary. The client sets a JSON default at the
  // instance level, and leaving that in place makes the server parse the body
  // as JSON and reject the upload.
  const res = await apiClient.post(`${FACILITIES_PATH}/media`, form, {
    headers: { 'Content-Type': undefined },
    // Uploads are slower than the 15s default the JSON calls use.
    timeout: 60_000,
  });
  const { url } = unwrap<{ url: string }>(res.data);
  if (!url) throw new Error('Upload did not return a URL');
  return url;
}

/**
 * Sport SLUG -> UUID.
 *
 * The wizard speaks slugs ('tennis'); every facility route wants the sports
 * table's uuid. `GET /sports` returns both, and `sports.slug` matches
 * `SportType` one-for-one, so the lookup is a straight map.
 *
 * Cached for the session: the list is small, static, and needed by both create
 * paths — refetching it per court would be a request per row.
 */
let sportIdCache: Map<string, string> | null = null;

async function sportIds(): Promise<Map<string, string>> {
  if (sportIdCache) return sportIdCache;
  const res = await apiClient.get('/sports');
  const rows = unwrapList<{ id: string; slug: string }>(res.data, ['sports']);
  sportIdCache = new Map(rows.map((row) => [row.slug, row.id]));
  return sportIdCache;
}

/**
 * The dashboard's surface vocabulary against the backend's.
 *
 * The two do NOT use the same words: the UI says `grass` / `artificial` /
 * `hardcourt`, the API wants `natural_grass` / `artificial_grass` /
 * `hard_court`. This used to be a membership test against the BACKEND's list,
 * so a UI value never matched and three of the five surfaces were silently sent
 * as null — the surface an admin picked was thrown away on save, and (until the
 * schema fix that accompanies this) the null then failed validation outright.
 *
 * `clay` and `sand` are spelled the same on both sides, which is why those two
 * appeared to work and the bug looked intermittent.
 */
const SURFACE_WIRE: Record<string, string> = {
  grass: 'natural_grass',
  artificial: 'artificial_grass',
  hardcourt: 'hard_court',
  clay: 'clay',
  sand: 'sand',
};

/** Backend values, accepted unchanged so an already-translated value survives. */
const SURFACES = new Set(Object.values(SURFACE_WIRE).concat(['wood', 'other']));

const toSurface = (surface?: string) => {
  if (!surface) return null;
  if (SURFACE_WIRE[surface]) return SURFACE_WIRE[surface];
  return SURFACES.has(surface) ? surface : null;
};

/** The wizard's isIndoor boolean against the backend's environment enum. */
const toEnvironment = (isIndoor?: boolean) => (isIndoor ? 'indoor' : 'outdoor');

/**
 * ISO weekday (Mon=1..Sun=7, what the UI uses) -> the DB's Sun=0..Sat=6.
 *
 * The two conventions genuinely differ and only SUNDAY disagrees, which is why
 * this stayed hidden: the wizard seeds all seven days, so every submission
 * carried a `dayOfWeek: 7` that the API rejects outright (`must be <= 6`) — the
 * "request validation failed" on Add Facility.
 *
 * Clamping to 6 or dropping the row would be worse than the 400. Availability is
 * resolved with Postgres `EXTRACT(DOW)` (0=Sunday), so a mis-numbered row is not
 * a cosmetic problem: every day would shift by one and Sunday's hours would
 * never match. Converting is the only correct option, and it matches what the
 * owner API already does server-side for the same payload.
 */
const toWireDay = (day: number) => (day === 7 ? 0 : day);

/**
 * WorkingHours is Record<dayIndex, DayHours> in the UI and an ARRAY of
 * { dayOfWeek, openTime, closeTime, isClosed } on the wire — note the camelCase
 * here, which is unusual for this API but is what the schema declares.
 */
function toWorkingHours(hours: CreateFacilityInput['workingHours']) {
  return Object.entries(hours ?? {}).map(([day, dayHours]) => ({
    dayOfWeek: toWireDay(Number(day)),
    openTime: dayHours.isOpen ? (dayHours.openTime ?? null) : null,
    closeTime: dayHours.isOpen ? (dayHours.closeTime ?? null) : null,
    isClosed: !dayHours.isOpen,
  }));
}

/**
 * A CLUB body — `POST /facilities/clubs`.
 *
 * The body is `additionalProperties: false`, so every key here must be one the
 * schema declares. `description`, `contactPhone` and the club-level amenity
 * flags have nowhere to go and are dropped rather than sent (AJV's
 * removeAdditional would strip them silently anyway; being explicit means the
 * loss is visible in review rather than discovered later).
 */
async function buildClubBody(input: CreateFacilityInput) {
  const ids = await sportIds();
  return {
    owner_id: input.ownerId,
    name: input.name,
    sports: input.sports.map((slug) => ids.get(slug)).filter((id): id is string => Boolean(id)),
    address: input.location.address ?? null,
    latitude: input.location.lat,
    longitude: input.location.lng,
    images: input.images,
    documents: (input.documents ?? []).map((doc) => ({ name: doc.name, url: doc.url })),
    working_hours: toWorkingHours(input.workingHours),
    courts: (input.courts ?? []).map((court) => ({
      name: court.name,
      sport_id: ids.get(court.sport),
      capacity: court.capacity ?? 1,
      price_per_hour: court.pricePerHour,
      surface_type: toSurface(court.surface),
      environment: toEnvironment(court.isIndoor),
      visibility: 'public',
    })),
  };
}

/** A standalone PITCH body — `POST /facilities/pitches`. */
async function buildPitchBody(input: CreateFacilityInput) {
  const ids = await sportIds();
  return {
    owner_id: input.ownerId,
    name: input.name,
    // A pitch is exactly one sport — the first entry, per CreateFacilityInput.
    sport_id: input.sports[0] ? (ids.get(input.sports[0]) ?? null) : null,
    address: input.location.address ?? null,
    latitude: input.location.lat,
    longitude: input.location.lng,
    price_per_hour: input.pricePerHour ?? 0,
    capacity: input.capacity ?? 1,
    specs: {
      surface_type: toSurface(input.specs?.surface),
      environment: toEnvironment(input.specs?.isIndoor),
    },
    ...(input.cancelPolicy
      ? {
          cancel_policy: {
            cancel_free_hours: input.cancelPolicy.freeHoursBefore,
            cancel_penalty_percent: input.cancelPolicy.penaltyPercent,
          },
        }
      : {}),
    images: input.images,
    documents: (input.documents ?? []).map((doc) => ({ name: doc.name, url: doc.url })),
  };
}

/**
 * Create a facility.
 *
 * Creation is TWO endpoints, not one: a club (with courts and working hours)
 * and a standalone pitch (with its own price and capacity) are different
 * shapes, and the backend validates them separately. This used to POST a
 * single merged body to `/facilities`, a route that does not exist — so the
 * Add Facility wizard 404'd on submit no matter what was entered.
 */
export async function createFacility(input: CreateFacilityInput): Promise<Facility> {
  const res =
    input.kind === 'club'
      ? await apiClient.post(`${FACILITIES_PATH}/clubs`, await buildClubBody(input))
      : await apiClient.post(`${FACILITIES_PATH}/pitches`, await buildPitchBody(input));

  // The create response is a 6-field STUB — `{id, type, name, owner_id, status,
  // source}` — not a facility record. Two things follow:
  //
  //  1. It names the discriminator `type`, while the mapper reads `kind`. A club
  //     therefore mapped to `kind: 'pitch'` (the fallback), and the caller got
  //     an object claiming to be a pitch with none of a pitch's fields.
  //  2. Everything else the model needs — location, images, courts, statistics —
  //     is absent, so the mapped result is mostly empty defaults.
  //
  // `kind` is supplied from the input (we know what was asked for) and the id is
  // what the caller actually uses, to navigate to the profile that then loads
  // the real record.
  const dto = unwrap<FacilityDto>(res.data);
  return toFacility({ ...dto, kind: dto.kind ?? dto.type ?? input.kind });
}

/**
 * Update a facility — `PUT /facilities/{id}`.
 *
 * One endpoint for both kinds, and every field is optional, so this sends only
 * what the schema declares. Courts and working hours are NOT updatable here;
 * they have their own routes.
 */
export async function updateFacility(id: string, input: UpdateFacilityInput): Promise<Facility> {
  const ids = await sportIds();
  const res = await apiClient.put(`${FACILITIES_PATH}/${id}`, {
    name: input.name,
    address: input.location.address ?? null,
    latitude: input.location.lat,
    longitude: input.location.lng,
    contact_phone: input.contactPhone ?? null,
    sports: input.sports.map((slug) => ids.get(slug)).filter((sid): sid is string => Boolean(sid)),
    ...(input.kind === 'pitch'
      ? {
          price_per_hour: input.pricePerHour ?? null,
          capacity: input.capacity ?? null,
          specs: {
            surface_type: toSurface(input.specs?.surface),
            environment: toEnvironment(input.specs?.isIndoor),
          },
        }
      : {}),
    ...(input.cancelPolicy
      ? {
          cancel_policy: {
            cancel_free_hours: input.cancelPolicy.freeHoursBefore,
            cancel_penalty_percent: input.cancelPolicy.penaltyPercent,
          },
        }
      : {}),
    images: input.images,
    documents: (input.documents ?? []).map((doc) => ({ name: doc.name, url: doc.url })),
  });
  return toFacility(unwrap<FacilityDto>(res.data));
}

export async function bulkAction(
  ids: string[],
  action: BulkFacilityAction,
  reason?: string,
): Promise<BulkActionResult> {
  if (action === 'reject' && (!reason || reason.trim().length === 0)) {
    throw new Error('Reason is required');
  }
  // The route is /facilities/review/bulk, not /pending-review/bulk — the
  // latter does not exist on the backend, so every bulk action 404'd and the
  // fabricated return value below hid it completely.
  const res = await apiClient.patch(`${FACILITIES_PATH}/review/bulk`, {
    ids,
    status: action === 'approve' ? 'approved' : 'rejected',
    reason: reason?.trim(),
  });
  // Report what actually happened. Previously this returned
  // `{ succeeded: ids.length, skipped: [] }` unconditionally, so an admin
  // bulk-approving facilities with unapproved KYC documents was told every one
  // succeeded while the backend had skipped them all.
  const result = unwrap<BulkActionResult>(res.data);
  return {
    succeeded: result?.succeeded ?? 0,
    skipped: result?.skipped ?? [],
  };
}

/** Scope-aware KPI figures — derived client-side over the visible facility set. */
export async function getFacilityStats(): Promise<FacilityStats> {
  const [res, regions] = await Promise.all([
    apiClient.get(FACILITIES_PATH, { params: { pageSize: 1000 } }),
    getScopeRegions(),
  ]);
  const all = unwrapList<FacilityDto>(res.data, ['facilities']).map(toFacility);
  return computeFacilityStats(all, regions, currentScope());
}

/** One `{ id, name, count }` bucket as both counts endpoints return them. */
interface CountBucket {
  id: string;
  name?: string;
  count?: number;
}

/**
 * Both counts endpoints return ARRAYS of `{ id, name, count }`, not the
 * `Record<id, number>` these functions used to cast to. The cast silently
 * succeeded and every lookup then returned `undefined`, so the facility-count
 * column and its filter read as blank/zero for every row.
 */
function toCountMap(buckets: CountBucket[] | null | undefined): Record<string, number> {
  if (!Array.isArray(buckets)) return {};
  const map: Record<string, number> = {};
  for (const bucket of buckets) {
    if (bucket?.id) map[bucket.id] = bucket.count ?? 0;
  }
  return map;
}

/**
 * Facility count per region, keyed by region id.
 *
 * The endpoint splits its answer into `{ cities, neighborhoods }`. Regions in
 * this dashboard are backed by either level, so both are merged into one map —
 * ids are UUIDs and cannot collide across the two sets.
 */
export async function getRegionFacilityCounts(): Promise<Record<string, number>> {
  const res = await apiClient.get(`${FACILITIES_PATH}/region-counts`);
  const data = unwrap<{ cities?: CountBucket[]; neighborhoods?: CountBucket[] }>(res.data);
  return { ...toCountMap(data?.cities), ...toCountMap(data?.neighborhoods) };
}

/** Facility count per owner id (for the owners list facility-count column/filter). */
export async function getFacilityCountsByOwner(): Promise<Record<string, number>> {
  const res = await apiClient.get(`${FACILITIES_PATH}/owner-counts`);
  return toCountMap(unwrap<CountBucket[]>(res.data));
}

/**
 * The owner block/suspend cascade is applied server-side (the admin only calls
 * the owner status endpoint), so this is a no-op against a real backend.
 */
export function suspendFacilitiesByOwner(_ownerId: string): Promise<void> {
  return Promise.resolve();
}

/**
 * The facilities inside a single region (for the region detail page). The
 * endpoint is already scoped by region, so we just normalise and project —
 * no client-side geo filtering here.
 */
export async function getRegionFacilities(region: {
  id: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}): Promise<RegionFacility[]> {
  // `regionId` filters on the facility's STORED city/neighbourhood, which is
  // what the region actually owns. Deliberately not the browser's circle test:
  // that answers a different question ("do the coordinates fall inside?") and
  // disagrees with the database — a facility can sit outside the drawn circle
  // and still belong to the city, or have no coordinates at all yet still be
  // filed under it. For "the facilities in this region", the stored assignment
  // is the honest answer.
  const res = await apiClient.get(FACILITIES_PATH, {
    params: { regionId: region.id, pageSize: WORKING_SET },
  });
  return unwrapList<FacilityDto>(res.data, ['facilities']).map(toFacility).map(toRegionFacility);
}
