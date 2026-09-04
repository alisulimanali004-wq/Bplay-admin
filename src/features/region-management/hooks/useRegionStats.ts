import { useQuery } from '@tanstack/react-query';
import { regionKeys } from '../api/region.keys';
import { getRegionStats } from '../api';

/** Platform-wide region counts for the list KPI row. */
export function useRegionStats() {
  return useQuery({
    queryKey: regionKeys.stats(),
    queryFn: getRegionStats,
  });
}
