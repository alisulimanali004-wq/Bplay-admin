import { Fragment, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { clsx } from '@ui';
import { Count } from './DashboardKit';
import { fmtCompact } from './format';
import type { RankRow, Segment, SeriesColor, TrendSeries } from '../api/dashboard.types';
import colors from './colors.module.css';
import styles from './DashboardCharts.module.css';

/** out-expo — matches the app's count-up / draw-on feel. */
const EASE = [0.22, 1, 0.36, 1] as const;

/* ── Sparkline — gradient area + drawn line + end dot ───────────────────────── */
export function Sparkline({
  data,
  color,
  w = 120,
  h = 40,
}: {
  data: number[];
  color: SeriesColor;
  w?: number;
  h?: number;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - ((d - min) / span) * (h - 6) - 3]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} className={colors[color]} role="img" aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={`${line} L ${w} ${h} L 0 ${h} Z`}
        fill={`url(#sp-${id})`}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
      />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill="currentColor" />
    </svg>
  );
}

/* ── Progress ring — threshold coloured ────────────────────────────────────── */
export function ProgressRing({ value, size = 56, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone: SeriesColor = value >= 80 ? 'green' : value >= 60 ? 'gold' : 'red';
  return (
    <svg
      width={size}
      height={size}
      className={clsx(styles.ringSpin, colors[tone])}
      role="img"
      aria-label={`${value}%`}
    >
      <circle className={styles.ringTrack} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: reduce ? c - (value / 100) * c : c }}
        animate={{ strokeDashoffset: c - (value / 100) * c }}
        transition={{ duration: 0.8, ease: EASE }}
      />
    </svg>
  );
}

/* ── Proportional segmented bar + legend ───────────────────────────────────── */
export function SegmentBar({
  segments,
  labelFor,
}: {
  segments: Segment[];
  labelFor: (key: string) => string;
}) {
  const reduce = useReducedMotion();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className={styles.segBar} role="img" aria-label={segments.map((s) => `${labelFor(s.key)} ${s.value}`).join(', ')}>
        {segments.map((s, i) => (
          <motion.span
            key={s.key}
            className={clsx(styles.seg, colors[s.color])}
            title={`${labelFor(s.key)}: ${s.value}`}
            initial={reduce ? false : { flexGrow: 0.0001, opacity: 0 }}
            animate={{ flexGrow: s.value, opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.7, delay: i * 0.08, ease: EASE }}
          />
        ))}
      </div>
      <Legend segments={segments} total={total} labelFor={labelFor} />
    </div>
  );
}

/** dot + label + counting-up value + share — shared by bars and donuts. */
export function Legend({
  segments,
  total,
  labelFor,
}: {
  segments: Segment[];
  total: number;
  labelFor: (key: string) => string;
}) {
  return (
    <ul className={styles.legend}>
      {segments.map((s) => (
        <li key={s.key} className={styles.legendItem}>
          <span className={clsx(styles.dot, colors[s.color])} aria-hidden />
          <span className={styles.legendLabel}>{labelFor(s.key)}</span>
          <Count value={s.value} className={styles.legendCount} />
          <span className={styles.legendPct}>{Math.round((s.value / total) * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Sorted horizontal ranking bars ────────────────────────────────────────── */
export function RankBars({ rows }: { rows: RankRow[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(...rows.map((r) => r.value)) || 1;
  return (
    <div className={styles.rankList}>
      {rows.map((r, i) => (
        <div key={r.label} className={styles.rankRow}>
          <span className={styles.rankLabel} title={r.label}>
            {r.label}
          </span>
          <div className={styles.rankTrack}>
            <motion.div
              className={styles.rankFill}
              initial={reduce ? false : { width: 0 }}
              whileInView={{ width: `${(r.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: EASE }}
            >
              <span className={styles.rankValue}>{fmtCompact(r.value)}</span>
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Multi-series line + area (bookings & GMV over time) ────────────────────── */
export function TrendChart({ series, labels }: { series: TrendSeries[]; labels: string[] }) {
  const reduce = useReducedMotion();
  const id = useId();
  const w = 640;
  const h = 220;
  const pad = { l: 8, r: 8, t: 14, b: 22 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const len = series[0]?.data.length ?? 0;
  const max = Math.max(...series.flatMap((s) => s.data), 1) * 1.1;
  const x = (i: number) => pad.l + (i / (len - 1)) * iw;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const grid = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.fluidSvg} role="img" aria-label="Bookings and GMV over time">
      {grid.map((g, i) => (
        <g key={i}>
          <line className={styles.gridLine} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g} strokeDasharray="4 6" />
          <text className={styles.axisText} x={w - pad.r} y={pad.t + ih * g - 4} textAnchor="end" fontSize={10}>
            {fmtCompact(Math.round(max * (1 - g)))}
          </text>
        </g>
      ))}
      {labels.map((lb, i) => (
        <text key={lb} className={styles.axisText} x={x((i * (len - 1)) / (labels.length - 1))} y={h - 6} textAnchor="middle" fontSize={11}>
          {lb}
        </text>
      ))}
      {series.map((s, si) => {
        const line = s.data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d).toFixed(1)}`).join(' ');
        return (
          <g key={s.key} className={colors[s.color]}>
            <defs>
              <linearGradient id={`la-${id}-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.15} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <motion.path
              d={`${line} L ${x(len - 1)} ${pad.t + ih} L ${x(0)} ${pad.t + ih} Z`}
              fill={`url(#la-${id}-${si})`}
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.8 }}
            />
            <motion.path
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: EASE, delay: si * 0.2 }}
            />
            {s.data.map((d, i) => (
              <circle key={i} className={styles.trendDot} cx={x(i)} cy={y(d)} r={3.5} strokeWidth={2} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* ── 100% stacked bars over time ───────────────────────────────────────────── */
export function StackedBars({
  points,
  keys,
}: {
  points: { label: string; vals: number[] }[];
  keys: { key: string; color: SeriesColor }[];
}) {
  const reduce = useReducedMotion();
  const w = 300;
  const h = 200;
  const pad = { t: 10, b: 22 };
  const ih = h - pad.t - pad.b;
  const gap = w / points.length;
  const bw = gap * 0.55;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.fluidSvg} role="img" aria-label="Fulfilment mix over time">
      {points.map((d, di) => {
        const total = d.vals.reduce((s, v) => s + v, 0) || 1;
        let acc = 0;
        const cx = gap * di + gap / 2;
        return (
          <g key={d.label}>
            {d.vals.map((v, ki) => {
              const segH = (v / total) * ih;
              const yTop = pad.t + acc;
              acc += segH;
              return (
                <motion.rect
                  key={ki}
                  className={colors[keys[ki].color]}
                  x={cx - bw / 2}
                  width={bw}
                  rx={2}
                  fill="currentColor"
                  initial={reduce ? { y: yTop, height: segH } : { y: pad.t + ih, height: 0 }}
                  whileInView={{ y: yTop, height: segH }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: di * 0.05, ease: EASE }}
                />
              );
            })}
            <text className={styles.axisText} x={cx} y={h - 6} textAnchor="middle" fontSize={11}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Donut with counting-up center total ───────────────────────────────────── */
export function Donut({
  segments,
  size = 176,
}: {
  segments: Segment[];
  size?: number;
}) {
  const reduce = useReducedMotion();
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const sum = total || 1;
  let offset = 0;
  return (
    <div className={styles.donutWrap} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.ringSpin} role="img" aria-label={`Total ${total}`}>
        {segments.map((s) => {
          const dash = (s.value / sum) * c;
          const el = (
            <motion.circle
              key={s.key}
              className={colors[s.color]}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, dash - 2)} ${c - dash + 2}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE }}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className={styles.donutCenter}>
        <Count value={total} className={styles.donutTotal} />
        <span className={styles.donutLabel}>total</span>
      </div>
    </div>
  );
}

/* ── Supply-vs-demand scatter (one bubble per region, 45° balance line) ─────── */
export function BalanceScatter({
  points,
  supplyLabel,
  demandLabel,
  balanceLabel,
}: {
  points: { region: string; supply: number; demand: number; gmv: number }[];
  supplyLabel: string;
  demandLabel: string;
  balanceLabel: string;
}) {
  const reduce = useReducedMotion();
  const w = 460;
  const h = 300;
  const pad = 34;
  const max = Math.max(...points.flatMap((p) => [p.supply, p.demand]), 1) * 1.15;
  const maxGmv = Math.max(...points.map((p) => p.gmv), 1);
  const sx = (v: number) => pad + (v / max) * (w - pad * 2);
  const sy = (v: number) => h - pad - (v / max) * (h - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.fluidSvg} role="img" aria-label="Supply versus demand by region">
      <line className={styles.gridLine} x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} />
      <line className={styles.gridLine} x1={pad} y1={pad} x2={pad} y2={h - pad} />
      <line className={clsx(styles.balanceLine, colors.sage)} x1={sx(0)} y1={sy(0)} x2={sx(max)} y2={sy(max)} strokeDasharray="5 5" />
      <text className={styles.axisText} x={w - pad} y={sy(max) + 4} textAnchor="end" fontSize={10}>
        {balanceLabel}
      </text>
      <text className={styles.axisText} x={w / 2} y={h - 6} textAnchor="middle" fontSize={11}>
        {supplyLabel}
      </text>
      <text className={styles.axisText} x={12} y={h / 2} textAnchor="middle" transform={`rotate(-90 12 ${h / 2})`} fontSize={11}>
        {demandLabel}
      </text>
      {points.map((p, i) => {
        const rad = 8 + (p.gmv / maxGmv) * 20;
        const balanced = Math.abs(p.supply - p.demand) / max < 0.12;
        const tone: SeriesColor = balanced ? 'green' : p.demand > p.supply ? 'blue' : 'orange';
        return (
          <motion.g
            key={p.region}
            className={colors[tone]}
            initial={reduce ? false : { opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
          >
            <circle className={styles.bubble} cx={sx(p.supply)} cy={sy(p.demand)} r={rad} stroke="currentColor" fill="currentColor" />
            <text className={styles.bubbleLabel} x={sx(p.supply)} y={sy(p.demand) - rad - 4} textAnchor="middle" fontSize={10}>
              {p.region}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

/* ── Weekday × hour demand heatmap (intensity quantised to token tints) ─────── */
export function DemandHeatmap({
  grid,
  days,
  lowLabel,
  peakLabel,
}: {
  grid: number[][];
  days: string[];
  lowLabel: string;
  peakLabel: string;
}) {
  const hours = [8, 10, 12, 14, 16, 18, 20, 22];
  const bucket = (v: number) => styles[`h${Math.min(5, Math.max(1, Math.ceil(v * 5) || 1))}`];
  return (
    <div className={styles.heatScroll}>
      <div className={styles.heatGrid}>
        <span />
        {hours.map((hh) => (
          <span key={hh} className={styles.heatHour}>
            {hh}
          </span>
        ))}
        {grid.map((row, di) => (
          <Fragment key={di}>
            <span className={styles.heatDay}>{days[di]}</span>
            {row.map((v, hi) => (
              <span
                key={hi}
                className={clsx(styles.heatCell, bucket(v))}
                title={`${days[di]} ${hours[hi]}:00 — ${Math.round(v * 100)}%`}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div className={styles.heatScale}>
        <span className={styles.heatScaleLabel}>{lowLabel}</span>
        <span className={styles.heatScaleBar}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={clsx(styles.heatScaleStep, styles[`h${n}`])} />
          ))}
        </span>
        <span className={styles.heatScaleLabel}>{peakLabel}</span>
      </div>
    </div>
  );
}
