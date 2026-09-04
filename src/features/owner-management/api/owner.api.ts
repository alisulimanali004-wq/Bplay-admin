import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList, readPageMeta } from '@shared/types/api';
import { DEFAULT_PAGE_SIZE } from '@shared/lib/paginate';
import {
  toOwner,
  type CreatedOwner,
  type CreateOwnerInput,
  type EditOwnerInput,
  type Owner,
  type OwnerAction,
  type OwnerDocAction,
  type OwnerDocType,
  type OwnerDto,
  type OwnerListParams,
  type OwnerListResult,
  type OwnerStats,
} from './owner.types';

const BASE = '/admin/owners-management';
const OWNERS_PATH = `${BASE}/owners`;

/** Raw KPI payload from `/owners/stats` (mutually exclusive buckets). */
interface OwnerStatsDto {
  total?: number;
  under_review?: number;
  active?: number;
  rejected?: number;
  suspend?: number;
  block?: number;
}

/**
 * The querystring rejects unknown keys and requires `q` to be non-empty, so a
 * blank search box must send nothing rather than `q=`.
 */
function toQuery(params: OwnerListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page && params.page > 0 ? params.page : 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  };

  const q = params.q?.trim();
  if (q) query.q = q;
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.facilities && params.facilities !== 'all') query.facilities = params.facilities;
  if (params.joined && params.joined !== 'all') query.joined = params.joined;

  return query;
}

/**
 * Search, filters and pagination all run server-side — re-filtering the page
 * client-side would drop rows from an already-narrowed slice and report a total
 * that only describes the current page.
 */
export async function getOwners(params: OwnerListParams): Promise<OwnerListResult> {
  const query = toQuery(params);
  const res = await apiClient.get(OWNERS_PATH, { params: query });

  const items = unwrapList<OwnerDto>(res.data, ['owners']).map(toOwner);
  // `readPageMeta` is the shared version of what this function used to do by
  // hand — this slice was one of only two reading server pagination correctly,
  // so its logic became the helper the rest of the dashboard now follows.
  return readPageMeta(res.data, items, {
    page: Number(query.page),
    pageSize: Number(query.pageSize ?? DEFAULT_PAGE_SIZE),
  });
}

export async function getOwnerById(id: string): Promise<Owner> {
  const res = await apiClient.get(`${OWNERS_PATH}/${id}`);
  return toOwner(unwrap<OwnerDto>(res.data));
}

export async function getOwnerStats(): Promise<OwnerStats> {
  const res = await apiClient.get(`${OWNERS_PATH}/stats`);
  const dto = unwrap<OwnerStatsDto>(res.data);
  return {
    total: dto.total ?? 0,
    underReview: dto.under_review ?? 0,
    active: dto.active ?? 0,
    rejected: dto.rejected ?? 0,
    suspended: dto.suspend ?? 0,
    blocked: dto.block ?? 0,
  };
}

/**
 * approve / reject / suspend / activate / block / unblock.
 * `reason` is required by the backend for reject, suspend and block; an empty
 * string would fail its minLength, so it is omitted rather than sent blank.
 */
export async function updateOwnerStatus(
  id: string,
  action: OwnerAction,
  reason?: string,
): Promise<void> {
  const trimmed = reason?.trim();
  await apiClient.patch(`${OWNERS_PATH}/${id}/status`, {
    action,
    ...(trimmed ? { reason: trimmed } : {}),
  });
}

/** The UI says accept/reject; the wire enum is approved/rejected. */
export async function reviewOwnerDocument(
  id: string,
  documentId: string,
  action: OwnerDocAction,
  reason?: string,
): Promise<void> {
  const trimmed = reason?.trim();
  await apiClient.patch(`${OWNERS_PATH}/${id}/documents/${documentId}`, {
    action: action === 'accept' ? 'approved' : 'rejected',
    ...(trimmed ? { reason: trimmed } : {}),
  });
}

/**
 * Upload a verification document on the owner's behalf.
 *
 * Multipart, not JSON: the file rides alongside a `docType` field.
 *
 * The Content-Type is explicitly cleared to `undefined`. Not setting it is NOT
 * enough — `apiClient` declares `'Content-Type': 'application/json'` as an
 * INSTANCE-LEVEL default, and axios applies that to every request including this
 * one, so the browser never got to compute the multipart boundary. The server's
 * multipart parser then rejected the body outright ("the request is not
 * multipart"), and no admin could add a document for an owner.
 *
 * `undefined` (not a literal string) is what makes axios drop the header and
 * derive `multipart/form-data; boundary=…` from the FormData itself.
 *
 * The document lands as `pending`, exactly like an owner's own upload. Adding a
 * document is not approving it — that stays a separate review decision.
 */
export async function uploadOwnerDocument(
  id: string,
  docType: OwnerDocType,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.append('docType', docType);
  form.append('file', file);
  await apiClient.post(`${OWNERS_PATH}/${id}/documents`, form, {
    headers: { 'Content-Type': undefined },
    // Uploads are slower than the 15s default the JSON calls use.
    timeout: 60_000,
  });
}

export async function createOwner(input: CreateOwnerInput): Promise<CreatedOwner> {
  const address = input.address?.trim();
  // The body rejects unknown keys — send exactly what createOwnerByAdminSchema declares.
  const res = await apiClient.post(OWNERS_PATH, {
    full_name: input.name.trim(),
    email: input.email.trim(),
    phone: `963${input.phone}`,
    national_id: input.nationalId.trim(),
    ...(address ? { address } : {}),
  });

  const data = unwrap<OwnerDto & { temporary_password?: string }>(res.data);
  return { owner: toOwner(data), tempPassword: data.temporary_password ?? '' };
}

/**
 * Edit an owner's profile details — `PUT /owners/{id}`.
 *
 * Only name and address; the endpoint refuses email/phone/national_id outright
 * (ERR_FIELD_NOT_EDITABLE) rather than ignoring them, so they are not sent.
 *
 * An empty address is sent as `null` — meaning "clear it" — while an untouched
 * field is simply omitted.
 */
export async function updateOwner(id: string, input: EditOwnerInput): Promise<void> {
  const address = input.address?.trim();
  await apiClient.put(`${OWNERS_PATH}/${id}`, {
    full_name: input.name.trim(),
    address: address ? address : null,
  });
}
