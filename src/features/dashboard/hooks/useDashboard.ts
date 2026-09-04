import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getDashboard, getDashboardRegions } from '../api';
import { dashboardKeys } from '../api/dashboard.keys';
import type { DashboardParams } from '../api/dashboard.types';

/**
 * The whole dashboard in one query. `keepPreviousData` keeps the last snapshot on
 * screen while a new range/region refetches (stale-while-revalidate) so switching
 * filters never blanks the page.
 */
export function useDashboard(params: DashboardParams) {
  return useQuery({
    queryKey: dashboardKeys.overview(params),
    queryFn: () => getDashboard(params),
    placeholderData: keepPreviousData,
  });
}

/** Region options for the scope selector (cached for the session). */
export function useDashboardRegions() {
  return useQuery({
    queryKey: dashboardKeys.regions(),
    queryFn: getDashboardRegions,
    staleTime: Infinity,
  });
}
