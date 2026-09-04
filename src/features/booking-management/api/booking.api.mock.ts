import { mockDelay } from '@shared/lib/mock';
import { getFacilities } from '@features/facility-management/api';
import {
  buildBookingListResult,
  buildFacilityScopeIndex,
  computeBookingStats,
  type FacilityScopeIndex,
} from './booking.filter';
import type {
  BlockReason,
  Booking,
  BookingCheckIn,
  BookingFacilityKind,
  BookingGuest,
  BookingListParams,
  BookingListResult,
  BookingMoney,
  BookingSource,
  BookingSport,
  BookingStats,
  BookingStatus,
  BookingTimelineEntry,
  PaymentMethod,
  PaymentStatus,
} from './booking.types';

// ---------------------------------------------------------------------------
// Time helpers (deterministic, computed once at module load)
// ---------------------------------------------------------------------------

const NOW = Date.now();
const DAY = 86_400_000;
const HOUR = 3_600_000;

function isoHoursAgo(hours: number): string {
  return new Date(NOW - hours * HOUR).toISOString();
}
function isoDaysAgo(days: number): string {
  return new Date(NOW - days * DAY).toISOString();
}
function isoDaysAhead(days: number): string {
  return isoDaysAgo(-days);
}
function shift(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * HOUR).toISOString();
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
function addHours(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + hours * 60;
  return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
}

function pravatar(n: number): string {
  return `https://i.pravatar.cc/512?img=${n}`;
}
function synthPhone(n: number): string {
  return `+963 9${String(12_000_000 + ((n * 7919) % 88_000_000)).slice(0, 8)}`;
}

function computeMoney(pricePerHour: number, hours: number): BookingMoney {
  const applied = pricePerHour * hours;
  const fees = Math.round(applied * 0.03);
  const tax = 0;
  return { appliedPriceSyp: applied, feesSyp: fees, taxSyp: tax, totalSyp: applied + fees + tax };
}
const ZERO_MONEY: BookingMoney = { appliedPriceSyp: 0, feesSyp: 0, taxSyp: 0, totalSyp: 0 };

// ---------------------------------------------------------------------------
// Reference facilities (ids/names copied verbatim from facility-management seeds)
// ---------------------------------------------------------------------------

interface CourtRef {
  court: string;
  sport: BookingSport;
}

/** Clubs (facilityKind 'club') — bookings carry a courtName. */
const CLUBS: Record<string, { name: string; courts: CourtRef[] }> = {
  f3: {
    name: 'Qasioun Heights Club',
    courts: [
      { court: 'Main Pitch', sport: 'football' },
      { court: 'Court A', sport: 'basketball' },
      { court: 'Olympic Pool', sport: 'swimming' },
    ],
  },
  f5: {
    name: 'Abu Rummaneh Racquet Club',
    courts: [
      { court: 'Clay Court 1', sport: 'tennis' },
      { court: 'Clay Court 2', sport: 'tennis' },
      { court: 'Padel Dome', sport: 'padel' },
    ],
  },
  f10: {
    name: 'Citadel Sports Complex',
    courts: [
      { court: 'Arena A', sport: 'basketball' },
      { court: 'Arena B', sport: 'basketball' },
      { court: 'Beach Court', sport: 'volleyball' },
      { court: 'Rooftop Court', sport: 'basketball' },
    ],
  },
  f14: {
    name: 'Orontes Sports City',
    courts: [
      { court: 'Grand Pitch', sport: 'football' },
      { court: 'Five-a-side Cage', sport: 'football' },
      { court: 'Indoor Pool', sport: 'swimming' },
    ],
  },
  f17: {
    name: 'Blue Beach Sports Club',
    courts: [
      { court: 'Seaside Tennis 1', sport: 'tennis' },
      { court: 'Padel Bay', sport: 'padel' },
      { court: 'Lagoon Pool', sport: 'swimming' },
    ],
  },
  // ORPHAN — inside the inactive Hama region (super-admin-only visibility).
  f21: {
    name: 'Hama Norias Sports Club',
    courts: [
      { court: 'Noria Pitch', sport: 'football' },
      { court: 'River Court', sport: 'tennis' },
    ],
  },
  // Suspended — carries a historical completed booking.
  f7: { name: 'Umayyad Aquatic & Tennis Club', courts: [{ court: 'Grass Court', sport: 'tennis' }] },
  // Pending.
  f1: {
    name: 'Al-Baramkeh Sports Club',
    courts: [
      { court: 'Center Court', sport: 'tennis' },
      { court: 'Padel Cage 1', sport: 'padel' },
    ],
  },
};

/** Pitches (facilityKind 'pitch') — a pitch IS its own court (no courtName). */
const PITCHES: Record<string, { name: string; sport: BookingSport }> = {
  f4: { name: 'Barada Riverside Pitch', sport: 'football' },
  f11: { name: 'Al-Aziziyah Community Pitch', sport: 'football' },
  f19: { name: 'Tartus Marina Pitch', sport: 'football' },
  f23: { name: 'Raqqa North Pitch', sport: 'football' }, // TRUE orphan
  f2: { name: 'Mezzeh Padel Arena', sport: 'padel' }, // pending
  f16: { name: 'Latakia Coastal Pitch', sport: 'padel' }, // pending
};

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

interface PlayerRef {
  id: string;
  name: string;
  noShow?: number;
  img: number;
}

const PLAYERS: PlayerRef[] = [
  { id: '500', name: 'Yara Ibrahim', img: 45 },
  { id: '501', name: 'Kareem Saleh', img: 12 },
  { id: '502', name: 'Lana Haddad', img: 5 },
  { id: '503', name: 'Omar Nasr', noShow: 4, img: 33 },
  { id: '504', name: 'Sara Deeb', img: 47 },
  { id: '505', name: 'Hadi Mansour', noShow: 2, img: 15 },
  { id: '506', name: 'Nour Aziz', img: 24 },
  { id: '507', name: 'Bilal Khoury', img: 51 },
  { id: '509', name: 'Ziad Fares', noShow: 5, img: 60 },
  { id: '511', name: 'Tarek Wehbe', img: 8 },
  { id: '512', name: 'Dina Rahal', img: 20 },
  { id: '514', name: 'Lina Kassem', img: 29 },
  { id: '515', name: 'Fadi Barakat', img: 41 },
];

function player(id: string): PlayerRef {
  const found = PLAYERS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown player ${id}`);
  return found;
}

// ---------------------------------------------------------------------------
// Booking factory
// ---------------------------------------------------------------------------

interface Seed {
  facilityId: string;
  /** Club court (omitted for pitch bookings). */
  court?: CourtRef;
  player?: PlayerRef;
  guest?: BookingGuest;
  blockTitle?: string;
  blockReason?: BlockReason;
  date: string;
  startTime: string;
  hours: number;
  pricePerHour: number;
  status: BookingStatus;
  source: BookingSource;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  checkIn?: BookingCheckIn;
  recurringSeriesId?: string;
  notes?: string;
  /** Note attached to the terminal timeline entry (cancelled / rejected / no_show). */
  statusNote?: string;
  moneyOverride?: BookingMoney;
}

let seq = 0;

function buildTimeline(seed: Seed, createdAt: string): BookingTimelineEntry[] {
  if (seed.source === 'private') {
    return [{ status: 'confirmed', at: createdAt, note: seed.blockTitle }];
  }
  const created = createdAt;
  const entries: BookingTimelineEntry[] = [{ status: 'under_review', at: created }];
  switch (seed.status) {
    case 'under_review':
      break;
    case 'confirmed':
      entries.push({ status: 'confirmed', at: shift(created, 2) });
      break;
    case 'completed':
      entries.push({ status: 'confirmed', at: shift(created, 2) });
      entries.push({ status: 'completed', at: shift(seed.date, seed.hours) });
      break;
    case 'cancelled':
      entries.push({ status: 'confirmed', at: shift(created, 2) });
      entries.push({ status: 'cancelled', at: shift(created, 20), note: seed.statusNote });
      break;
    case 'rejected':
      entries.push({ status: 'rejected', at: shift(created, 3), note: seed.statusNote });
      break;
    case 'no_show':
      entries.push({ status: 'confirmed', at: shift(created, 2) });
      entries.push({ status: 'no_show', at: shift(seed.date, seed.hours), note: seed.statusNote });
      break;
  }
  return entries;
}

function makeBooking(input: Seed & { createdAt: string }): Booking {
  seq += 1;
  const id = `bk-${seq}`;
  const reference = `BPL-${new Date(input.createdAt).getFullYear()}-${String(seq).padStart(6, '0')}`;

  const club = CLUBS[input.facilityId];
  const pitch = PITCHES[input.facilityId];
  const facilityName = club?.name ?? pitch?.name ?? '';
  const facilityKind: BookingFacilityKind = club ? 'club' : 'pitch';
  const courtName = club ? input.court?.court : undefined;
  const sport: BookingSport = club
    ? (input.court?.sport ?? 'football')
    : (pitch?.sport ?? 'football');

  const endTime = addHours(input.startTime, input.hours);
  const money = input.moneyOverride ?? computeMoney(input.pricePerHour, input.hours);
  const activePlayer = input.player;

  return {
    id,
    reference,
    playerId: activePlayer?.id,
    playerName: activePlayer?.name,
    playerPhotoUrl: activePlayer ? pravatar(activePlayer.img) : undefined,
    playerNoShowViolations: activePlayer?.noShow,
    guest: input.guest,
    blockTitle: input.blockTitle,
    blockReason: input.blockReason,
    facilityId: input.facilityId,
    facilityName,
    facilityKind,
    courtName,
    sport,
    date: input.date,
    startTime: input.startTime,
    endTime,
    durationHours: input.hours,
    status: input.status,
    source: input.source,
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentMethod,
    money,
    checkIn: input.checkIn,
    recurringSeriesId: input.recurringSeriesId,
    notes: input.notes,
    timeline: buildTimeline(input, input.createdAt),
    createdAt: input.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Flagship bookings — hand-authored to cover every combination
// ---------------------------------------------------------------------------

const flagship: Booking[] = [
  // 1 — electronic / confirmed / paid / QR-less upcoming
  makeBooking({
    facilityId: 'f3',
    court: { court: 'Main Pitch', sport: 'football' },
    player: player('500'),
    date: isoDaysAhead(3),
    startTime: '18:00',
    hours: 2,
    pricePerHour: 90_000,
    status: 'confirmed',
    source: 'electronic',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    createdAt: isoDaysAgo(2),
  }),
  // 2 — electronic / completed / paid / manual check-in
  makeBooking({
    facilityId: 'f5',
    court: { court: 'Clay Court 1', sport: 'tennis' },
    player: player('501'),
    date: isoDaysAgo(6),
    startTime: '10:00',
    hours: 1,
    pricePerHour: 55_000,
    status: 'completed',
    source: 'electronic',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    checkIn: { checkedInAt: isoDaysAgo(6), method: 'manual' },
    createdAt: isoDaysAgo(9),
  }),
  // 3 — electronic / under_review / unpaid
  makeBooking({
    facilityId: 'f10',
    court: { court: 'Arena A', sport: 'basketball' },
    player: player('502'),
    date: isoDaysAhead(5),
    startTime: '20:00',
    hours: 1,
    pricePerHour: 75_000,
    status: 'under_review',
    source: 'electronic',
    paymentStatus: 'unpaid',
    createdAt: isoHoursAgo(8),
  }),
  // 4 — electronic / cancelled / refunded
  makeBooking({
    facilityId: 'f14',
    court: { court: 'Grand Pitch', sport: 'football' },
    player: player('504'),
    date: isoDaysAgo(4),
    startTime: '16:00',
    hours: 2,
    pricePerHour: 85_000,
    status: 'cancelled',
    source: 'electronic',
    paymentStatus: 'refunded',
    paymentMethod: 'transfer',
    statusNote: 'Player cancelled 24h before; deposit refunded to the same transfer.',
    createdAt: isoDaysAgo(8),
  }),
  // 5 — electronic / no_show / unpaid (NO check-in)
  makeBooking({
    facilityId: 'f17',
    court: { court: 'Padel Bay', sport: 'padel' },
    player: player('503'),
    date: isoDaysAgo(3),
    startTime: '12:00',
    hours: 1,
    pricePerHour: 70_000,
    status: 'no_show',
    source: 'electronic',
    paymentStatus: 'unpaid',
    statusNote: 'Party never arrived; counted as a no-show violation.',
    createdAt: isoDaysAgo(7),
  }),
  // 6 — electronic / rejected / unpaid
  makeBooking({
    facilityId: 'f4',
    player: player('505'),
    date: isoDaysAgo(10),
    startTime: '08:00',
    hours: 1,
    pricePerHour: 40_000,
    status: 'rejected',
    source: 'electronic',
    paymentStatus: 'unpaid',
    statusNote: 'Facility rejected the request — slot already reserved for maintenance.',
    createdAt: isoDaysAgo(11),
  }),
  // 7 — manual / confirmed / paid (transfer), registered player
  makeBooking({
    facilityId: 'f5',
    court: { court: 'Padel Dome', sport: 'padel' },
    player: player('506'),
    date: isoDaysAhead(2),
    startTime: '18:00',
    hours: 1,
    pricePerHour: 65_000,
    status: 'confirmed',
    source: 'manual',
    paymentStatus: 'paid',
    paymentMethod: 'transfer',
    notes: 'Booked over the phone; paid by bank transfer.',
    createdAt: isoDaysAgo(1),
  }),
  // 8 — manual / confirmed / unpaid — GUEST walk-in
  makeBooking({
    facilityId: 'f11',
    guest: { name: 'Walk-in: Karim', phone: '+963 991 447 260' },
    date: isoDaysAhead(1),
    startTime: '16:00',
    hours: 1,
    pricePerHour: 25_000,
    status: 'confirmed',
    source: 'manual',
    paymentStatus: 'unpaid',
    createdAt: isoHoursAgo(20),
  }),
  // 9 — manual / completed / paid (cash) — GUEST + manual check-in
  makeBooking({
    facilityId: 'f19',
    guest: { name: 'Walk-in: Salma', phone: '+963 933 118 095' },
    date: isoDaysAgo(5),
    startTime: '14:00',
    hours: 1,
    pricePerHour: 32_000,
    status: 'completed',
    source: 'manual',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    checkIn: { checkedInAt: isoDaysAgo(5), method: 'manual' },
    createdAt: isoDaysAgo(6),
  }),
  // 10 — private / block (event) — "Corporate Tournament", total 400000
  makeBooking({
    facilityId: 'f10',
    court: { court: 'Rooftop Court', sport: 'basketball' },
    blockTitle: 'Corporate Tournament',
    blockReason: 'event',
    date: isoDaysAhead(6),
    startTime: '10:00',
    hours: 6,
    pricePerHour: 0,
    status: 'confirmed',
    source: 'private',
    paymentStatus: 'unpaid',
    moneyOverride: { appliedPriceSyp: 400_000, feesSyp: 0, taxSyp: 0, totalSyp: 400_000 },
    createdAt: isoDaysAgo(3),
  }),
  // 11 — private / block (maintenance) — total 0
  makeBooking({
    facilityId: 'f14',
    court: { court: 'Indoor Pool', sport: 'swimming' },
    blockTitle: 'Pool maintenance',
    blockReason: 'maintenance',
    date: isoDaysAhead(4),
    startTime: '08:00',
    hours: 4,
    pricePerHour: 0,
    status: 'confirmed',
    source: 'private',
    paymentStatus: 'unpaid',
    moneyOverride: ZERO_MONEY,
    createdAt: isoDaysAgo(2),
  }),
  // 12 — private / block (holiday)
  makeBooking({
    facilityId: 'f3',
    court: { court: 'Court A', sport: 'basketball' },
    blockTitle: 'Eid holiday closure',
    blockReason: 'holiday',
    date: isoDaysAhead(9),
    startTime: '08:00',
    hours: 8,
    pricePerHour: 0,
    status: 'confirmed',
    source: 'private',
    paymentStatus: 'unpaid',
    moneyOverride: ZERO_MONEY,
    createdAt: isoDaysAgo(1),
  }),
  // 13 — electronic / completed / paid — ORPHAN club f21 (super-admin-only)
  makeBooking({
    facilityId: 'f21',
    court: { court: 'Noria Pitch', sport: 'football' },
    player: player('507'),
    date: isoDaysAgo(12),
    startTime: '18:00',
    hours: 1,
    pricePerHour: 34_000,
    status: 'completed',
    source: 'electronic',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    createdAt: isoDaysAgo(15),
  }),
  // 14 — electronic / confirmed / paid — TRUE ORPHAN pitch f23 (super-admin-only)
  makeBooking({
    facilityId: 'f23',
    player: player('509'),
    date: isoDaysAhead(7),
    startTime: '16:00',
    hours: 1,
    pricePerHour: 26_000,
    status: 'confirmed',
    source: 'electronic',
    paymentStatus: 'paid',
    paymentMethod: 'transfer',
    createdAt: isoDaysAgo(2),
  }),
  // 15 — electronic / completed / paid — historical booking on suspended f7 (QR check-in)
  makeBooking({
    facilityId: 'f7',
    court: { court: 'Grass Court', sport: 'tennis' },
    player: player('511'),
    date: isoDaysAgo(200),
    startTime: '10:00',
    hours: 1,
    pricePerHour: 68_000,
    status: 'completed',
    source: 'electronic',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    checkIn: { checkedInAt: isoDaysAgo(200), method: 'qr' },
    createdAt: isoDaysAgo(203),
  }),
  // 16 — electronic / cancelled / unpaid — pending facility f2
  makeBooking({
    facilityId: 'f2',
    player: player('512'),
    date: isoDaysAgo(2),
    startTime: '20:00',
    hours: 1,
    pricePerHour: 55_000,
    status: 'cancelled',
    source: 'electronic',
    paymentStatus: 'unpaid',
    statusNote: 'Cancelled by the player before confirmation.',
    createdAt: isoDaysAgo(5),
  }),
  // 17 — electronic / rejected / unpaid — pending facility f16
  makeBooking({
    facilityId: 'f16',
    player: player('514'),
    date: isoDaysAgo(14),
    startTime: '12:00',
    hours: 2,
    pricePerHour: 50_000,
    status: 'rejected',
    source: 'electronic',
    paymentStatus: 'unpaid',
    statusNote: 'Rejected — the facility is still under review and not yet bookable.',
    createdAt: isoDaysAgo(15),
  }),
  // 18 — electronic / no_show / unpaid (2nd no-show, NO check-in)
  makeBooking({
    facilityId: 'f17',
    court: { court: 'Lagoon Pool', sport: 'swimming' },
    player: player('515'),
    date: isoDaysAgo(8),
    startTime: '14:00',
    hours: 1,
    pricePerHour: 80_000,
    status: 'no_show',
    source: 'electronic',
    paymentStatus: 'unpaid',
    statusNote: 'No-show — booking forfeited.',
    createdAt: isoDaysAgo(11),
  }),
  // 19 — electronic / confirmed / paid — RECURRING series + notes
  makeBooking({
    facilityId: 'f5',
    court: { court: 'Clay Court 2', sport: 'tennis' },
    player: player('500'),
    date: isoDaysAhead(3),
    startTime: '20:00',
    hours: 1,
    pricePerHour: 55_000,
    status: 'confirmed',
    source: 'electronic',
    paymentStatus: 'paid',
    paymentMethod: 'transfer',
    recurringSeriesId: 'rec-2026-tue-01',
    notes: 'Weekly league fixture — recurs every Tuesday evening.',
    createdAt: isoDaysAgo(10),
  }),
  // 20 — electronic / under_review / unpaid — pending facility f1 (2nd under_review)
  makeBooking({
    facilityId: 'f1',
    court: { court: 'Center Court', sport: 'tennis' },
    player: player('506'),
    date: isoDaysAhead(8),
    startTime: '18:00',
    hours: 1,
    pricePerHour: 60_000,
    status: 'under_review',
    source: 'electronic',
    paymentStatus: 'unpaid',
    createdAt: isoHoursAgo(30),
  }),
];

// ---------------------------------------------------------------------------
// Filler bookings — ~100 rotated across the active facilities + club courts
// ---------------------------------------------------------------------------

interface Target {
  facilityId: string;
  court?: CourtRef;
}

const FILLER_TARGETS: Target[] = [
  ...(['f3', 'f5', 'f10', 'f14', 'f17', 'f21'] as const).flatMap((id) =>
    CLUBS[id].courts.map((court) => ({ facilityId: id, court })),
  ),
  { facilityId: 'f4' },
  { facilityId: 'f11' },
  { facilityId: 'f19' },
];

const SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

// Skewed toward confirmed / completed.
const FILLER_STATUS_CYCLE: BookingStatus[] = [
  'confirmed',
  'completed',
  'confirmed',
  'completed',
  'confirmed',
  'under_review',
  'completed',
  'confirmed',
  'cancelled',
  'completed',
  'confirmed',
  'no_show',
  'completed',
  'confirmed',
  'rejected',
];

const BLOCK_REASON_CYCLE: BlockReason[] = ['maintenance', 'event', 'holiday'];
const BLOCK_TITLE: Record<BlockReason, string> = {
  maintenance: 'Scheduled maintenance',
  holiday: 'Public holiday closure',
  event: 'Private event booking',
};
const GUEST_NAMES = [
  'Walk-in: Rami',
  'Walk-in: Huda',
  'Walk-in: Samir',
  'Walk-in: Aya',
  'Walk-in: Firas',
];

function paymentFor(status: BookingStatus, index: number, source: BookingSource): PaymentStatus {
  if (source === 'private') return 'unpaid';
  switch (status) {
    case 'completed':
      return 'paid';
    case 'confirmed':
      return index % 4 === 0 ? 'unpaid' : 'paid';
    case 'cancelled':
      return index % 2 === 0 ? 'refunded' : 'unpaid';
    case 'under_review':
    case 'rejected':
    case 'no_show':
    default:
      return 'unpaid';
  }
}

function buildFillers(count: number): Booking[] {
  const out: Booking[] = [];
  for (let i = 0; i < count; i += 1) {
    const target = FILLER_TARGETS[i % FILLER_TARGETS.length];
    const activePlayer = PLAYERS[i % PLAYERS.length];
    const off = 58 - ((i * 5) % 72); // +58 (past) .. -13 (future)
    const date = isoDaysAgo(off);
    const createdAt = isoDaysAgo(Math.max(off + 4, 1));
    const hours = i % 3 === 0 ? 2 : 1;
    const pricePerHour = 25_000 + (i % 20) * 5_000; // 25k..120k
    const startTime = SLOTS[i % SLOTS.length];

    const sourcePick = i % 10;
    const source: BookingSource =
      sourcePick < 7 ? 'electronic' : sourcePick < 9 ? 'manual' : 'private';

    let status = FILLER_STATUS_CYCLE[i % FILLER_STATUS_CYCLE.length];
    const isFuture = off <= 0;
    if (isFuture && (status === 'completed' || status === 'no_show')) status = 'confirmed';
    if (source === 'private') status = 'confirmed';

    const paymentStatus = paymentFor(status, i, source);
    const paymentMethod: PaymentMethod | undefined =
      paymentStatus === 'paid' || paymentStatus === 'refunded'
        ? i % 2 === 0
          ? 'cash'
          : 'transfer'
        : undefined;
    const checkIn: BookingCheckIn | undefined =
      status === 'completed' ? { checkedInAt: date, method: i % 2 === 0 ? 'qr' : 'manual' } : undefined;

    const seed: Seed & { createdAt: string } = {
      facilityId: target.facilityId,
      court: target.court,
      date,
      startTime,
      hours,
      pricePerHour,
      status,
      source,
      paymentStatus,
      paymentMethod,
      checkIn,
      createdAt,
    };

    if (source === 'private') {
      const reason = BLOCK_REASON_CYCLE[i % BLOCK_REASON_CYCLE.length];
      seed.blockTitle = BLOCK_TITLE[reason];
      seed.blockReason = reason;
      seed.moneyOverride = reason === 'event' ? computeMoney(pricePerHour, hours) : ZERO_MONEY;
    } else if (source === 'manual' && i % 2 === 0) {
      seed.guest = { name: GUEST_NAMES[i % GUEST_NAMES.length], phone: synthPhone(i) };
    } else {
      seed.player = activePlayer;
    }

    out.push(makeBooking(seed));
  }
  return out;
}

// ~120 total: 20 flagship + 100 filler.
const db: Booking[] = [...flagship, ...buildFillers(100)];

// ---------------------------------------------------------------------------
// Scope + API surface (mirrors booking.api.ts exactly)
// ---------------------------------------------------------------------------

async function scopeIndex(): Promise<FacilityScopeIndex> {
  const { items } = await getFacilities({ page: 1, pageSize: 1000 });
  return buildFacilityScopeIndex(items);
}

function clone(booking: Booking): Booking {
  return {
    ...booking,
    guest: booking.guest ? { ...booking.guest } : undefined,
    money: { ...booking.money },
    checkIn: booking.checkIn ? { ...booking.checkIn } : undefined,
    timeline: booking.timeline.map((entry) => ({ ...entry })),
  };
}

export async function getBookings(params: BookingListParams): Promise<BookingListResult> {
  await mockDelay();
  const idx = await scopeIndex();
  return buildBookingListResult([...db], params, idx);
}

export async function getBookingById(id: string): Promise<Booking> {
  await mockDelay();
  const idx = await scopeIndex();
  const booking = db.find((entry) => entry.id === id);
  // Not found OR outside the caller's scope both read as "not found".
  if (!booking || !idx.visibleIds.has(booking.facilityId)) throw new Error('Booking not found');
  return clone(booking);
}

export async function getBookingStats(): Promise<BookingStats> {
  await mockDelay();
  const idx = await scopeIndex();
  return computeBookingStats([...db], idx);
}
