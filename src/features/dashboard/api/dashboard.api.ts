import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import type { DashboardData, DashboardParams } from './dashboard.types';

/**
 * Real dashboard service — the go-live seam. When the backend ships a stats
 * endpoint, this is the ONLY file that changes: it fetches the platform overview
 * for the active range + region scope and maps the DTO onto `DashboardData`
 * (the mock already returns that exact shape, so no component changes).
 */
const STATS_PATH = '/admin/statistics/overview';

export async function getDashboard(params: DashboardParams): Promise<DashboardData> {
  const res = await apiClient.get(STATS_PATH, {
    params: { range: params.range, region: params.regionId },
  });
  // The backend is expected to return the DashboardData contract directly; when
  // the real DTO diverges, map its fields here (see region.api.ts `toRegion`).
  return unwrap<DashboardData>(res.data);
}

/** Live regions for the scope selector. */
export async function getDashboardRegions(): Promise<{ id: string; name: string }[]> {
  const res = await apiClient.get('/admin/regions');
  return unwrapList<{ id: string | number; name: string }>(res.data, ['regions']).map((r) => ({
    id: String(r.id),
    name: r.name,
  }));
}
