/**
 * AUDIT (SRS module 04, FR-ADM-AUDIT-001..008) — the administrative audit trail:
 * "who did what, when, and from where" for every state-changing admin action.
 *
 * The governing decisions, straight from the SRS "قرارات الوحدة":
 *  - AUD1  the log is SHOWN in V1 — a list with search, filters and export, not
 *          just a background write;
 *  - AUD2  SUPER-ADMIN ONLY. A regional admin must never reach it: the log is a
 *          supervision tool aimed at admins;
 *  - AUD3  Excel export honours the CURRENT filters;
 *  - AUD4  every entry carries the actor's IP and device/browser;
 *  - AUD5  each action renders as a label + colour derived from the VERB and the
 *          entity — create is green, delete is red, everything else is neutral
 *          in V1;
 *  - AUD6  an "entity history" filter (everything that happened to one record)
 *          plus an action filter populated DYNAMICALLY from the values actually
 *          present in the log;
 *  - AUD7  APPEND-ONLY. There is no edit and no delete anywhere in this feature,
 *          and adding one would break the module's entire purpose.
 *
 * Reads are deliberately NOT logged (FR-ADM-AUDIT-001) — a log that records
 * every page view drowns the state changes it exists to surface.
 */

import type { BadgeVariant } from '@ui';

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/**
 * The verb half of an action. Kept separate from the entity so the label can be
 * composed ("create" + "facility" → "Create facility") instead of the backend
 * shipping a prose string per combination — which would not translate.
 *
 * This list is the KNOWN set; the wire may carry anything, and an unrecognised
 * verb renders as-is rather than breaking the row (FR-ADM-AUDIT-005).
 */
export type AuditVerb =
  | 'create'
  | 'update'
  | 'delete'
  | 'activate'
  | 'deactivate'
  | 'approve'
  | 'reject'
  | 'suspend'
  | 'restore'
  | 'block'
  | 'unblock'
  | 'assign'
  | 'reset_password'
  | 'login'
  | 'logout';

/** The record an action was performed on. Same tolerance for unknown values. */
export type AuditEntityType =
  | 'admin'
  | 'owner'
  | 'player'
  | 'facility'
  | 'region'
  | 'plan'
  | 'booking'
  | 'subscription'
  | 'post'
  | 'feedback'
  | 'conversation';

export const AUDIT_VERBS: AuditVerb[] = [
  'create',
  'update',
  'delete',
  'activate',
  'deactivate',
  'approve',
  'reject',
  'suspend',
  'restore',
  'block',
  'unblock',
  'assign',
  'reset_password',
  'login',
  'logout',
];

export const AUDIT_ENTITY_TYPES: AuditEntityType[] = [
  'admin',
  'owner',
  'player',
  'facility',
  'region',
  'plan',
  'booking',
  'subscription',
  'post',
  'feedback',
  'conversation',
];

/** FR-ADM-AUDIT-003 — "الصفحة 20 صفّاً". */
export const AUDIT_PAGE_SIZE = 20;

/**
 * FR-ADM-AUDIT-007 / AUDQ1 — the export ceiling. A filtered export beyond this
 * many rows is truncated and the UI says so, rather than freezing the tab while
 * SheetJS serialises an unbounded log.
 */
export const AUDIT_EXPORT_LIMIT = 5000;

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/**
 * Who performed the action.
 *
 * `id: null` means the platform itself acted (a cron, a system migration) and
 * renders as "System". A non-null id whose account no longer exists renders as
 * "Unknown user" — the entry survives the actor, which is the whole point of an
 * append-only trail (FR-ADM-AUDIT-003).
 */
export interface AuditActor {
  id: string | null;
  name?: string;
  email?: string;
  /** `super_admin` | `admin`, or absent for a system actor. */
  role?: string;
}

/**
 * A snapshot pair. Both sides are arbitrary field maps rather than a typed
 * shape: the log spans eleven entity types, and a union of all their fields
 * would have to change every time any other module adds a column.
 */
export type AuditSnapshot = Record<string, unknown>;

export interface AuditEntry {
  id: string;
  createdAt: string;
  actor: AuditActor;
  /** The verb. Unknown values are carried through verbatim. */
  action: string;
  entityType: string;
  /**
   * The affected record's id. `null` when the backend could not resolve one
   * (AUDQ2) — the UI then falls back to a label from the snapshot rather than
   * printing an empty cell.
   */
  entityId: string | null;
  /** Human label for the record ("Al-Baramkeh Sports Club"), when known. */
  entityLabel?: string;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
  /** FR-ADM-AUDIT-002. Already normalised server-side to drop the ::ffff: prefix. */
  ip?: string;
  /** The raw user-agent. Rendered verbatim — never parsed into a fake device name. */
  userAgent?: string;
}

export interface AuditListParams {
  /** Free text over the actor's name or email (FR-ADM-AUDIT-006). */
  q?: string;
  action?: 'all' | string;
  entityType?: 'all' | string;
  /** AUD6 — "entity history": every entry touching this one record. */
  entityId?: string;
  dateRange?: import('@ui').DateRangeValue;
  page?: number;
  pageSize?: number;
}

export interface AuditListResult {
  items: AuditEntry[];
  total: number;
  page: number;
  pageCount: number;
  /**
   * AUD6 — the action values actually PRESENT in the log, so the filter offers
   * what exists instead of a static list that drifts from reality. Computed over
   * the whole log, never the current page, or the option you filtered by would
   * vanish the moment you applied it.
   */
  availableActions: string[];
  availableEntityTypes: string[];
}

// ---------------------------------------------------------------------------
// Action label + colour (FR-ADM-AUDIT-005)
// ---------------------------------------------------------------------------

/**
 * The colour of an action.
 *
 * V1 is deliberately three-valued: create is green, delete is red, and
 * EVERYTHING else is neutral. The temptation is to tint approve/reject too, but
 * AUD5 fixes the palette here so a wall of log rows stays scannable — a page
 * where every row is coloured carries no signal at all.
 */
export function auditActionBadgeVariant(action: string): BadgeVariant {
  const verb = action.toLowerCase();
  if (verb === 'create') return 'success';
  if (verb === 'delete') return 'danger';
  return 'neutral';
}

/** Is this verb one the UI has a translation for? Drives the label fallback. */
export function isKnownVerb(action: string): action is AuditVerb {
  return (AUDIT_VERBS as string[]).includes(action.toLowerCase());
}

export function isKnownEntityType(entityType: string): entityType is AuditEntityType {
  return (AUDIT_ENTITY_TYPES as string[]).includes(entityType.toLowerCase());
}

/**
 * Verbs whose label stands alone.
 *
 * The composition rule (verb + entity) reads correctly for actions performed ON
 * a record — "Create facility", "إنشاء منشأة". A session event is performed BY
 * the actor on themselves, so the same rule produces "Sign in admin", which is
 * not a sentence in either language. These render as the verb only.
 */
const STANDALONE_VERBS = new Set<string>(['login', 'logout']);

export function isStandaloneVerb(action: string): boolean {
  return STANDALONE_VERBS.has(action.toLowerCase());
}

/**
 * A readable, right-length label for the affected record: its name when the
 * backend resolved one, otherwise a shortened id.
 *
 * Audit ids are opaque and often long; printing one in full pushes the IP column
 * off a laptop screen. The full value is always available in the detail dialog.
 */
export function entityDisplayId(entry: AuditEntry, maxLength = 12): string {
  if (entry.entityLabel) return entry.entityLabel;
  if (!entry.entityId) return '—';
  return entry.entityId.length > maxLength
    ? `${entry.entityId.slice(0, maxLength)}…`
    : entry.entityId;
}

// ---------------------------------------------------------------------------
// Before/after comparison (FR-ADM-AUDIT-004)
// ---------------------------------------------------------------------------

export interface AuditFieldChange {
  field: string;
  before: unknown;
  after: unknown;
  kind: 'added' | 'removed' | 'changed';
}

/**
 * The readable comparison the SRS asks for ("تُعرَض القيمتان قبل/بعد كمقارنة
 * مقروءة").
 *
 * Only fields that ACTUALLY differ are returned. A create carries a null
 * `before` and every field reads as added; a delete is the mirror. Unchanged
 * fields are dropped entirely — an admin looking at a 40-field facility update
 * needs the one line that changed, not the other 39.
 *
 * Comparison is by JSON value, so nested objects and arrays are handled without
 * a deep-equality dependency.
 */
export function diffSnapshots(
  before: AuditSnapshot | null,
  after: AuditSnapshot | null,
): AuditFieldChange[] {
  const fields = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: AuditFieldChange[] = [];

  for (const field of fields) {
    const oldValue = before?.[field];
    const newValue = after?.[field];
    if (stableStringify(oldValue) === stableStringify(newValue)) continue;

    const hadBefore = before !== null && field in before;
    const hasAfter = after !== null && field in after;
    changes.push({
      field,
      before: oldValue,
      after: newValue,
      kind: !hadBefore ? 'added' : !hasAfter ? 'removed' : 'changed',
    });
  }

  // Alphabetical: a stable order beats key-insertion order, which differs
  // between a JSON parse and an object literal and would make the same entry
  // look different on a refetch.
  return changes.sort((a, b) => a.field.localeCompare(b.field));
}

/**
 * Stands in for `undefined`, which `JSON.stringify` returns as the VALUE
 * `undefined` rather than a string. It cannot collide with real output: a string
 * field holding this text would stringify with quotes around it.
 */
const UNDEFINED_SENTINEL = '__undefined__';

/** JSON with object keys sorted, so `{a,b}` and `{b,a}` compare equal. */
function stableStringify(value: unknown): string {
  if (value === undefined) return UNDEFINED_SENTINEL;
  return JSON.stringify(value, (_key, inner: unknown) => {
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const record = inner as Record<string, unknown>;
      return Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key]]));
    }
    return inner;
  });
}

/**
 * Render a snapshot value as text.
 *
 * Everything reaching this came from the wire, so it renders as a plain string
 * inside a text node — never as HTML, and never through a formatter that could
 * be fooled into producing markup.
 */
export function formatAuditValue(value: unknown, emptyLabel: string): string {
  if (value === null || value === undefined || value === '') return emptyLabel;
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  if (Array.isArray(value)) {
    return value.length === 0 ? emptyLabel : value.map((item) => String(item)).join(', ');
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Wire DTOs (snake_case) + normalisers
// ---------------------------------------------------------------------------

export interface AuditActorDto {
  id?: string | number | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface AuditEntryDto {
  id?: string | number;
  created_at?: string;
  actor?: AuditActorDto | null;
  /** Some backends flatten the actor; both shapes are accepted. */
  actor_id?: string | number | null;
  actor_name?: string | null;
  actor_email?: string | null;
  action?: string;
  entity_type?: string;
  entity_id?: string | number | null;
  entity_label?: string | null;
  before?: AuditSnapshot | null;
  after?: AuditSnapshot | null;
  ip?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * FR-ADM-AUDIT-002 — strip the IPv4-mapped IPv6 prefix so `::ffff:192.0.2.7`
 * displays as `192.0.2.7`.
 *
 * The SRS puts this on the backend; it is repeated here because the dashboard
 * must not show a mangled address if any writer forgets, and normalising twice
 * is harmless.
 */
export function normalizeIp(ip: string | null | undefined): string | undefined {
  if (!ip) return undefined;
  const trimmed = ip.trim();
  return trimmed.replace(/^::ffff:/i, '') || undefined;
}

export function toAuditEntry(dto: AuditEntryDto): AuditEntry {
  const actorDto = dto.actor ?? {};
  const actorId = actorDto.id ?? dto.actor_id;
  const entityId = dto.entity_id;

  return {
    id: String(dto.id ?? ''),
    createdAt: dto.created_at ?? new Date().toISOString(),
    actor: {
      // `null` is meaningful (the system acted) and must survive the round trip,
      // so it is distinguished from "absent" rather than coalesced away.
      id: actorId === null || actorId === undefined ? null : String(actorId),
      name: actorDto.name ?? dto.actor_name ?? undefined,
      email: actorDto.email ?? dto.actor_email ?? undefined,
      role: actorDto.role ?? undefined,
    },
    action: (dto.action ?? '').toLowerCase(),
    entityType: (dto.entity_type ?? '').toLowerCase(),
    entityId: entityId === null || entityId === undefined ? null : String(entityId),
    entityLabel: dto.entity_label ?? undefined,
    before: dto.before ?? null,
    after: dto.after ?? null,
    ip: normalizeIp(dto.ip ?? dto.ip_address),
    userAgent: dto.user_agent ?? undefined,
  };
}
