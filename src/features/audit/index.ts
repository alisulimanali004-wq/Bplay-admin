/**
 * AUDIT (SRS module 04) — the administrative trail.
 *
 * The page is reached through the lazy, super-admin-guarded route in
 * `app/router`, so nothing here exports it. This barrel carries only the domain
 * vocabulary another feature might one day need to deep-link an entity's
 * history; everything else stays internal to the slice.
 */
export type { AuditEntry, AuditListParams, AuditVerb, AuditEntityType } from './api/audit.types';
