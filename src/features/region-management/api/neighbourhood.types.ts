/**
 * Neighbourhoods — the second level of the geography the backend has always
 * had and the dashboard never showed.
 *
 * A city owns zero or more neighbourhoods, each with its own geo circle nested
 * INSIDE the city's. The backend derives the parent from the geometry
 * (`ST_Contains`), so a neighbourhood is never assigned to a city by id — it is
 * placed on the map and the city follows. A circle that does not fall entirely
 * within some city is rejected with ERR_NEIGHBOURHOOD_OUTSIDE_BOUNDS.
 */

export interface Neighbourhood {
  id: string;
  /** The owning city — resolved server-side from the geometry, never chosen. */
  cityId: string;
  cityName: string;
  name: string;
  centerLat: number;
  centerLng: number;
  /** Kilometres. The wire carries `radius_meters`. */
  radiusKm: number;
  isActive: boolean;
  createdAt?: string;
}

/**
 * Wire shape. Radius is METRES here and kilometres everywhere in the UI.
 *
 * The parent city arrives in TWO different shapes depending on the endpoint:
 * the list returns it flat (`city_id` / `city_name`), while detail, create and
 * update nest it (`city: { id, name }`). Both are read below.
 */
export interface NeighbourhoodDto {
  id?: string;
  city_id?: string;
  city_name?: string;
  city?: { id?: string; name?: string };
  name?: string;
  center_lat?: number | string | null;
  center_lng?: number | string | null;
  radius_meters?: number | string | null;
  is_active?: boolean;
  created_at?: string;
}

/** First finite number among the candidates, else NaN (never a silent 0). */
function num(...values: Array<number | string | null | undefined>): number {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return Number.NaN;
}

export function toNeighbourhood(dto: NeighbourhoodDto): Neighbourhood {
  const meters = num(dto.radius_meters);
  return {
    id: String(dto.id ?? ''),
    cityId: String(dto.city_id ?? dto.city?.id ?? ''),
    cityName: dto.city_name ?? dto.city?.name ?? '',
    name: dto.name ?? '',
    centerLat: num(dto.center_lat),
    centerLng: num(dto.center_lng),
    radiusKm: Number.isFinite(meters) ? meters / 1000 : Number.NaN,
    isActive: dto.is_active !== false,
    createdAt: dto.created_at,
  };
}

/**
 * Create/update input. There is deliberately no `cityId`: the backend refuses
 * to take one and works the parent out from where the circle sits.
 */
export interface NeighbourhoodInput {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}
