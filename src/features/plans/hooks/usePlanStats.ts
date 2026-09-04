import { useQuery } from '@tanstack/react-query';
import { planKeys } from '../api/plan.keys';
import { getPlanStats } from '../api';

/** Catalog-wide counters for the list KPI row (never scoped to the current page). */
export function usePlanStats() {
  return useQuery({
    queryKey: planKeys.stats(),
    queryFn: () => getPlanStats(),
  });
}
