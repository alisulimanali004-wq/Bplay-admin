import type { ComponentType, ReactNode, SVGProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Card,
  DataTable,
  clsx,
  ActivityIcon,
  BarChartIcon,
  BuildingIcon,
  CalendarIcon,
  CreditCardIcon,
  FileWarningIcon,
  FlagIcon,
  GaugeIcon,
  LayersIcon,
  LineChartIcon,
  StarIcon,
  UserCheckIcon,
} from '@ui';
import type { BadgeVariant } from '@ui';
import { PanelHead, SectionHeader, ViewAllLink } from './DashboardKit';
import { BalanceScatter, DemandHeatmap, Donut, Legend, RankBars, SegmentBar, StackedBars, TrendChart } from './DashboardCharts';
import { fmtCompact } from './format';
import type { ActivityItem, DashboardData, RegionRow } from '../api/dashboard.types';
import colors from './colors.module.css';
import styles from './DashboardSections.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Scroll-triggered entrance for a below-the-fold section (fires once). */
function Reveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.section>
  );
}

/** A data-driven bar that draws in on scroll (dynamic width via motion, not CSS). */
function MiniBar({ value, max }: { value: number; max: number }) {
  const reduce = useReducedMotion();
  return (
    <span className={styles.miniTrack}>
      <motion.span
        className={styles.miniFill}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${(value / max) * 100}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      />
    </span>
  );
}

/* ── Marketplace liquidity ─────────────────────────────────────────────────── */
export function LiquiditySection({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const first = data.funnel[0]?.value || 1;
  return (
    <Reveal>
      <SectionHeader
        eyebrow={t('dashboard.section.liquidity.eyebrow')}
        title={t('dashboard.section.liquidity.title')}
      />
      <div className={styles.grid75}>
        <Card variant="glass">
          <PanelHead icon={<ActivityIcon />} title={t('dashboard.liquidity.balance')} />
          <p className={styles.panelHint}>{t('dashboard.liquidity.balanceHint')}</p>
          <BalanceScatter
            points={data.scatter}
            supplyLabel={t('dashboard.liquidity.supplyAxis')}
            demandLabel={t('dashboard.liquidity.demandAxis')}
            balanceLabel={t('dashboard.liquidity.balanced')}
          />
        </Card>
        <Card variant="glass">
          <PanelHead icon={<LayersIcon />} title={t('dashboard.liquidity.funnel')} />
          <div className={styles.funnel}>
            {data.funnel.map((stage, i) => {
              const pct = Math.round((stage.value / first) * 100);
              return (
                <div key={stage.key}>
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>{t(`dashboard.status.${stage.key}`)}</span>
                    <span className={styles.funnelValue}>
                      {fmtCompact(stage.value)} <span className={styles.funnelPct}>· {pct}%</span>
                    </span>
                  </div>
                  <span className={styles.funnelTrack}>
                    <motion.span
                      className={clsx(styles.funnelFill, colors[stage.color])}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </Reveal>
  );
}

/* ── Trends & composition ──────────────────────────────────────────────────── */
export function TrendsSection({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  return (
    <Reveal>
      <SectionHeader
        eyebrow={t('dashboard.section.trends.eyebrow')}
        title={t('dashboard.section.trends.title')}
      />
      <div className={styles.grid84}>
        <Card variant="glass">
          <PanelHead
            icon={<LineChartIcon />}
            title={t('dashboard.trends.title')}
            action={
              <span className={styles.inlineLegend}>
                {data.trend.series.map((s) => (
                  <span key={s.key} className={styles.inlineLegendItem}>
                    <span className={clsx(styles.legendDot, colors[s.color])} aria-hidden />
                    {t(`dashboard.series.${s.key}`)}
                  </span>
                ))}
              </span>
            }
          />
          <TrendChart series={data.trend.series} labels={data.trend.labels} />
        </Card>
        <Card variant="glass">
          <PanelHead icon={<BarChartIcon />} title={t('dashboard.trends.mix')} />
          <StackedBars points={data.composition.points} keys={data.composition.keys} />
          <div className={styles.inlineLegend}>
            {data.composition.keys.map((k) => (
              <span key={k.key} className={styles.inlineLegendItem}>
                <span className={clsx(styles.legendDot, colors[k.color])} aria-hidden />
                {t(`dashboard.status.${k.key}`)}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </Reveal>
  );
}

/* ── Demand — donut + heatmap ──────────────────────────────────────────────── */
export function DemandSection({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const total = data.bookingStatus.reduce((s, x) => s + x.value, 0);
  return (
    <Reveal>
      <SectionHeader
        eyebrow={t('dashboard.section.demand.eyebrow')}
        title={t('dashboard.section.demand.title')}
      />
      <div className={styles.grid57}>
        <Card variant="glass">
          <div className={styles.donutRow}>
            <Donut segments={data.bookingStatus} />
            <Legend
              segments={data.bookingStatus}
              total={total}
              labelFor={(key) => t(`dashboard.status.${key}`)}
            />
          </div>
        </Card>
        <Card variant="glass">
          <PanelHead icon={<GaugeIcon />} title={t('dashboard.demand.peak')} />
          <DemandHeatmap
            grid={data.heatmap}
            days={[
              t('dashboard.day.mon'),
              t('dashboard.day.tue'),
              t('dashboard.day.wed'),
              t('dashboard.day.thu'),
              t('dashboard.day.fri'),
              t('dashboard.day.sat'),
              t('dashboard.day.sun'),
            ]}
            lowLabel={t('dashboard.demand.low')}
            peakLabel={t('dashboard.demand.peakLabel')}
          />
        </Card>
      </div>
    </Reveal>
  );
}

/* ── Region performance (super-admin only) ─────────────────────────────────── */
export function RegionSection({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (data.regions.length === 0) return null;
  const maxBookings = Math.max(...data.regions.map((r) => r.bookings), 1);
  const occTone = (occ: number): BadgeVariant =>
    occ >= 70 ? 'success' : occ >= 55 ? 'warning' : 'caution';

  return (
    <Reveal>
      <SectionHeader
        eyebrow={t('dashboard.section.region.eyebrow')}
        title={t('dashboard.section.region.title')}
        action={<span className={styles.superOnly}>{t('dashboard.superAdminOnly')}</span>}
      />
      <Card variant="glass" padding="sm">
        <DataTable<RegionRow>
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(`/app/region-management/${r.id}`)}
          data={data.regions}
          columns={[
            {
              key: 'name',
              header: t('dashboard.region.col.region'),
              render: (r) => <span className={styles.regionName}>{r.name}</span>,
            },
            { key: 'players', header: t('dashboard.region.col.players'), align: 'end', render: (r) => <span className={styles.num}>{r.players}</span> },
            { key: 'facilities', header: t('dashboard.region.col.facilities'), align: 'end', render: (r) => <span className={styles.num}>{r.facilities}</span> },
            {
              key: 'bookings',
              header: t('dashboard.region.col.bookings'),
              render: (r) => (
                <span className={styles.bookingsCell}>
                  <span className={styles.num}>{r.bookings}</span>
                  <MiniBar value={r.bookings} max={maxBookings} />
                </span>
              ),
            },
            { key: 'gmvM', header: t('dashboard.region.col.gmv'), align: 'end', render: (r) => <span className={clsx(styles.num, styles.gmvNum)}>{r.gmvM}</span> },
            { key: 'occupancy', header: t('dashboard.region.col.occupancy'), align: 'center', render: (r) => <Badge variant={occTone(r.occupancy)} size="sm">{r.occupancy}%</Badge> },
            {
              key: 'rating',
              header: t('dashboard.region.col.rating'),
              align: 'end',
              render: (r) => (
                <span className={styles.ratingCell}>
                  <StarIcon className={styles.ratingStar} aria-hidden />
                  <span className={styles.num}>{r.rating}</span>
                </span>
              ),
            },
          ]}
        />
      </Card>
    </Reveal>
  );
}

/* ── Domain panels — supply pipeline + recurring ───────────────────────────── */
export function DomainSection({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const statusLabel = (key: string) => t(`dashboard.status.${key}`);
  const recurring = [
    { key: 'mrr', value: `${fmtCompact(data.recurring.mrrSyp)}`, tone: 'amber' as const },
    { key: 'churn', value: `${data.recurring.churnPct}%`, tone: 'red' as const },
    { key: 'nearExpiry', value: `${data.recurring.nearExpiry}`, tone: 'gold' as const },
  ];
  return (
    <Reveal>
      <SectionHeader
        eyebrow={t('dashboard.section.domains.eyebrow')}
        title={t('dashboard.section.domains.title')}
      />
      <div className={styles.grid11}>
        <Card variant="glass">
          <PanelHead
            icon={<BuildingIcon />}
            title={t('dashboard.domains.supply')}
            action={<ViewAllLink to="/app/facility-management" label={t('dashboard.viewAll')} />}
          />
          <SegmentBar segments={data.facilityPipeline} labelFor={statusLabel} />
          <p className={styles.subHead}>{t('dashboard.domains.topFacilities')}</p>
          <RankBars rows={data.topFacilities} />
        </Card>
        <Card variant="glass">
          <PanelHead
            icon={<CreditCardIcon />}
            title={t('dashboard.domains.recurring')}
            action={<ViewAllLink to="/app/club-subscriptions" label={t('dashboard.viewAll')} />}
          />
          <SegmentBar segments={data.subStatus} labelFor={statusLabel} />
          <div className={styles.miniStats}>
            {recurring.map((m) => (
              <div key={m.key} className={styles.miniStat}>
                <span className={styles.miniStatLabel}>{t(`dashboard.recurring.${m.key}`)}</span>
                <span className={clsx(styles.miniStatValue, colors[m.tone])}>{m.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Reveal>
  );
}

/* ── Recent activity feed ──────────────────────────────────────────────────── */
const ACTIVITY_ICON: Record<ActivityItem['kind'], ComponentType<SVGProps<SVGSVGElement>>> = {
  booking_confirmed: CalendarIcon,
  facility_submitted: BuildingIcon,
  subscription_new: CreditCardIcon,
  player_report: FlagIcon,
  owner_approved: UserCheckIcon,
  post_flagged: FileWarningIcon,
};

function rel(min: number): string {
  return min < 60 ? `${min}m` : `${Math.round(min / 60)}h`;
}

export function ActivitySection({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  return (
    <Reveal>
      <SectionHeader
        eyebrow={t('dashboard.section.activity.eyebrow')}
        title={t('dashboard.section.activity.title')}
      />
      <Card variant="glass" padding="sm">
        <ul className={styles.feed}>
          {data.activity.map((a) => {
            const Icon = ACTIVITY_ICON[a.kind];
            return (
              <li key={a.key} className={styles.feedRow}>
                <span className={clsx(styles.feedChip, colors[a.tone])} aria-hidden>
                  <Icon />
                </span>
                <span className={styles.feedText}>{t(`dashboard.activity.${a.kind}`, a.params)}</span>
                <span className={styles.feedTime}>{rel(a.minutesAgo)}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </Reveal>
  );
}
