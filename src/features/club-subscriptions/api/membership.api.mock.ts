import { mockDelay } from '@shared/lib/mock';
import { getFacilities } from '@features/facility-management/api';
import {
  buildFacilityScopeIndex,
  buildMembershipListResult,
  computeMembershipStats,
  type FacilityScopeIndex,
} from './membership.filter';
import {
  PLAN_CATALOG,
  type Membership,
  type MembershipCheckIn,
  type MembershipListParams,
  type MembershipListResult,
  type MembershipPayment,
  type MembershipStats,
  type MembershipStatus,
  type PaymentMethod,
  type PlanSnapshot,
} from './membership.types';

// ---------------------------------------------------------------------------
// Seed helpers (deterministic, computed once at module load)
// ---------------------------------------------------------------------------

const NOW = Date.now();
const DAY_MS = 86_400_000;

/** ISO timestamp `days` from now (positive = future, negative = past). */
function at(days: number): string {
  return new Date(NOW + days * DAY_MS).toISOString();
}

/** ISO timestamp `days` in the past (negative reads as the future). */
function daysAgo(days: number): string {
  return at(-days);
}

// ---------------------------------------------------------------------------
// Clubs (only clubs have membership plans). f21 sits in an inactive region
// (orphan → super-admin only); f7 is a suspended club (expired-membership edge).
// ---------------------------------------------------------------------------

interface ClubSeed {
  name: string;
  logo: string;
}

function clubLogo(clubId: string): string {
  return `https://picsum.photos/seed/bplay-${clubId}-logo/200/200`;
}

const CLUBS: Record<string, ClubSeed> = {
  f3: { name: 'Qasioun Heights Club', logo: clubLogo('f3') },
  f5: { name: 'Abu Rummaneh Racquet Club', logo: clubLogo('f5') },
  f10: { name: 'Citadel Sports Complex', logo: clubLogo('f10') },
  f14: { name: 'Orontes Sports City', logo: clubLogo('f14') },
  f17: { name: 'Blue Beach Sports Club', logo: clubLogo('f17') },
  f21: { name: 'Hama Norias Sports Club', logo: clubLogo('f21') },
  f7: { name: 'Umayyad Aquatic & Tennis Club', logo: clubLogo('f7') },
};

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

interface PlayerSeed {
  name: string;
  photo: string;
}

function pravatar(playerId: string): string {
  return `https://i.pravatar.cc/512?img=${((Number(playerId) - 500) % 70) + 1}`;
}

function player(id: string, name: string): [string, PlayerSeed] {
  return [id, { name, photo: pravatar(id) }];
}

const PLAYERS: Record<string, PlayerSeed> = Object.fromEntries([
  player('500', 'Yara Ibrahim'),
  player('501', 'Kareem Saleh'),
  player('502', 'Lana Haddad'),
  player('503', 'Omar Nasr'),
  player('504', 'Sara Deeb'),
  player('505', 'Hadi Mansour'),
  player('506', 'Nour Aziz'),
  player('507', 'Bilal Khoury'),
  player('508', 'Maya Suleiman'),
  player('509', 'Ziad Fares'),
  player('510', 'Rima Saab'),
  player('511', 'Tarek Wehbe'),
  player('512', 'Dina Rahal'),
  player('513', 'Samer Halabi'),
  player('514', 'Lina Kassem'),
  player('515', 'Fadi Barakat'),
]);

const PLAN_BY_NAME: Record<string, PlanSnapshot> = Object.fromEntries(
  PLAN_CATALOG.map((plan) => [plan.name, plan]),
);

// ---------------------------------------------------------------------------
// Membership builder
// ---------------------------------------------------------------------------

interface Seed {
  id: string;
  /** Player id. */
  player: string;
  /** Club id. */
  club: string;
  /** Plan name (a key into PLAN_CATALOG). */
  plan: string;
  status: MembershipStatus;
  /** startDate = today minus this many days (0 = today; end derives from plan.durationDays). */
  s: number;
  entries: number;
  /** Explicit payments (defaults: none for pending/free, one paid payment otherwise). */
  payments?: MembershipPayment[];
  /** Explicit check-ins (defaults: a handful for active memberships). */
  checkIns?: MembershipCheckIn[];
}

function idNum(id: string): number {
  return id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function defaultPayments(seed: Seed, plan: PlanSnapshot, startDate: string): MembershipPayment[] {
  if (seed.status === 'pending_activation') return []; // not yet activated → unpaid
  if (plan.priceSyp === 0) return []; // free trial → nothing paid
  const method: PaymentMethod = idNum(seed.id) % 2 === 0 ? 'transfer' : 'cash';
  return [
    { id: `${seed.id}-p1`, date: startDate, amountSyp: plan.priceSyp, method, status: 'paid' },
  ];
}

function defaultCheckIns(seed: Seed): MembershipCheckIn[] {
  if (seed.status !== 'active') return [];
  const count = Math.min(seed.entries, 5);
  return Array.from({ length: count }, (_, index) => {
    const age = Math.min(index * 4 + 2, Math.max(1, seed.s - 1));
    return {
      id: `${seed.id}-ci${index + 1}`,
      date: daysAgo(age),
      method: index % 2 === 0 ? 'qr' : 'manual',
    };
  });
}

function makeSub(seed: Seed): Membership {
  const person = PLAYERS[seed.player];
  const club = CLUBS[seed.club];
  const plan = PLAN_BY_NAME[seed.plan];
  const startDate = daysAgo(seed.s);
  const endDate = daysAgo(seed.s - plan.durationDays);
  return {
    id: seed.id,
    playerId: seed.player,
    playerName: person.name,
    playerPhotoUrl: person.photo,
    clubId: seed.club,
    clubName: club.name,
    clubLogoUrl: club.logo,
    plan,
    status: seed.status,
    startDate,
    endDate,
    entriesUsed: seed.entries,
    payments: seed.payments ?? defaultPayments(seed, plan, startDate),
    checkIns: seed.checkIns ?? defaultCheckIns(seed),
    createdAt: daysAgo(seed.s + 1),
  };
}

function refundedPayment(id: string, amountSyp: number, days: number): MembershipPayment {
  return { id: `${id}-p1`, date: daysAgo(days), amountSyp, method: 'transfer', status: 'refunded' };
}

// ---------------------------------------------------------------------------
// Seeds — 55 memberships across 7 clubs + 16 players, covering every status
// and every member segment, several players with 2+ (past + current), a family
// plan, a free trial, a day pass, an expired membership on the suspended club
// f7, and memberships on the orphan club f21 (super-admin-only).
// ---------------------------------------------------------------------------

const SEEDS: Seed[] = [
  // --- Qasioun Heights Club (f3) -----------------------------------------
  { id: 'sub-001', player: '500', club: 'f3', plan: 'Annual Elite', status: 'active', s: 40, entries: 60 },
  { id: 'sub-002', player: '500', club: 'f3', plan: 'Monthly Basic', status: 'expired', s: 70, entries: 11 },
  { id: 'sub-003', player: '501', club: 'f3', plan: 'Quarterly Pro', status: 'active', s: 20, entries: 22 },
  { id: 'sub-004', player: '502', club: 'f3', plan: 'Monthly Basic', status: 'paused', s: 12, entries: 4 },
  { id: 'sub-005', player: '503', club: 'f3', plan: 'Family Plan', status: 'active', s: 5, entries: 9 },
  { id: 'sub-006', player: '504', club: 'f3', plan: 'Day Pass', status: 'expired', s: 15, entries: 1 },
  { id: 'sub-007', player: '505', club: 'f3', plan: 'Monthly Basic', status: 'active', s: 25, entries: 8 },
  { id: 'sub-042', player: '504', club: 'f3', plan: 'Quarterly Pro', status: 'active', s: 15, entries: 18 },
  { id: 'sub-050', player: '511', club: 'f3', plan: 'Monthly Basic', status: 'expired', s: 45, entries: 11 },

  // --- Abu Rummaneh Racquet Club (f5) ------------------------------------
  { id: 'sub-008', player: '501', club: 'f5', plan: 'Monthly Basic', status: 'active', s: 8, entries: 6 },
  { id: 'sub-009', player: '506', club: 'f5', plan: 'Quarterly Pro', status: 'active', s: 45, entries: 30 },
  { id: 'sub-010', player: '507', club: 'f5', plan: 'Annual Elite', status: 'active', s: 320, entries: 110 },
  { id: 'sub-011', player: '508', club: 'f5', plan: 'Free Trial', status: 'expired', s: 20, entries: 3 },
  {
    id: 'sub-012',
    player: '502',
    club: 'f5',
    plan: 'Monthly Basic',
    status: 'cancelled',
    s: 50,
    entries: 3,
    payments: [refundedPayment('sub-012', 300_000, 50)],
  },
  { id: 'sub-013', player: '509', club: 'f5', plan: 'Quarterly Pro', status: 'expired', s: 120, entries: 40 },
  { id: 'sub-043', player: '506', club: 'f5', plan: 'Monthly Basic', status: 'active', s: 28, entries: 9 },
  { id: 'sub-049', player: '503', club: 'f5', plan: 'Free Trial', status: 'pending_activation', s: 0, entries: 0 },
  { id: 'sub-053', player: '513', club: 'f5', plan: 'Monthly Basic', status: 'active', s: 11, entries: 6 },

  // --- Citadel Sports Complex (f10) --------------------------------------
  { id: 'sub-014', player: '503', club: 'f10', plan: 'Annual Elite', status: 'active', s: 200, entries: 90 },
  { id: 'sub-015', player: '503', club: 'f10', plan: 'Monthly Basic', status: 'expired', s: 240, entries: 10 },
  { id: 'sub-016', player: '510', club: 'f10', plan: 'Monthly Basic', status: 'active', s: 10, entries: 7 },
  { id: 'sub-017', player: '511', club: 'f10', plan: 'Family Plan', status: 'active', s: 22, entries: 15 },
  { id: 'sub-018', player: '512', club: 'f10', plan: 'Quarterly Pro', status: 'pending_activation', s: 0, entries: 0 },
  { id: 'sub-019', player: '513', club: 'f10', plan: 'Monthly Basic', status: 'expired', s: 65, entries: 12 },
  { id: 'sub-020', player: '514', club: 'f10', plan: 'Day Pass', status: 'active', s: 0, entries: 1 },
  { id: 'sub-044', player: '512', club: 'f10', plan: 'Annual Elite', status: 'active', s: 30, entries: 40 },
  { id: 'sub-047', player: '501', club: 'f10', plan: 'Day Pass', status: 'expired', s: 5, entries: 1 },
  { id: 'sub-051', player: '508', club: 'f10', plan: 'Quarterly Pro', status: 'active', s: 60, entries: 32 },

  // --- Orontes Sports City (f14) -----------------------------------------
  { id: 'sub-021', player: '509', club: 'f14', plan: 'Monthly Basic', status: 'cancelled', s: 40, entries: 5 },
  { id: 'sub-022', player: '509', club: 'f14', plan: 'Quarterly Pro', status: 'active', s: 30, entries: 25 },
  { id: 'sub-023', player: '505', club: 'f14', plan: 'Annual Elite', status: 'active', s: 350, entries: 130 },
  { id: 'sub-024', player: '506', club: 'f14', plan: 'Monthly Basic', status: 'paused', s: 18, entries: 6 },
  { id: 'sub-025', player: '515', club: 'f14', plan: 'Family Plan', status: 'active', s: 12, entries: 12 },
  { id: 'sub-026', player: '507', club: 'f14', plan: 'Monthly Basic', status: 'expired', s: 80, entries: 12 },
  { id: 'sub-027', player: '513', club: 'f14', plan: 'Free Trial', status: 'active', s: 3, entries: 2 },
  { id: 'sub-045', player: '514', club: 'f14', plan: 'Quarterly Pro', status: 'expired', s: 100, entries: 30 },
  { id: 'sub-048', player: '502', club: 'f14', plan: 'Monthly Basic', status: 'active', s: 20, entries: 7 },
  { id: 'sub-054', player: '510', club: 'f14', plan: 'Day Pass', status: 'active', s: 0, entries: 1 },

  // --- Blue Beach Sports Club (f17) --------------------------------------
  { id: 'sub-028', player: '508', club: 'f17', plan: 'Annual Elite', status: 'active', s: 100, entries: 70 },
  { id: 'sub-029', player: '508', club: 'f17', plan: 'Free Trial', status: 'expired', s: 30, entries: 3 },
  { id: 'sub-030', player: '510', club: 'f17', plan: 'Quarterly Pro', status: 'active', s: 70, entries: 35 },
  { id: 'sub-031', player: '511', club: 'f17', plan: 'Monthly Basic', status: 'active', s: 6, entries: 5 },
  { id: 'sub-032', player: '512', club: 'f17', plan: 'Day Pass', status: 'expired', s: 10, entries: 1 },
  {
    id: 'sub-033',
    player: '514',
    club: 'f17',
    plan: 'Monthly Basic',
    status: 'cancelled',
    s: 25,
    entries: 4,
    payments: [refundedPayment('sub-033', 300_000, 25)],
  },
  { id: 'sub-034', player: '500', club: 'f17', plan: 'Quarterly Pro', status: 'active', s: 50, entries: 28 },
  { id: 'sub-046', player: '515', club: 'f17', plan: 'Family Plan', status: 'active', s: 8, entries: 10 },
  { id: 'sub-052', player: '507', club: 'f17', plan: 'Annual Elite', status: 'active', s: 280, entries: 100 },
  { id: 'sub-055', player: '504', club: 'f17', plan: 'Monthly Basic', status: 'pending_activation', s: 0, entries: 0 },

  // --- Umayyad Aquatic & Tennis Club (f7 — suspended club) ---------------
  { id: 'sub-035', player: '506', club: 'f7', plan: 'Annual Elite', status: 'expired', s: 400, entries: 150 },
  { id: 'sub-036', player: '507', club: 'f7', plan: 'Monthly Basic', status: 'active', s: 100, entries: 12 },
  {
    id: 'sub-037',
    player: '515',
    club: 'f7',
    plan: 'Quarterly Pro',
    status: 'cancelled',
    s: 100,
    entries: 20,
    payments: [refundedPayment('sub-037', 750_000, 100)],
  },

  // --- Hama Norias Sports Club (f21 — orphan, super-admin-only) -----------
  { id: 'sub-038', player: '509', club: 'f21', plan: 'Monthly Basic', status: 'active', s: 15, entries: 6 },
  { id: 'sub-039', player: '510', club: 'f21', plan: 'Quarterly Pro', status: 'active', s: 40, entries: 20 },
  { id: 'sub-040', player: '513', club: 'f21', plan: 'Annual Elite', status: 'active', s: 310, entries: 120 },
  { id: 'sub-041', player: '505', club: 'f21', plan: 'Monthly Basic', status: 'expired', s: 90, entries: 12 },
];

// In-memory db (read-only feature — never mutated after seeding).
const db: Membership[] = SEEDS.map(makeSub);

// ---------------------------------------------------------------------------
// Scope — derive visible clubs from the facility-management scope (role-aware)
// ---------------------------------------------------------------------------

async function scopeIndex(): Promise<FacilityScopeIndex> {
  const { items } = await getFacilities({ kind: 'club', page: 1, pageSize: 1000 });
  return buildFacilityScopeIndex(items);
}

function deepCopy(membership: Membership): Membership {
  return {
    ...membership,
    plan: { ...membership.plan, features: [...membership.plan.features] },
    payments: membership.payments.map((payment) => ({ ...payment })),
    checkIns: membership.checkIns.map((checkIn) => ({ ...checkIn })),
  };
}

// ---------------------------------------------------------------------------
// API surface (mirrors membership.api.ts exactly)
// ---------------------------------------------------------------------------

export async function getMemberships(params: MembershipListParams): Promise<MembershipListResult> {
  await mockDelay();
  const idx = await scopeIndex();
  return buildMembershipListResult([...db], params, idx, NOW);
}

export async function getMembershipById(id: string): Promise<Membership> {
  await mockDelay();
  const found = db.find((membership) => membership.id === id);
  if (!found) throw new Error('Membership not found');
  const idx = await scopeIndex();
  if (!idx.visibleIds.has(found.clubId)) throw new Error('Membership not found');
  return deepCopy(found);
}

export async function getMembershipStats(): Promise<MembershipStats> {
  await mockDelay();
  const idx = await scopeIndex();
  return computeMembershipStats([...db], idx, NOW);
}
