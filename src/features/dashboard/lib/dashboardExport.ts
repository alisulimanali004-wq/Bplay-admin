import type { TFunction } from 'i18next';
import type { DashboardData, RangeKey } from '../api/dashboard.types';

type Cell = string | number;

/**
 * Export the current dashboard snapshot to a multi-sheet `.xlsx` — one sheet per
 * domain (overview context, KPIs, bookings, subscriptions, facilities, funnel,
 * attention queues, regions), with localized headers and respecting the active
 * range + region filter. SheetJS is loaded via dynamic import so it stays out of
 * the main bundle (same discipline as `shared/lib/exportXlsx`).
 */
export async function exportDashboard(
  data: DashboardData,
  t: TFunction,
  range: RangeKey,
  regionLabel: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: Cell[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Auto-fit each column to its widest cell so no text is clipped (min 12, max 60 chars).
    const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    ws['!cols'] = Array.from({ length: colCount }, (_, c) => {
      const widest = rows.reduce((max, row) => Math.max(max, String(row[c] ?? '').length), 0);
      return { wch: Math.min(60, Math.max(12, widest + 2)) };
    });
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  const metric = t('dashboard.export.metric');
  const value = t('dashboard.export.value');
  const status = t('dashboard.export.status');
  const funnelStart = data.funnel[0]?.value || 1;

  add(t('dashboard.export.sheet.overview'), [
    [metric, value],
    [t('dashboard.export.generatedAt'), new Date(data.asOf).toLocaleString()],
    [t('dashboard.rangeLabel'), t(`dashboard.range.${range}`)],
    [t('dashboard.regionLabel'), regionLabel],
    [t('dashboard.northStar'), data.hero.bookings],
    [t('dashboard.export.delta'), `${data.hero.bookingsDeltaPct}%`],
    [t('dashboard.export.target'), `${data.hero.targetPct}%`],
    [`${t('dashboard.kpi.gmv')} (${t('common.currencySyp')})`, data.hero.gmvSyp],
  ]);

  add(t('dashboard.export.sheet.kpis'), [
    [metric, value],
    ...data.kpis.map((k): Cell[] => [t(`dashboard.kpi.${k.key}`), k.value]),
  ]);

  add(t('dashboard.export.sheet.bookings'), [
    [status, value],
    ...data.bookingStatus.map((s): Cell[] => [t(`dashboard.status.${s.key}`), s.value]),
  ]);

  add(t('dashboard.export.sheet.subscriptions'), [
    [status, value],
    ...data.subStatus.map((s): Cell[] => [t(`dashboard.status.${s.key}`), s.value]),
    [`${t('dashboard.recurring.mrr')} (${t('common.currencySyp')})`, data.recurring.mrrSyp],
    [t('dashboard.recurring.churn'), `${data.recurring.churnPct}%`],
    [t('dashboard.recurring.nearExpiry'), data.recurring.nearExpiry],
  ]);

  add(t('dashboard.export.sheet.facilities'), [
    [status, value],
    ...data.facilityPipeline.map((s): Cell[] => [t(`dashboard.status.${s.key}`), s.value]),
    [],
    [t('dashboard.domains.topFacilities'), value],
    ...data.topFacilities.map((f): Cell[] => [f.label, f.value]),
  ]);

  add(t('dashboard.export.sheet.funnel'), [
    [t('dashboard.export.stage'), value, '%'],
    ...data.funnel.map((f): Cell[] => [
      t(`dashboard.status.${f.key}`),
      f.value,
      `${Math.round((f.value / funnelStart) * 100)}%`,
    ]),
  ]);

  add(t('dashboard.export.sheet.attention'), [
    [metric, value],
    ...data.attention.map((a): Cell[] => [t(`dashboard.attention.${a.key}`), a.count]),
  ]);

  if (data.regions.length) {
    add(t('dashboard.export.sheet.regions'), [
      [
        t('dashboard.region.col.region'),
        t('dashboard.region.col.players'),
        t('dashboard.region.col.facilities'),
        t('dashboard.region.col.bookings'),
        t('dashboard.region.col.gmv'),
        t('dashboard.region.col.occupancy'),
        t('dashboard.region.col.rating'),
      ],
      ...data.regions.map((r): Cell[] => [
        r.name,
        r.players,
        r.facilities,
        r.bookings,
        r.gmvM,
        r.occupancy,
        r.rating,
      ]),
    ]);
  }

  const stamp = new Date(data.asOf).toISOString().slice(0, 10);
  XLSX.writeFile(wb, `bplay-overview-${range}-${stamp}.xlsx`);
}
