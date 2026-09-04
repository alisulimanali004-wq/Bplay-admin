import { mockDelay } from '@shared/lib/mock';
import { AUDIT_EXPORT_LIMIT } from './audit.types';
import { filterAndPaginateAudit, selectAuditForExport } from './audit.filter';
import type {
  AuditActor,
  AuditEntry,
  AuditListParams,
  AuditListResult,
  AuditSnapshot,
} from './audit.types';

/**
 * An in-memory audit trail.
 *
 * APPEND-ONLY, like the real thing (AUD7): this module exports readers only, and
 * nothing anywhere can mutate `db`. That is not an oversight — a mock that let
 * you edit the log would teach the wrong thing about the feature.
 *
 * The actors are the admins seeded in admin-management, and every entry points
 * at a record that genuinely exists elsewhere in the dashboard — facility `f1`,
 * owner `300`, region `c5`, player `pl-9`, plan `plan-owner-pro`. That matters
 * for FR-ADM-AUDIT-004's "entity history" button: filtering by `f1` has to
 * return a coherent story, not one orphaned row.
 *
 * The snapshots are deliberately ORDINARY and carry no secrets — a real writer
 * must redact credentials before they reach a permanent record, and a fixture
 * that showed a password hash would normalise exactly the wrong habit.
 */

const HOUR = 3_600_000;
/**
 * A FIXED clock. Timestamps anchor to it rather than to `Date.now()` so the log
 * reads the same on every reload — and so a screenshot stays reproducible —
 * while relative labels still make sense against a recent date.
 */
const NOW = Date.parse('2026-08-02T10:00:00.000Z');
const hoursAgo = (h: number): string => new Date(NOW - h * HOUR).toISOString();

// ---------------------------------------------------------------------------
// Actors — the admins from admin-management, plus the two special cases the
// SRS names by hand (FR-ADM-AUDIT-003).
// ---------------------------------------------------------------------------

const SUPER: AuditActor = {
  id: 'ad-0',
  name: 'Super Admin',
  email: 'admin@bplay.app',
  role: 'super_admin',
};
const SARA: AuditActor = {
  id: 'ad-1',
  name: 'Sara Haddad',
  email: 'sara.haddad@bplay.app',
  role: 'admin',
};
const OMAR: AuditActor = {
  id: 'ad-2',
  name: 'Omar Khoury',
  email: 'omar.khoury@bplay.app',
  role: 'admin',
};
const RANA: AuditActor = {
  id: 'ad-5',
  name: 'Rana Suleiman',
  email: 'rana.suleiman@bplay.app',
  role: 'admin',
};
/** A deleted admin: the id survives, the profile does not -> "Unknown user". */
const DELETED: AuditActor = { id: 'ad-15' };
/** The platform itself (a scheduled job) -> "System". */
const SYSTEM: AuditActor = { id: null };

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0';

interface EntrySeed {
  at: number;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel?: string;
  before?: AuditSnapshot | null;
  after?: AuditSnapshot | null;
  ip?: string;
  ua?: string;
}

let seq = 4000;

function build(seed: EntrySeed): AuditEntry {
  seq += 1;
  return {
    id: `au-${seq}`,
    createdAt: hoursAgo(seed.at),
    actor: seed.actor,
    action: seed.action,
    entityType: seed.entityType,
    entityId: seed.entityId,
    entityLabel: seed.entityLabel,
    before: seed.before ?? null,
    after: seed.after ?? null,
    // A system actor has no browser and no client address — leaving these blank
    // is the honest rendering, and the UI has an em-dash for it.
    ip: seed.actor.id === null ? undefined : (seed.ip ?? '192.168.1.42'),
    userAgent: seed.actor.id === null ? undefined : (seed.ua ?? CHROME),
  };
}

// ---------------------------------------------------------------------------
// The log — 34 entries across every entity type, newest last in this array.
//
// Facility `f1` deliberately accumulates FIVE entries by three different actors:
// it is the story "entity history" (FR-ADM-AUDIT-004) exists to tell.
// ---------------------------------------------------------------------------

const SEEDS: EntrySeed[] = [
  // ---- facility f1: submitted -> reviewed -> document rejected -> approved ----
  {
    at: 54,
    actor: SYSTEM,
    action: 'create',
    entityType: 'facility',
    entityId: 'f1',
    entityLabel: 'Al-Baramkeh Sports Club',
    after: { name: 'Al-Baramkeh Sports Club', status: 'pending', city: 'Damascus', courts: 3 },
  },
  {
    at: 30,
    actor: SARA,
    action: 'update',
    entityType: 'facility',
    entityId: 'f1',
    entityLabel: 'Al-Baramkeh Sports Club',
    before: { adminNotes: null, reviewedBy: null },
    after: { adminNotes: 'Licence expires next month — renewal requested.', reviewedBy: 'Sara Haddad' },
    ip: '10.0.4.18',
  },
  {
    at: 29,
    actor: SARA,
    action: 'reject',
    entityType: 'facility',
    entityId: 'f1',
    entityLabel: 'Al-Baramkeh Sports Club — Business licence',
    before: { documentStatus: 'pending' },
    after: { documentStatus: 'rejected', reason: 'Licence expires before the season starts' },
    ip: '10.0.4.18',
  },
  {
    at: 4,
    actor: SARA,
    action: 'approve',
    entityType: 'facility',
    entityId: 'f1',
    entityLabel: 'Al-Baramkeh Sports Club',
    before: { status: 'pending', approvedAt: null },
    after: { status: 'active', approvedAt: '2026-08-02T06:00:00.000Z' },
    ip: '10.0.4.18',
  },
  {
    at: 3,
    actor: SARA,
    action: 'update',
    entityType: 'facility',
    entityId: 'f1',
    entityLabel: 'Al-Baramkeh Sports Club',
    before: { isFeatured: false, qualityScore: 71 },
    after: { isFeatured: true, qualityScore: 78 },
    ip: '10.0.4.18',
  },

  // ---- admins ----
  {
    at: 210,
    actor: SUPER,
    action: 'create',
    entityType: 'admin',
    entityId: 'ad-8',
    entityLabel: 'Ziad Halabi',
    after: { name: 'Ziad Halabi', email: 'ziad.halabi@bplay.app', scope: 'regional', isActive: true },
    ua: SAFARI,
  },
  {
    at: 150,
    actor: SUPER,
    action: 'assign',
    entityType: 'admin',
    entityId: 'ad-1',
    entityLabel: 'Sara Haddad',
    before: { assignedRegions: ['Damascus'] },
    after: { assignedRegions: ['Damascus', 'Rural Damascus'] },
    ua: SAFARI,
  },
  {
    at: 96,
    actor: SUPER,
    action: 'reset_password',
    entityType: 'admin',
    entityId: 'ad-4',
    entityLabel: 'Karim Aziz',
    // A password never appears in a snapshot — only the fact that it changed.
    after: { passwordChangedAt: '2026-07-29T10:00:00.000Z', mustChangeOnNextLogin: true },
    ua: SAFARI,
  },
  {
    at: 72,
    actor: SUPER,
    action: 'deactivate',
    entityType: 'admin',
    entityId: 'ad-7',
    entityLabel: 'Maya Fares',
    before: { isActive: true },
    after: { isActive: false, reason: 'Left the team' },
    ua: SAFARI,
  },
  {
    at: 48,
    actor: SUPER,
    action: 'delete',
    entityType: 'admin',
    entityId: 'ad-15',
    entityLabel: 'Bassel Aouad',
    before: { name: 'Bassel Aouad', email: 'bassel.aouad@bplay.app', isActive: false },
    after: null,
    ua: SAFARI,
  },

  // ---- owners ----
  {
    at: 180,
    actor: OMAR,
    action: 'approve',
    entityType: 'owner',
    entityId: '308',
    entityLabel: 'Hadi Rahal',
    before: { accountStatus: 'under_review' },
    after: { accountStatus: 'active' },
    ip: '10.0.7.51',
    ua: FIREFOX,
  },
  {
    at: 120,
    actor: SUPER,
    action: 'block',
    entityType: 'owner',
    entityId: '305',
    entityLabel: 'Maya Fares',
    before: { isBlocked: false },
    after: { isBlocked: true, reason: 'Repeated policy violations reported by players.' },
    ua: SAFARI,
  },
  {
    at: 70,
    actor: SUPER,
    action: 'suspend',
    entityType: 'owner',
    entityId: '306',
    entityLabel: 'Ziad Halabi',
    before: { accountStatus: 'active' },
    after: { accountStatus: 'suspended', reason: 'Account paused pending updated tax documents.' },
    ua: SAFARI,
  },
  {
    at: 66,
    actor: RANA,
    action: 'reject',
    entityType: 'owner',
    entityId: '313',
    entityLabel: 'Sara Haddad (owner)',
    before: { accountStatus: 'under_review' },
    after: {
      accountStatus: 'rejected',
      reason: 'National ID did not match the applicant; verification failed.',
    },
    ip: '10.0.9.30',
    ua: FIREFOX,
  },
  {
    at: 12,
    actor: OMAR,
    action: 'approve',
    entityType: 'owner',
    entityId: '300',
    entityLabel: 'Fadi Barakat',
    before: { trustTier: 'basic' },
    after: { trustTier: 'verified' },
    ip: '10.0.7.51',
    ua: FIREFOX,
  },

  // ---- regions ----
  {
    at: 320,
    actor: SUPER,
    action: 'create',
    entityType: 'region',
    entityId: 'c6',
    entityLabel: 'Tartus',
    after: { name: 'Tartus', centerLat: 34.889, centerLng: 35.886, radiusKm: 18, isActive: true },
    ua: SAFARI,
  },
  {
    at: 190,
    actor: SUPER,
    action: 'update',
    entityType: 'region',
    entityId: 'c1',
    entityLabel: 'Damascus',
    before: { radiusKm: 20 },
    after: { radiusKm: 26 },
    ua: SAFARI,
  },
  {
    at: 140,
    actor: SUPER,
    action: 'deactivate',
    entityType: 'region',
    entityId: 'c5',
    entityLabel: 'Hama',
    before: { isActive: true },
    after: { isActive: false, reason: 'No active facilities — paused until launch.' },
    ua: SAFARI,
  },
  {
    at: 132,
    actor: SUPER,
    action: 'deactivate',
    entityType: 'region',
    entityId: 'c7',
    entityLabel: 'Idlib',
    before: { isActive: true },
    after: { isActive: false },
    ua: SAFARI,
  },

  // ---- players ----
  {
    at: 100,
    actor: RANA,
    action: 'suspend',
    entityType: 'player',
    entityId: 'pl-9',
    entityLabel: 'Maya Suleiman',
    before: { isSuspended: false },
    after: { isSuspended: true, reason: 'Three no-shows in 30 days', until: '2026-08-14' },
    ip: '10.0.9.30',
    ua: FIREFOX,
  },
  {
    at: 44,
    actor: RANA,
    action: 'restore',
    entityType: 'player',
    entityId: 'pl-4',
    entityLabel: 'Omar Nasr',
    before: { isSuspended: true },
    after: { isSuspended: false },
    ip: '10.0.9.30',
    ua: FIREFOX,
  },
  {
    at: 20,
    actor: OMAR,
    action: 'update',
    entityType: 'player',
    entityId: 'pl-1',
    entityLabel: 'Yara Ibrahim',
    before: { phone: '+963 933 000 111' },
    after: { phone: '+963 933 000 222' },
    ip: '10.0.7.51',
    ua: FIREFOX,
  },

  // ---- facilities (other than f1) ----
  {
    at: 305,
    actor: SARA,
    action: 'reject',
    entityType: 'facility',
    entityId: 'f11',
    entityLabel: 'Al-Aziziyah Community Pitch',
    before: { status: 'pending' },
    after: {
      status: 'rejected',
      reason: 'Ownership document address does not match the mapped location',
    },
    ip: '10.0.4.18',
  },
  {
    at: 188,
    actor: OMAR,
    action: 'approve',
    entityType: 'facility',
    entityId: 'f9',
    entityLabel: 'Aleppo Champions Academy',
    before: { status: 'pending' },
    after: { status: 'active', approvedAt: '2026-07-25T14:00:00.000Z' },
    ip: '10.0.7.51',
    ua: FIREFOX,
  },
  {
    at: 46,
    actor: SYSTEM,
    action: 'suspend',
    entityType: 'facility',
    entityId: 'f20',
    entityLabel: 'Arwad View Sports Club',
    before: { status: 'active' },
    after: { status: 'owner_suspended', reason: 'Paused by the owner for renovations' },
  },
  {
    at: 26,
    actor: DELETED,
    action: 'update',
    entityType: 'facility',
    entityId: 'f14',
    entityLabel: 'Orontes Sports City',
    before: { contactPhone: '+963 31 220 4400' },
    after: { contactPhone: '+963 31 220 4477' },
    ip: '10.0.11.77',
  },

  // ---- plans ----
  {
    at: 260,
    actor: SUPER,
    action: 'create',
    entityType: 'plan',
    entityId: 'plan-owner-pro',
    entityLabel: 'Pro (owner tier)',
    after: { name: 'Pro', audience: 'owner', priceSyp: 450_000, billingPeriod: 'monthly' },
    ua: SAFARI,
  },
  {
    at: 88,
    actor: SUPER,
    action: 'update',
    entityType: 'plan',
    entityId: 'plan-player-plus',
    entityLabel: 'Bplay Plus',
    before: { priceSyp: 55_000, isPublished: true },
    after: { priceSyp: 60_000, isPublished: true },
    ua: SAFARI,
  },
  {
    at: 34,
    actor: SUPER,
    action: 'deactivate',
    entityType: 'plan',
    entityId: 'plan-player-student',
    entityLabel: 'Bplay Student',
    before: { isPublished: true },
    after: { isPublished: false },
    ua: SAFARI,
  },

  // ---- community moderation ----
  {
    at: 58,
    actor: RANA,
    action: 'delete',
    entityType: 'post',
    entityId: 'po-214',
    entityLabel: 'Post by Kareem Saleh',
    before: { visibility: 'public', reports: 4 },
    after: null,
    ip: '10.0.9.30',
    ua: FIREFOX,
  },
  {
    at: 18,
    actor: OMAR,
    action: 'restore',
    entityType: 'post',
    entityId: 'po-198',
    entityLabel: 'Post by Lina Kassem',
    before: { visibility: 'hidden' },
    after: { visibility: 'public' },
    ip: '10.0.7.51',
    ua: FIREFOX,
  },

  // ---- bookings & subscriptions (oversight actions) ----
  {
    at: 92,
    actor: SYSTEM,
    action: 'update',
    entityType: 'booking',
    entityId: 'bk-7741',
    entityLabel: 'Booking #7741',
    before: { status: 'confirmed' },
    after: { status: 'no_show' },
  },
  {
    at: 38,
    actor: SYSTEM,
    action: 'update',
    entityType: 'subscription',
    entityId: 'sub-1180',
    entityLabel: 'Membership #1180',
    before: { status: 'active' },
    after: { status: 'expired' },
  },

  // ---- feedback + chat ----
  {
    at: 74,
    actor: OMAR,
    action: 'update',
    entityType: 'feedback',
    entityId: 'fb-1002',
    entityLabel: 'Suggestion from Rami Haddad',
    before: { status: 'new', replyCount: 0 },
    after: { status: 'replied', replyCount: 1 },
    ip: '10.0.7.51',
    ua: FIREFOX,
  },
  {
    at: 2,
    actor: SARA,
    action: 'create',
    entityType: 'conversation',
    entityId: 'cv-707',
    entityLabel: 'Thread with Lina Nasser',
    after: { category: 'facility_review', facility: 'Latakia Coastal Pitch' },
    ip: '10.0.4.18',
  },

  // ---- sessions ----
  {
    at: 5,
    actor: SUPER,
    action: 'login',
    entityType: 'admin',
    entityId: 'ad-0',
    entityLabel: 'Super Admin',
    after: { method: 'password', twoFactor: false },
    ua: SAFARI,
  },
  {
    at: 168,
    actor: SARA,
    action: 'logout',
    entityType: 'admin',
    entityId: 'ad-1',
    entityLabel: 'Sara Haddad',
    ip: '10.0.4.18',
  },
  // AUDQ2 — an entry whose target could not be resolved to an id. It must still
  // render, with the label carrying whatever context the writer had.
  {
    at: 240,
    actor: SUPER,
    action: 'update',
    entityType: 'plan',
    entityId: null,
    entityLabel: 'Bulk price adjustment (4 plans)',
    before: { vatPercent: 0 },
    after: { vatPercent: 5 },
    ua: SAFARI,
  },
];

/** Frozen: the log is append-only, so nothing may ever write through to it. */
const db: readonly AuditEntry[] = Object.freeze(SEEDS.map(build));

export async function getAuditLog(params: AuditListParams): Promise<AuditListResult> {
  await mockDelay();
  return filterAndPaginateAudit([...db], params);
}

export async function getAuditForExport(params: AuditListParams): Promise<AuditEntry[]> {
  await mockDelay(250);
  return selectAuditForExport([...db], params, AUDIT_EXPORT_LIMIT);
}
