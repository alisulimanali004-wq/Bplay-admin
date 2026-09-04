import { useQuery } from '@tanstack/react-query';
import { facilityKeys } from '../api/facility.keys';
import { getFacilityStats } from '../api';

/** Scope-aware KPI figures for the directory header (one lightweight call). */
export function useFacilityStatsQuery() {
  return useQuery({
    queryKey: facilityKeys.stats(),
    queryFn: () => getFacilityStats(),
  });
}
