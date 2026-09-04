import { filterPaginate } from '@shared/lib/paginate';
import { EMPTY_DATE_RANGE, resolveDateRange, type DateRangeValue } from '@ui';
import { AUDIT_PAGE_SIZE } from './audit.types';
import type { AuditEntry, AuditListParams, AuditListResult } from './audit.types';

/**
 * The ONE filter/sort/paginate pipeline for the audit log, shared by the real
 * and the mock source.
 *
 * There is no scope gate here, unlike every other list in the dashboard: the log
 * is SUPER-ADMIN ONLY (AUD2), so "what may I see" is answered by the route guard
 * rather than by a per-row region check. A regional admin never gets this far.
 */

/**
 * FR-ADM-AUDIT-006 — "فلتر التاريخ يحوّل اليوم المحلي إلى بداية/نهاية بالتوقيت
 * العالمي UTC".
 *
 * The shared `resolveDateRange` parses a `YYYY-MM-DD` bound with `Date.parse`,
 * which the spec defines as UTC midnight for the date-only form. For an audit
 * trail that is the wrong day: an admin in UTC+3 who picks "20 July" means their
 * own 20 July, so an entry stamped 2026-07-20T22:00Z (01:00 local on the 21st)
 * must fall OUTSIDE it.
 *
 * This resolves the custom form against the viewer's local day and defers to the
 * shared helper for every preset. The shared helper is deliberately left alone —
 * four shipped features already depend on its current behaviour, and silently
 * changing their filtering is not this module's business.
 */
export function resolveLocalDayRange(
  value: DateRangeValue,
  nowMs: number,
): { fromMs: number | null; toMs: number | null } {
  if (value.preset !== 'custom') return resolveDateRange(value, nowMs);

  return {
    fromMs: value.from ? startOfLocalDay(value.from) : null,
    // The `to` day is inclusive: it ends at 23:59:59.999 local.
    toMs: value.to ? startOfLocalDay(value.to) + 86_400_000 - 1 : null,
  };
}

/** Local midnight for a `YYYY-MM-DD` string, as an epoch millisecond value. */
function startOfLocalDay(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  // The Date(y, m, d) constructor is local-time by definition — which is exactly
  // the semantic `Date.parse('YYYY-MM-DD')` does NOT give.
  return new Date(year, (month ?? 1) - 1, day ?? 1).getTime();
}

/**
 * AUD6 — the action / entity-type options, taken from what the log ACTUALLY
 * contains. Computed over the whole collection, never a filtered subset, so the
 * value you just selected cannot disappear from the dropdown.
 */
export function collectAuditOptions(all: AuditEntry[]): {
  availableActions: string[];
  availableEntityTypes: string[];
} {
  const actions = new Set<string>();
  const entityTypes = new Set<string>();
  for (const entry of all) {
    if (entry.action) actions.add(entry.action);
    if (entry.entityType) entityTypes.add(entry.entityType);
  }
  return {
    availableActions: [...actions].sort(),
    availableEntityTypes: [...entityTypes].sort(),
  };
}

export function filterAndPaginateAudit(
  all: AuditEntry[],
  params: AuditListParams,
  nowMs = Date.now(),
): AuditListResult {
  let items = all;

  // AUD6 — "entity history". Applied first and on its own axis: it is the one
  // filter that answers "everything that ever happened to THIS record".
  if (params.entityId) {
    const target = params.entityId.trim().toLowerCase();
    items = items.filter((entry) => (entry.entityId ?? '').toLowerCase() === target);
  }

  // FR-ADM-AUDIT-006 — free text over the ACTOR only (name or email). It is
  // deliberately not a search over snapshots: matching a value inside `before`
  // would surface entries whose actor has nothing to do with the query.
  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (entry) =>
        (entry.actor.name?.toLowerCase().includes(q) ?? false) ||
        (entry.actor.email?.toLowerCase().includes(q) ?? false),
    );
  }

  if (params.action && params.action !== 'all') {
    items = items.filter((entry) => entry.action === params.action);
  }

  if (params.entityType && params.entityType !== 'all') {
    items = items.filter((entry) => entry.entityType === params.entityType);
  }

  const range = resolveLocalDayRange(params.dateRange ?? EMPTY_DATE_RANGE, nowMs);
  if (range.fromMs !== null || range.toMs !== null) {
    items = items.filter((entry) => {
      const at = Date.parse(entry.createdAt);
      if (range.fromMs !== null && at < range.fromMs) return false;
      if (range.toMs !== null && at > range.toMs) return false;
      return true;
    });
  }

  // Newest first, always. An audit trail has exactly one meaningful order, and
  // offering a re-sort would only let an investigator lose their place.
  items = [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  // Clamp the page so filtering never strands the admin past the end.
  const pageSize = params.pageSize ?? AUDIT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(params.page ?? 1, 1), pageCount);

  return {
    ...filterPaginate(items, { page, pageSize }),
    ...collectAuditOptions(all),
  };
}

/**
 * The rows an export should contain: everything matching the CURRENT filters
 * (AUD3), capped at `limit` and still newest-first.
 *
 * Reuses the pipeline above with one huge page rather than re-implementing the
 * predicates, so an export can never disagree with what is on screen.
 */
export function selectAuditForExport(
  all: AuditEntry[],
  params: AuditListParams,
  limit: number,
  nowMs = Date.now(),
): AuditEntry[] {
  return filterAndPaginateAudit(all, { ...params, page: 1, pageSize: limit }, nowMs).items;
}
