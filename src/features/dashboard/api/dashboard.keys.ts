import type { DashboardParams } from './dashboard.types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (params: DashboardParams) => [...dashboardKeys.all, 'overview', params] as const,
  regions: () => [...dashboardKeys.all, 'regions'] as const,
};
