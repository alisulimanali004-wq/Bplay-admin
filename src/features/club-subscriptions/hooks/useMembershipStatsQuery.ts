import { useQuery } from '@tanstack/react-query';
import { membershipKeys } from '../api/membership.keys';
import { getMembershipStats } from '../api';

/** Scope-aware KPI figures for the directory header (one lightweight call). */
export function useMembershipStatsQuery() {
  return useQuery({
    queryKey: membershipKeys.stats(),
    queryFn: () => getMembershipStats(),
  });
}
