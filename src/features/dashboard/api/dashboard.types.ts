/**
 * Super-Admin Dashboard ("Platform Overview") — domain types.
 *
 * The whole screen is fed by ONE typed payload, `DashboardData`, resolved by a
 * single service call (`getDashboard(params)`). Today that call is served from a
 * self-contained mock fixture; going live = the real service hits
 * `GET /admin/statistics/overview` and maps its DTO into these exact shapes, so
 * no component changes when the backend arrives.
 */

/** Global time-range presets that drive every widget. */
export type RangeKey = 'today' | '7d' | '30d' | '90d' | 'month';

/** Region scope: a live region id, the whole platform, or the orphan pool. */
export type RegionScope = string; // 'all' | 'orphan' | region id (e.g. 'c1')

export interface DashboardParams {
  range: RangeKey;
  regionId: RegionScope;
}

/** Semantic tones shared by attention rows and the activity feed. */
export type Tone = 'danger' | 'caution' | 'warning' | 'success' | 'info';

/** Named series colors — each maps to a Pitch-Forest token (never a raw hex). */
export type SeriesColor =
  | 'mint'
  | 'amber'
  | 'blue'
  | 'gold'
  | 'orange'
  | 'red'
  | 'gray'
  | 'green'
  | 'sage';

/** Accent bar color for a KPI tile. */
export type KpiAccent = 'primary' | 'secondary' | 'info' | 'sage';

/** North-star + co-primary money, the top band. */
export interface HeroData {
  bookings: number;
  bookingsDeltaPct: number;
  targetPct: number;
  gmvSyp: number;
  gmvDeltaPct: number;
  /** Bookings micro-trend behind the hero (watermark) + GMV sparkline. */
  bookingsSpark: number[];
  gmvSpark: number[];
}

/** One card in the platform KPI bento. */
export interface KpiDatum {
  key: string;
  value: number;
  /** Render compactly with a SYP suffix. */
  money?: boolean;
  /** "/ 24" style denominator shown beside the value. */
  denom?: number;
  /** "· 92 reactions" style qualifier shown beside the value. */
  extra?: { key: string; count: number };
  /** Signed % vs the previous equal period; null → no baseline, hide the chip. */
  deltaPct?: number | null;
  /** For churn / no-show / cancellations "up = bad" — invert the delta color. */
  invert?: boolean;
  /** Bottom note when there is no delta ("+2 new", "3 under review"). */
  note?: { key: string; count?: number };
  accent: KpiAccent;
  spark?: number[];
  to: string;
}

/** A row in the urgency-ranked "Needs attention" feed. */
export interface AttentionItem {
  key: string;
  tone: Tone;
  count: number;
  /**
   * i18n key for the short meta ("oldest 4d", "within 7d"). Optional: the
   * backend only attaches one to the queue it has a timestamp for, so a row
   * without it renders with no meta line rather than the literal string
   * "dashboard.attentionMeta.undefined".
   */
  metaKey?: string;
  to: string;
}

/** Per-region comparison row (super-admin only). */
export interface RegionRow {
  id: string;
  name: string;
  players: number;
  facilities: number;
  bookings: number;
  gmvM: number; // GMV in millions SYP
  occupancy: number; // %
  rating: number; // 0–5
}

/** Generic labelled + colored value (status breakdowns, funnel stages). */
export interface Segment {
  key: string;
  value: number;
  color: SeriesColor;
}

export interface TrendSeries {
  key: string;
  color: SeriesColor;
  data: number[];
}

export interface CompositionPoint {
  label: string;
  vals: number[];
}

export interface RankRow {
  label: string;
  value: number;
}

export interface ScatterPoint {
  region: string;
  supply: number;
  demand: number;
  gmv: number;
}

/** Deterministic activity-feed entry, i18n-interpolated in the component. */
export interface ActivityItem {
  key: string;
  tone: Tone;
  kind:
    | 'booking_confirmed'
    | 'facility_submitted'
    | 'subscription_new'
    | 'player_report'
    | 'owner_approved'
    | 'post_flagged';
  params: Record<string, string | number>;
  /** Minutes ago (rendered relative in the component). */
  minutesAgo: number;
}

/** The single payload that renders the whole dashboard. */
export interface DashboardData {
  /** The time the snapshot was computed (ISO); rendered as "Data as of HH:MM". */
  asOf: string;
  hero: HeroData;
  kpis: KpiDatum[];
  attention: AttentionItem[];
  attentionTotal: number;
  scatter: ScatterPoint[];
  funnel: Segment[];
  trend: { labels: string[]; series: TrendSeries[] };
  composition: { keys: { key: string; color: SeriesColor }[]; points: CompositionPoint[] };
  bookingStatus: Segment[];
  heatmap: number[][]; // [day 0..6][hour bucket] intensity 0..1
  /** Region comparison rows — empty for a region-scoped (regional-admin) view. */
  regions: RegionRow[];
  facilityPipeline: Segment[];
  topFacilities: RankRow[];
  subStatus: Segment[];
  recurring: { mrrSyp: number; churnPct: number; nearExpiry: number };
  activity: ActivityItem[];
}
