import { useQuery } from '@tanstack/react-query';
import { ownerKeys } from '../api/owner.keys';
import { getOwnerStats } from '../api';

/** Platform-wide owner counts for the list KPI row. */
export function useOwnerStats() {
  return useQuery({
    queryKey: ownerKeys.stats(),
    queryFn: getOwnerStats,
  });
}
