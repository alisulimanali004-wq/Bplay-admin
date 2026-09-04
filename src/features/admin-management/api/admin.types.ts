export type AdminStatus = 'active' | 'suspended';

/**
 * An admin's oversight tier (FR: general vs region-scoped).
 * - `general`  — platform-wide oversight (like a super_admin but with fewer
 *   powers, e.g. cannot create other admins). NOT tied to any region.
 * - `regional` — scoped to one or more regions they manage.
 * The platform owner (super_admin) is a separate top account and is not
 * created or listed here.
 */
export type AdminScope = 'general' | 'regional';

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  status: AdminStatus;
  isActive: boolean;
  /** Oversight tier — general (platform-wide) or regional (region-scoped). */
  scope: AdminScope;
  /** Syrian phone in canonical form `963XXXXXXXXX` (empty when unknown). */
  phone: string;
  /** Syrian national number — exactly 11 digits (empty when unknown). */
  nationalId: string;
  /**
   * Profile photo URL; `undefined` renders an initials fallback. The admin
   * edits this themselves from their own profile — it is VIEW-ONLY here.
   */
  photoUrl?: string;
  /** Soft-deleted: hidden from lists/scope by default, restorable. */
  isDeleted: boolean;
  /**
   * Regions this admin manages. DERIVED at read time by inverting the region
   * store (the region owns the many-to-many link via `region.assignedAdminIds`).
   * Never persisted on the admin — the mock hydrates it on every read and the
   * real backend returns it from the join; defaults to `[]` otherwise.
   */
  assignedRegionIds: string[];
  assignedRegionNames: string[];
  /**
   * Neighbourhood-level scope — the finer half of the same grant.
   *
   * `included` NARROWS: the admin sees only these neighbourhoods.
   * `excluded` SUBTRACTS: the admin sees the whole city EXCEPT these.
   *
   * The backend resolves the two with a precedence chain (exclusion wins, then
   * a direct neighbourhood grant, then the city). Both are empty for an admin
   * scoped at city level, which is the common case.
   */
  includedNeighbourhoodIds: string[];
  includedNeighbourhoodNames: string[];
  excludedNeighbourhoodIds: string[];
  excludedNeighbourhoodNames: string[];
  createdAt?: string;
}

/** The raw backend shape (field names vary — normalised by toAdmin). */
export interface AdminDto {
  id?: string | number;
  _id?: string;
  admin_id?: string | number;
  name?: string;
  full_name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  isActive?: boolean;
  status?: string;
  scope?: string;
  admin_scope?: string;
  phone?: string;
  phone_number?: string;
  mobile?: string;
  national_id?: string;
  nationalId?: string;
  national_number?: string;
  photo_url?: string;
  photoUrl?: string;
  avatar_url?: string;
  is_deleted?: boolean;
  isDeleted?: boolean;
  deleted_at?: string | null;
  assigned_region_ids?: Array<string | number>;
  assignedRegionIds?: string[];
  assigned_region_names?: string[];
  assignedRegionNames?: string[];
  created_at?: string;
  createdAt?: string;
  /**
   * The create endpoint returns the new row keyed `userId`, not `id` — without
   * this a freshly created admin was mapped to `id: ''`.
   */
  userId?: string;
  /**
   * Region scope as the API actually expresses it: `{ id, name }` city rows.
   * There is no `scope` field on the wire — an admin with cities is regional,
   * one with none is general.
   */
  cities?: Array<{ id: string; name?: string }>;
  /**
   * Neighbourhood scope. `is_excluded` splits one array into two very different
   * meanings — a granted neighbourhood vs a carve-out from the city — so it must
   * never be flattened away.
   */
  neighborhoods?: Array<{ id: string; name?: string; is_excluded?: boolean }>;
}

function firstString(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return '';
}

export function toAdmin(dto: AdminDto): Admin {
  const isActive =
    typeof dto.is_active === 'boolean'
      ? dto.is_active
      : typeof dto.isActive === 'boolean'
        ? dto.isActive
        : dto.status
          ? dto.status.toLowerCase() === 'active'
          : true;
  // Regions come back as `cities: [{ id, name }]`. The older flat aliases are
  // kept ahead of it so mocks and any future shape still map.
  const cityRows = Array.isArray(dto.cities) ? dto.cities : [];
  const regionIds = (
    dto.assigned_region_ids ??
    dto.assignedRegionIds ??
    cityRows.map((city) => city.id)
  ).map(String);
  const regionNames =
    dto.assigned_region_names ??
    dto.assignedRegionNames ??
    cityRows.map((city) => city.name ?? '').filter(Boolean);
  // Scope is not a stored field: an admin holding cities is regional, one
  // holding none is general. An explicit `scope` still wins when present.
  const scopeRaw = (dto.scope ?? dto.admin_scope ?? '').toLowerCase();
  const scope: AdminScope =
    scopeRaw === 'general' || (scopeRaw === '' && regionIds.length === 0) ? 'general' : 'regional';

  // Split the single `neighborhoods` array on is_excluded: a granted
  // neighbourhood narrows the scope, an excluded one subtracts from the city.
  const hoodRows = Array.isArray(dto.neighborhoods) ? dto.neighborhoods : [];
  const included = hoodRows.filter((row) => row.is_excluded !== true);
  const excluded = hoodRows.filter((row) => row.is_excluded === true);

  return {
    id: String(dto.id ?? dto._id ?? dto.admin_id ?? dto.userId ?? ''),
    name: dto.name ?? dto.full_name ?? '',
    email: dto.email ?? '',
    role: dto.role ?? 'admin',
    isActive,
    status: isActive ? 'active' : 'suspended',
    scope,
    phone: firstString(dto.phone, dto.phone_number, dto.mobile),
    nationalId: firstString(dto.national_id, dto.nationalId, dto.national_number),
    photoUrl: dto.photo_url ?? dto.photoUrl ?? dto.avatar_url,
    isDeleted: dto.is_deleted ?? dto.isDeleted ?? (dto.deleted_at != null ? true : false),
    assignedRegionIds: regionIds,
    assignedRegionNames: regionNames,
    includedNeighbourhoodIds: included.map((row) => String(row.id)),
    includedNeighbourhoodNames: included.map((row) => row.name ?? '').filter(Boolean),
    excludedNeighbourhoodIds: excluded.map((row) => String(row.id)),
    excludedNeighbourhoodNames: excluded.map((row) => row.name ?? '').filter(Boolean),
    createdAt: dto.createdAt ?? dto.created_at,
  };
}

export interface AdminListParams {
  q?: string;
  status?: 'all' | AdminStatus;
  /** Filter by oversight tier. */
  scope?: 'all' | AdminScope;
  /** Filter regional admins by whether they hold any region. */
  assignment?: 'all' | 'assigned' | 'unassigned';
  page?: number;
  pageSize?: number;
}

export interface AdminListResult {
  items: Admin[];
  total: number;
  page: number;
  pageCount: number;
}

/** Platform-wide admin counts for the list KPI row. */
export interface AdminStats {
  total: number;
  active: number;
  /** Region-scoped admins. */
  regional: number;
  /** Region admins holding no region yet (needs attention). */
  unassigned: number;
}

export interface CreateAdminInput {
  name: string;
  email: string;
  /** The initial password we issue — restorable later via reset-to-original. */
  password: string;
  /** 9-digit local part (e.g. 988324051); the api prepends the 963 country code. */
  phone: string;
  nationalId: string;
  scope: AdminScope;
  /** Regions to assign — used only when scope === 'regional'. */
  regionIds: string[];
  /** Optional neighbourhood-level refinement of the same scope. */
  includedNeighbourhoodIds?: string[];
  excludedNeighbourhoodIds?: string[];
}

export interface UpdateAdminInput {
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  scope: AdminScope;
  regionIds: string[];
  includedNeighbourhoodIds?: string[];
  excludedNeighbourhoodIds?: string[];
}

/** Many-to-many region assignment for an admin (replaces the whole set). */
export interface AssignRegionsInput {
  regionIds: string[];
}

/** Promote/demote an admin's oversight tier. */
export interface AdminScopeInput {
  scope: AdminScope;
}
