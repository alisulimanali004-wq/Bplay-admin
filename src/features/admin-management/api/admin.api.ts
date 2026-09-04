import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import { filterAndPaginateAdmins } from './admin.filter';
import {
  toAdmin,
  type Admin,
  type AdminDto,
  type AdminListParams,
  type AdminListResult,
  type AdminScope,
  type AdminStats,
  type CreateAdminInput,
  type UpdateAdminInput,
} from './admin.types';

const PATH = '/admin/admin-management';

/** Bounded working set for client-side filtering — an explicit, visible cap. */
const WORKING_SET = 2000;
/**
 * PAGINATION: client-side, and applied exactly ONCE.
 *
 * The local pipeline still filters and sorts after the fetch, and either can drop rows —
 * so paginating on the server first would return "page 2 of N" and then filter
 * it down, leaving the count, the page boundaries and the rows disagreeing.
 *
 * The bug this replaces was paginating TWICE: page/pageSize were forwarded to
 * the server AND the returned page was sliced again locally, so page 2 asked
 * the server for rows 6-10 and then sliced that 5-element array from index 5 —
 * a blank table.
 *
 * Page params are therefore stripped from the request and a bounded working set
 * is fetched instead.
 */
export async function getAdmins(params: AdminListParams): Promise<AdminListResult> {
  // FILTERS ARE NOT SENT. The UI's filter state (`q`, `status`, `scope`,
  // `assignment`) uses names the endpoint does not declare — its querystring
  // takes `search` and `is_active` — and it runs AJV with
  // `additionalProperties: false` + `removeAdditional: 'all'`, so those keys
  // were stripped server-side and silently ignored. Spreading them produced a
  // request that looked filtered and was not: `?q=nomatch` still returned every
  // admin.
  //
  // They are omitted rather than translated because `filterAndPaginateAdmins`
  // below already applies all four locally over the full working set — the same
  // reason pagination is client-side. Sending them too would filter twice, and
  // the server's narrowed page would disagree with the local count.
  const res = await apiClient.get(PATH, { params: { pageSize: WORKING_SET } });
  const all = unwrapList<AdminDto>(res.data, ['admins']).map(toAdmin);
  return filterAndPaginateAdmins(all, params);
}

/** Platform-wide admin counts — derived client-side until a stats endpoint exists. */
export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiClient.get(PATH, { params: { pageSize: 1000 } });
  const live = unwrapList<AdminDto>(res.data, ['admins'])
    .map(toAdmin)
    .filter((admin) => !admin.isDeleted);
  return {
    total: live.length,
    active: live.filter((admin) => admin.status === 'active').length,
    regional: live.filter((admin) => admin.scope === 'regional').length,
    unassigned: live.filter(
      (admin) => admin.scope === 'regional' && admin.assignedRegionIds.length === 0,
    ).length,
  };
}

/** Fetch a single admin by id (may be soft-deleted — the detail page still shows it). */
export async function getAdminById(id: string): Promise<Admin> {
  const res = await apiClient.get(`${PATH}/${id}`);
  return toAdmin(unwrap<AdminDto>(res.data));
}

/**
 * The wire contract for create and update.
 *
 * Two things this must get right, both of which used to be wrong:
 *
 * 1. `role` is REQUIRED on create. It was never sent, so every "add admin"
 *    attempt failed validation with `must have required property 'role'` and
 *    no admin could be created from the dashboard at all. The enum is
 *    `['admin']` — a super_admin is not created through this endpoint.
 * 2. Scope is expressed as `cities` / `neighborhoods`, NOT `scope` +
 *    `region_ids`. A "region" in this dashboard IS a city (`/admin/regions`
 *    returns rows from the `cities` table), so the selected region ids go to
 *    `cities`. A general-scope admin simply gets an empty set.
 *
 * The second one was the dangerous half: the server runs AJV with
 * `removeAdditional: 'all'`, so `scope` and `region_ids` were SILENTLY DROPPED
 * on update rather than rejected. The request returned 200, the UI reported
 * success, and the admin's regions were never changed.
 */
function toAdminScopePayload(
  scope: AdminScope,
  regionIds: string[],
  includedNeighbourhoodIds: string[] = [],
  excludedNeighbourhoodIds: string[] = [],
) {
  // A general admin holds nothing at either level. Sending the empty arrays
  // rather than omitting them matters: the endpoint REPLACES each set, so
  // omitting one would silently leave a stale neighbourhood grant in place
  // after the admin was demoted.
  const regional = scope === 'regional';
  return {
    cities: regional ? regionIds : [],
    neighborhoods: regional ? includedNeighbourhoodIds : [],
    excluded_neighborhoods: regional ? excludedNeighbourhoodIds : [],
  };
}

export async function createAdmin(input: CreateAdminInput): Promise<Admin> {
  const res = await apiClient.post(PATH, {
    name: input.name,
    email: input.email,
    role: 'admin',
    password: input.password,
    phone: `963${input.phone}`,
    national_id: input.nationalId,
    ...toAdminScopePayload(
      input.scope,
      input.regionIds,
      input.includedNeighbourhoodIds,
      input.excludedNeighbourhoodIds,
    ),
  });
  return toAdmin(unwrap<AdminDto>(res.data));
}

export async function updateAdmin(id: string, input: UpdateAdminInput): Promise<Admin> {
  const res = await apiClient.patch(`${PATH}/${id}`, {
    name: input.name,
    email: input.email,
    phone: `963${input.phone}`,
    national_id: input.nationalId,
    ...toAdminScopePayload(
      input.scope,
      input.regionIds,
      input.includedNeighbourhoodIds,
      input.excludedNeighbourhoodIds,
    ),
  });
  return toAdmin(unwrap<AdminDto>(res.data));
}

export async function toggleAdminActive(id: string, isActive: boolean): Promise<void> {
  await apiClient.post(`${PATH}/is_active/${id}`, { is_active: isActive });
}

/**
 * Promote/demote the oversight tier.
 *
 * There is no `/scope/:id` route — scope is not a stored field but a
 * consequence of the city set: an admin with no cities is general, one with
 * cities is regional. Demoting to general therefore clears the set. Promoting
 * to regional cannot invent a selection, so it is a no-op here and the regions
 * are chosen through `assignRegions`.
 */
export async function setAdminScope(id: string, scope: AdminScope): Promise<void> {
  if (scope === 'regional') return;
  await apiClient.patch(`${PATH}/${id}`, { cities: [] });
}

/**
 * Replace the whole region set for an admin (many-to-many).
 *
 * `/assign-regions/:id` does not exist; the update endpoint takes the full
 * `cities` set and replaces it, which is the same semantics.
 */
export async function assignRegions(
  id: string,
  regionIds: string[],
  neighbourhoods?: { includedIds: string[]; excludedIds: string[] },
): Promise<void> {
  // Only the keys being changed are sent. The endpoint replaces each set it
  // receives, so sending `neighborhoods: []` here by default would silently
  // erase a neighbourhood-level grant every time someone edited the cities.
  await apiClient.patch(`${PATH}/${id}`, {
    cities: regionIds,
    ...(neighbourhoods
      ? {
          neighborhoods: neighbourhoods.includedIds,
          excluded_neighborhoods: neighbourhoods.excludedIds,
        }
      : {}),
  });
}

/**
 * Set an admin's password to an explicit new value.
 *
 * The endpoint REQUIRES a `password` in the body — it does not generate one and
 * does not email a link. Calling it with an empty body (as this used to) fails
 * validation with "must be object", so the reset silently never worked.
 *
 * The caller supplies the value and is responsible for showing it once; the
 * server never echoes a password back, so nothing is returned.
 */
export async function resetAdminPassword(id: string, password: string): Promise<string> {
  await apiClient.post(`${PATH}/reset-password/${id}`, { password });
  return '';
}

/**
 * Deletion is a SOFT delete: the backend stamps `users.deleted_at` and revokes
 * the account's sessions. The row, its profile, its region grants and its audit
 * history all survive, and `restoreAdmin` puts it back.
 *
 * A deleted admin drops out of the default listing but its detail page still
 * resolves (with `isDeleted` true), which is how it gets reviewed and restored.
 *
 * One consequence worth surfacing in the UI: the account keeps its email and
 * phone, so creating a NEW admin at the same address fails with
 * ERR_EMAIL_EXISTS until this one is restored.
 */
export async function deleteAdmin(id: string): Promise<void> {
  await apiClient.delete(`${PATH}/${id}`);
}

/** Undo a soft delete. Gated on the same permission as the delete itself. */
export async function restoreAdmin(id: string): Promise<void> {
  await apiClient.post(`${PATH}/restore/${id}`);
}

