/**
 * Region Management — domain types.
 *
 * Per admin SRS 05 (RG1/RG7) a region is a GEOGRAPHIC CIRCLE: a name + a map
 * center (lat/lng) + a radius in km. Entity (facility/player) membership is
 * computed from coordinates (distance ≤ radius), never assigned by hand.
 * Assignment to admins is many-to-many (FR-ADM-REGION-007).
 */

export type RegionStatus = 'active' | 'inactive';

export interface Region {
  id: string;
  name: string;
  /** Circle center — the map picker writes these. */
  centerLat: number;
  centerLng: number;
  /** Radius in kilometres (> 0). */
  radiusKm: number;
  isActive: boolean;
  status: RegionStatus;
  /** Soft-deleted: hidden from lists/scope by default, restorable. */
  isDeleted: boolean;
  /** Admins managing this region (many-to-many, FR-007). */
  assignedAdminIds: string[];
  assignedAdminNames: string[];
  createdAt?: string;
}

/** Raw backend shape (snake_case, tolerant to alternate keys) — normalised by toRegion. */
export interface RegionDto {
  id?: string | number;
  _id?: string;
  region_id?: string | number;
  name?: string;
  center_lat?: number;
  centerLat?: number;
  lat?: number;
  center_lng?: number;
  centerLng?: number;
  lng?: number;
  radius_km?: number;
  radiusKm?: number;
  radius?: number;
  /** City detail returns the radius in METRES; the list returns radius_km. */
  radius_meters?: number;
  is_active?: boolean;
  isActive?: boolean;
  active?: boolean;
  status?: string;
  is_deleted?: boolean;
  isDeleted?: boolean;
  deleted_at?: string | null;
  assigned_admin_ids?: Array<string | number>;
  assignedAdminIds?: string[];
  assigned_admin_names?: string[];
  assignedAdminNames?: string[];
  created_at?: string;
  createdAt?: string;
}

function num(...values: Array<number | undefined>): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

/** Metres to kilometres, only when a usable metre value is present. */
function kmFromMeters(meters: number | undefined): number | undefined {
  return typeof meters === 'number' && Number.isFinite(meters) ? meters / 1000 : undefined;
}

export function toRegion(dto: RegionDto): Region {
  const isActive =
    typeof dto.is_active === 'boolean'
      ? dto.is_active
      : typeof dto.isActive === 'boolean'
        ? dto.isActive
        : typeof dto.active === 'boolean'
          ? dto.active
          : dto.status
            ? dto.status.toLowerCase() === 'active'
            : true;
  const adminIds = (dto.assigned_admin_ids ?? dto.assignedAdminIds ?? []).map(String);
  const adminNames = dto.assigned_admin_names ?? dto.assignedAdminNames ?? [];
  return {
    id: String(dto.id ?? dto._id ?? dto.region_id ?? ''),
    name: dto.name ?? '',
    centerLat: num(dto.center_lat, dto.centerLat, dto.lat),
    centerLng: num(dto.center_lng, dto.centerLng, dto.lng),
    radiusKm: num(dto.radius_km, dto.radiusKm, dto.radius, kmFromMeters(dto.radius_meters)),
    isActive,
    status: isActive ? 'active' : 'inactive',
    isDeleted:
      dto.is_deleted ?? dto.isDeleted ?? (dto.deleted_at != null ? true : false),
    assignedAdminIds: adminIds,
    assignedAdminNames: adminNames,
    createdAt: dto.createdAt ?? dto.created_at,
  };
}

export interface RegionListParams {
  q?: string;
  status?: 'all' | RegionStatus;
  /** Filter by whether the region has any admin assigned. */
  assignment?: 'all' | 'assigned' | 'unassigned';
  /** When true, list ONLY soft-deleted regions (the trash view); default hides them. */
  showDeleted?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RegionListResult {
  items: Region[];
  total: number;
  page: number;
  pageCount: number;
}

/** Platform-wide region counts for the list KPI row. */
export interface RegionStats {
  total: number;
  active: number;
  /** Live regions with no admin assigned (needs attention). */
  unassigned: number;
}

export interface CreateRegionInput {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

export interface UpdateRegionInput {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

/** Many-to-many admin assignment for a region (replaces the whole set). */
export interface AssignAdminsInput {
  adminIds: string[];
}
