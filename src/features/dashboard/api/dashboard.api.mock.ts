import { mockDelay } from '@shared/lib/mock';
import type {
  DashboardData,
  DashboardParams,
  RangeKey,
  RegionScope,
  RegionRow,
  Segment,
} from './dashboard.types';

/**
 * Self-contained dashboard fixture. Numbers match the platform-wide mock volumes
 * used across the other features (24 facilities, 16 players/owners, ~1.2K
 * bookings, 55 subscriptions, 14 posts, 6 live regions). Range and region
 * selectors deterministically scale/scope the figures so the filters feel live.
 * Going live: `dashboard.api.ts` replaces this with a real endpoint call.
 */

/** Volume multiplier per time-range (flow metrics only). */
const RANGE_SCALE: Record<RangeKey, number> = {
  today: 0.06,
  '7d': 0.25,
  '30d': 1,
  '90d': 2.85,
  month: 1,
};

interface RegionSeed {
  id: string;
  name: string;
  players: number;
  facilities: number;
  bookings: number;
  gmvM: number;
  occupancy: number;
  rating: number;
}

/** Six live regions — their bookings sum to the platform total (1,240). */
const REGION_SEED: readonly RegionSeed[] = [
  { id: 'c1', name: 'Damascus', players: 6, facilities: 8, bookings: 512, gmvM: 20.4, occupancy: 74, rating: 4.6 },
  { id: 'c2', name: 'Aleppo', players: 4, facilities: 4, bookings: 268, gmvM: 9.8, occupancy: 61, rating: 4.4 },
  { id: 'c3', name: 'Homs', players: 2, facilities: 3, bookings: 176, gmvM: 6.2, occupancy: 58, rating: 4.5 },
  { id: 'c4', name: 'Latakia', players: 2, facilities: 3, bookings: 148, gmvM: 5.6, occupancy: 66, rating: 4.7 },
  { id: 'c5', name: 'Hama', players: 1, facilities: 1, bookings: 74, gmvM: 3.1, occupancy: 49, rating: 4.2 },
  { id: 'c6', name: 'Tartus', players: 1, facilities: 2, bookings: 62, gmvM: 3.5, occupancy: 71, rating: 4.5 },
];

const TOTAL_BOOKINGS = REGION_SEED.reduce((s, r) => s + r.bookings, 0);

/** Region scope → share of the platform (drives all region-scoped figures). */
function regionFactor(regionId: RegionScope): number {
  if (regionId === 'all') return 1;
  if (regionId === 'orphan') return 0.03;
  const region = REGION_SEED.find((r) => r.id === regionId);
  return region ? region.bookings / TOTAL_BOOKINGS : 1;
}

const si = (n: number, factor: number) => Math.max(0, Math.round(n * factor));
const arr = (a: number[], factor: number) => a.map((v) => Math.round(v * factor));

/** Weekday × hour demand intensities (deterministic — evenings & weekends busier). */
function buildHeatmap(): number[][] {
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 8 }, (_, h) => {
      const evening = h >= 4 ? 1 : 0.5;
      const weekend = d >= 5 ? 1.1 : 0.85;
      const v = ((Math.sin(d * 1.3 + h) + 1) / 2) * evening * weekend;
      return Math.min(1, Math.round(v * 100) / 100);
    }),
  );
}

function buildRegions(range: RangeKey, regionId: RegionScope): RegionRow[] {
  if (regionId === 'orphan') return [];
  const r = RANGE_SCALE[range];
  const rows = REGION_SEED.map((seed) => ({
    id: seed.id,
    name: seed.name,
    players: seed.players,
    facilities: seed.facilities,
    bookings: si(seed.bookings, r),
    gmvM: Math.round(seed.gmvM * r * 10) / 10,
    occupancy: seed.occupancy,
    rating: seed.rating,
  }));
  return regionId === 'all' ? rows : rows.filter((row) => row.id === regionId);
}

export async function getDashboard(params: DashboardParams): Promise<DashboardData> {
  await mockDelay();

  const range = RANGE_SCALE[params.range];
  const scope = regionFactor(params.regionId); // region share
  const flow = range * scope; // range × region for flow metrics

  const regions = buildRegions(params.range, params.regionId);
  const scatter = regions.map((row) => ({
    region: row.name,
    supply: row.facilities * 12,
    demand: Math.round(row.bookings / 6),
    gmv: row.gmvM,
  }));

  const pendingFacilities = si(6, scope);
  const pendingOwners = si(3, scope);

  const attentionAll = [
    { key: 'pendingFacilities', tone: 'danger' as const, count: pendingFacilities, metaKey: 'oldest4d', to: '/app/facility-management?tab=queue' },
    { key: 'pendingOwners', tone: 'danger' as const, count: pendingOwners, metaKey: 'oldest2d', to: '/app/owner-management' },
    { key: 'playerReports', tone: 'danger' as const, count: si(2, scope), metaKey: 'recent', to: '/app/player-management' },
    { key: 'flaggedPosts', tone: 'caution' as const, count: si(1, scope), metaKey: 'recent', to: '/app/community-management' },
    { key: 'orphanFacilities', tone: 'caution' as const, count: si(4, scope), metaKey: 'coverageGap', to: '/app/region-management' },
    { key: 'nearExpiry', tone: 'warning' as const, count: si(7, scope), metaKey: 'within7d', to: '/app/club-subscriptions' },
    { key: 'idleFacilities', tone: 'warning' as const, count: si(3, scope), metaKey: 'lowOccupancy', to: '/app/facility-management?tab=directory' },
    { key: 'newSubscriptions', tone: 'success' as const, count: si(5, flow), metaKey: 'today', to: '/app/club-subscriptions' },
  ].filter((a) => a.count > 0);

  return {
    asOf: new Date().toISOString(),

    hero: {
      bookings: si(1240, flow),
      bookingsDeltaPct: 18,
      targetPct: 87,
      gmvSyp: si(48_600_000, flow),
      gmvDeltaPct: 12,
      bookingsSpark: arr([820, 910, 880, 960, 1040, 1010, 1120, 1180, 1150, 1240], flow),
      gmvSpark: arr([30, 34, 33, 38, 41, 44, 46, 48.6], flow),
    },

    kpis: [
      { key: 'gmv', value: si(48_600_000, flow), money: true, deltaPct: 12, accent: 'secondary', spark: arr([30, 34, 33, 38, 41, 44, 46, 48.6], flow), to: '/app/booking-management' },
      { key: 'facilities', value: si(10, scope), denom: si(24, scope), note: { key: 'newThisPeriod', count: si(2, flow) }, accent: 'info', to: '/app/facility-management?tab=directory' },
      { key: 'players', value: si(13, scope), denom: si(16, scope), note: { key: 'newThisPeriod', count: si(3, flow) }, accent: 'info', to: '/app/player-management' },
      { key: 'subscriptions', value: si(41, scope), denom: si(55, scope), deltaPct: -4, invert: true, accent: 'primary', to: '/app/club-subscriptions' },
      { key: 'owners', value: si(10, scope), denom: si(16, scope), note: { key: 'underReview', count: pendingOwners }, accent: 'sage', to: '/app/owner-management' },
      { key: 'regions', value: si(6, scope) || 1, extra: { key: 'unassigned', count: si(3, scope) }, accent: 'sage', to: '/app/region-management' },
      { key: 'community', value: si(14, flow), extra: { key: 'reactions', count: si(92, flow) }, deltaPct: 22, accent: 'primary', to: '/app/community-management' },
      { key: 'b2bRevenue', value: si(3_200_000, flow), money: true, deltaPct: 9, accent: 'secondary', to: '/app/owner-management' },
    ],

    attention: attentionAll,
    attentionTotal: pendingFacilities + pendingOwners,

    scatter,

    funnel: [
      { key: 'requested', value: si(1580, flow), color: 'blue' },
      { key: 'confirmed', value: si(1240, flow), color: 'mint' },
      { key: 'paid', value: si(1120, flow), color: 'amber' },
      { key: 'completed', value: si(1040, flow), color: 'green' },
    ],

    trend: {
      labels: ['W1', 'W2', 'W3', 'W4'],
      series: [
        { key: 'bookings', color: 'mint', data: arr([980, 1060, 1130, 1240], flow) },
        { key: 'gmv', color: 'amber', data: arr([720, 810, 900, 972], flow) },
      ],
    },

    composition: {
      keys: [
        { key: 'confirmed', color: 'green' },
        { key: 'cancelled', color: 'red' },
        { key: 'noShow', color: 'gray' },
      ],
      points: [
        { label: 'W1', vals: [62, 30, 8] },
        { label: 'W2', vals: [66, 28, 6] },
        { label: 'W3', vals: [70, 24, 6] },
        { label: 'W4', vals: [73, 22, 5] },
      ],
    },

    bookingStatus: ([
      { key: 'confirmed', value: si(1240, flow), color: 'green' },
      { key: 'completed', value: si(1040, flow), color: 'blue' },
      { key: 'cancelled', value: si(132, flow), color: 'red' },
      { key: 'noShow', value: si(68, flow), color: 'gray' },
      { key: 'underReview', value: si(40, flow), color: 'gold' },
    ] as Segment[]).filter((s) => s.value > 0),

    heatmap: buildHeatmap(),

    regions,

    facilityPipeline: ([
      { key: 'active', value: si(10, scope), color: 'green' },
      { key: 'pending', value: pendingFacilities, color: 'gold' },
      { key: 'rejected', value: si(3, scope), color: 'red' },
      { key: 'suspended', value: si(3, scope), color: 'orange' },
      { key: 'ownerSuspended', value: si(2, scope), color: 'gray' },
    ] as Segment[]).filter((s) => s.value > 0),

    topFacilities: [
      { label: 'Elite Padel', value: si(8_200_000, flow) },
      { label: 'GreenCourt', value: si(6_400_000, flow) },
      { label: 'AreenClub', value: si(5_100_000, flow) },
      { label: 'Shabab FC', value: si(4_300_000, flow) },
      { label: 'Barada', value: si(3_600_000, flow) },
    ],

    subStatus: ([
      { key: 'active', value: si(41, scope), color: 'green' },
      { key: 'pending', value: si(5, scope), color: 'gold' },
      { key: 'paused', value: si(4, scope), color: 'orange' },
      { key: 'expired', value: si(3, scope), color: 'gray' },
      { key: 'cancelled', value: si(2, scope), color: 'red' },
    ] as Segment[]).filter((s) => s.value > 0),

    recurring: {
      mrrSyp: si(6_400_000, flow),
      churnPct: 4.2,
      nearExpiry: si(7, scope),
    },

    activity: [
      { key: 'a1', tone: 'success', kind: 'booking_confirmed', params: { ref: 'B-1240', facility: 'Elite Padel', region: 'Damascus' }, minutesAgo: 2 },
      { key: 'a2', tone: 'warning', kind: 'facility_submitted', params: { facility: 'GreenCourt', region: 'Aleppo' }, minutesAgo: 18 },
      { key: 'a3', tone: 'info', kind: 'subscription_new', params: { player: 'P-091' }, minutesAgo: 41 },
      { key: 'a4', tone: 'danger', kind: 'player_report', params: {}, minutesAgo: 62 },
      { key: 'a5', tone: 'success', kind: 'owner_approved', params: { owner: 'Barada Sports' }, minutesAgo: 120 },
      { key: 'a6', tone: 'caution', kind: 'post_flagged', params: {}, minutesAgo: 180 },
    ],
  };
}

/** Region options for the scope selector (id + display name). */
export function getDashboardRegions(): Promise<{ id: string; name: string }[]> {
  return Promise.resolve(REGION_SEED.map((r) => ({ id: r.id, name: r.name })));
}
