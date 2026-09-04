import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import {
  toNeighbourhood,
  type Neighbourhood,
  type NeighbourhoodDto,
  type NeighbourhoodInput,
} from './neighbourhood.types';

/**
 * NEIGHBOURHOODS — the sub-city level of the region hierarchy.
 *
 *   GET    /admin/regions/neighborhoods            list (all cities)
 *   GET    /admin/regions/neighborhoods/{id}       one
 *   POST   /admin/regions/neighborhoods            create
 *   PATCH  /admin/regions/neighborhoods/{id}       update
 *   POST   /admin/regions/neighborhoods/is_active/{id}
 *   DELETE /admin/regions/neighborhoods/{id}
 *
 * Note the American spelling on the wire ("neighborhoods") against the British
 * spelling in the database ("neighbourhoods"). Both appear in this codebase;
 * the URL is the one that matters here.
 */
const PATH = '/admin/regions/neighborhoods';

/** Metres on the wire, kilometres in the UI. */
const M_PER_KM = 1000;

/**
 * The wire form of a geo circle — identical to the city contract:
 * `center` is a PAIR IN [lng, lat] ORDER and the radius is in METRES.
 * Both conversions fail silently if missed, so they live in one place.
 */
function toCirclePayload(input: NeighbourhoodInput) {
  return {
    name: input.name,
    center: [input.centerLng, input.centerLat],
    radiusMeters: input.radiusKm * M_PER_KM,
  };
}

/**
 * The endpoint's hard maximum. Asking for more is a 400, not a silent clamp —
 * requesting `limit=1000` made every page that loads neighbourhoods fail
 * validation on refresh.
 */
const MAX_LIMIT = 100;

/**
 * Every neighbourhood, across all cities.
 *
 * Pages until the reported total is reached rather than assuming one request
 * covers it. The set is small today (single digits) but it grows with every
 * area an operator draws, and a silent truncation at 100 would quietly drop
 * neighbourhoods out of the filters and scope pickers that read this.
 */
export async function getNeighbourhoods(): Promise<Neighbourhood[]> {
  const all: NeighbourhoodDto[] = [];
  let page = 1;

  for (;;) {
    const res = await apiClient.get(PATH, { params: { page, limit: MAX_LIMIT } });
    const rows = unwrapList<NeighbourhoodDto>(res.data, ['neighbourhoods', 'neighborhoods']);
    all.push(...rows);

    const total = Number(res.data?.meta?.total);
    // Stop on a short page as well as on the total: if `meta` is ever absent the
    // loop must still terminate rather than spin.
    if (rows.length < MAX_LIMIT || !Number.isFinite(total) || all.length >= total) break;
    page += 1;
  }

  return all.map(toNeighbourhood);
}

/** The neighbourhoods belonging to one city. */
export async function getNeighbourhoodsByCity(cityId: string): Promise<Neighbourhood[]> {
  const all = await getNeighbourhoods();
  return all.filter((neighbourhood) => neighbourhood.cityId === cityId);
}

export async function getNeighbourhoodById(id: string): Promise<Neighbourhood> {
  const res = await apiClient.get(`${PATH}/${id}`);
  return toNeighbourhood(unwrap<NeighbourhoodDto>(res.data));
}

/**
 * Create a neighbourhood.
 *
 * The parent city is NOT passed — the server resolves it by finding the city
 * whose boundary contains this circle, and rejects the request outright when
 * none does (ERR_NEIGHBOURHOOD_OUTSIDE_BOUNDS). So the circle must sit fully
 * inside a city, not merely near one.
 */
export async function createNeighbourhood(input: NeighbourhoodInput): Promise<Neighbourhood> {
  const res = await apiClient.post(PATH, toCirclePayload(input));
  return toNeighbourhood(unwrap<NeighbourhoodDto>(res.data));
}

export async function updateNeighbourhood(
  id: string,
  input: NeighbourhoodInput,
): Promise<Neighbourhood> {
  const res = await apiClient.patch(`${PATH}/${id}`, toCirclePayload(input));
  return toNeighbourhood(unwrap<NeighbourhoodDto>(res.data));
}

export async function toggleNeighbourhoodActive(id: string, isActive: boolean): Promise<void> {
  await apiClient.post(`${PATH}/is_active/${id}`, { is_active: isActive });
}

/**
 * Unlike cities, neighbourhoods DO have a delete route. It is permanent —
 * deactivating is the reversible option and should be preferred when the area
 * is merely dormant.
 */
export async function deleteNeighbourhood(id: string): Promise<void> {
  await apiClient.delete(`${PATH}/${id}`);
}
