import { useQuery } from '@tanstack/react-query';
import { getRegionFacilityCounts } from '@features/facility-management/api';

/**
 * Facility count per region (keyed by region id) for the region-management list.
 * Missing/loading → treat as 0 at the call site.
 */
export function useRegionFacilityCounts() {
  return useQuery({
    queryKey: ['regions', 'facility-counts'],
    queryFn: getRegionFacilityCounts,
  });
}
