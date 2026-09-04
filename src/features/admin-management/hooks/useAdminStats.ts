import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../api/admin.keys';
import { getAdminStats } from '../api';

/** Platform-wide admin counts for the list KPI row. */
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: getAdminStats,
  });
}
