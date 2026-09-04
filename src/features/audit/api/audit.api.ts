import { apiClient } from '@lib/apiClient';
import { unwrapList } from '@shared/types/api';
import {
  filterAndPaginateAudit,
  resolveLocalDayRange,
  selectAuditForExport,
} from './audit.filter';
import { AUDIT_EXPORT_LIMIT, toAuditEntry } from './audit.types';
import type {
  AuditEntry,
  AuditEntryDto,
  AuditListParams,
  AuditListResult,
} from './audit.types';

/**
 * AUDIT — the live source (SRS module 04).
 *
 * ── BACKEND CONTRACT ──────────────────────────────────────────────────────────
 * The WRITE half already exists in bplay-backend: `writeAuditLog()` in
 * `src/modules/super-admin/audit.js` is called from the admin modules on their
 * state-changing operations, so the rows are being produced today
 * (FR-ADM-AUDIT-001).
 *
 * What has no route yet is READING them. These are the endpoints this slice is
 * written against:
 *
 *   GET /admin/audit-log            list → { items | logs: AuditEntryDto[] }
 *
 * Query parameters mirror `AuditListParams`: `q`, `action`, `entityType`,
 * `entityId`, `from`, `to`, `page`, `pageSize`. The response should also carry
 * the DISTINCT `action` and `entity_type` values present in the whole log, so
 * the filters stay populated from reality (AUD6) — until it does, they are
 * derived from the page that came back, which is why `collectAuditOptions` runs
 * over whatever this function received.
 *
 * There is deliberately NO write verb here, and there must never be one: the log
 * is append-only (AUD7 / FR-ADM-AUDIT-008). Retention policy, storage-level
 * immutability and SIEM export are V2.
 *
 * ── SECURITY OBLIGATIONS ON THE BACKEND ───────────────────────────────────────
 *   1. SUPER-ADMIN ONLY (AUD2). The route guard in this app is defence in depth;
 *      the server must reject a regional admin's token outright — the log names
 *      other admins' actions and is the one screen that must never leak sideways.
 *   2. Never expose a password hash, a token or a secret inside `before`/`after`;
 *      redact at write time, because a snapshot is permanent by design.
 *   3. Enforce the export ceiling server-side too — an unbounded `pageSize` is a
 *      trivial way to pull the entire trail in one request.
 */

const PATH = '/admin/audit-log';

/**
 * The audit log, filtered and paginated.
 *
 * NOTE: filtering runs through the shared pipeline after the fetch, exactly like
 * the other oversight lists in this dashboard, so the mock and the live source
 * behave identically. Once the endpoint paginates server-side, pass the params
 * through and drop the client pass — the shape returned here already matches.
 */
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
export async function getAuditLog(params: AuditListParams): Promise<AuditListResult> {
  const { page: _p, pageSize: _ps, ...rest } = params;
  const res = await apiClient.get(PATH, { params: { ...toQuery(rest), pageSize: WORKING_SET } });
  const all = unwrapList<AuditEntryDto>(res.data, ['logs', 'entries', 'items']).map(toAuditEntry);
  return filterAndPaginateAudit(all, params);
}

/**
 * FR-ADM-AUDIT-007 — the rows behind an export: the CURRENT filters, capped.
 * Requested in one page so the export reflects the whole filtered set rather
 * than the twenty rows on screen.
 */
export async function getAuditForExport(params: AuditListParams): Promise<AuditEntry[]> {
  const res = await apiClient.get(PATH, {
    params: { ...toQuery(params), page: 1, pageSize: AUDIT_EXPORT_LIMIT },
  });
  const all = unwrapList<AuditEntryDto>(res.data, ['logs', 'entries', 'items']).map(toAuditEntry);
  return selectAuditForExport(all, params, AUDIT_EXPORT_LIMIT);
}

/**
 * Flatten the UI's filter state into wire parameters.
 *
 * The date range is sent as ABSOLUTE ISO instants, resolved from the admin's own
 * local day (FR-ADM-AUDIT-006), rather than as a preset name — so the server
 * never has to guess the caller's timezone to answer "entries from 20 July".
 */
function toQuery(params: AuditListParams): Record<string, string | number | undefined> {
  const { dateRange, ...rest } = params;
  const range = dateRange
    ? resolveLocalDayRange(dateRange, Date.now())
    : { fromMs: null, toMs: null };

  return {
    ...rest,
    from: range.fromMs === null ? undefined : new Date(range.fromMs).toISOString(),
    to: range.toMs === null ? undefined : new Date(range.toMs).toISOString(),
  };
}
