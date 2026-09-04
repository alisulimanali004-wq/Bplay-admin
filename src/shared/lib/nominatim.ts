/**
 * OpenStreetMap Nominatim geocoding — free, no API key. Biased to Syria.
 * Fair-use: callers must debounce (≤ 1 request/second) and abort stale requests.
 */

export interface PlaceResult {
  lat: number;
  lng: number;
  label: string;
}

const BASE = 'https://nominatim.openstreetmap.org';

interface NominatimSearchRow {
  lat: string;
  lon: string;
  display_name: string;
}

/** Forward geocode a free-text query into candidate places (Syria-biased). */
export async function searchPlaces(
  query: string,
  lang: string,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const url = new URL(`${BASE}/search`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '6');
  url.searchParams.set('accept-language', lang);
  url.searchParams.set('countrycodes', 'sy');
  const res = await fetch(url.toString(), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('geocode_failed');
  const rows = (await res.json()) as NominatimSearchRow[];
  return rows
    .map((row) => ({ lat: Number(row.lat), lng: Number(row.lon), label: row.display_name }))
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
}

/** Reverse geocode a coordinate into a human-readable address (or null). */
export async function reverseGeocode(
  lat: number,
  lng: number,
  lang: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = new URL(`${BASE}/reverse`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('accept-language', lang);
  const res = await fetch(url.toString(), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? null;
}

/** Structured reverse-geocode result — the parts a location form auto-fills. */
export interface ReverseAddress {
  label: string;
  road?: string;
  city?: string;
  district?: string;
  /** Raw administrative area (governorate/state) for best-effort enum matching. */
  state?: string;
}

interface NominatimReverse {
  display_name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    county?: string;
  };
}

/**
 * Reverse geocode into structured address parts (road / city / district / state)
 * for auto-filling a location form. Returns null on failure so the caller keeps
 * whatever the user already typed.
 */
export async function reverseGeocodeAddress(
  lat: number,
  lng: number,
  lang: string,
  signal?: AbortSignal,
): Promise<ReverseAddress | null> {
  const url = new URL(`${BASE}/reverse`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('accept-language', lang);
  url.searchParams.set('addressdetails', '1');
  const res = await fetch(url.toString(), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimReverse;
  const address = data.address ?? {};
  return {
    label: data.display_name ?? '',
    road: address.road ?? address.pedestrian,
    city: address.city ?? address.town ?? address.village ?? address.municipality,
    district: address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district,
    state: address.state ?? address.county,
  };
}
