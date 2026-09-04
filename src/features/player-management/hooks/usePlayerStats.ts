import { useQuery } from '@tanstack/react-query';
import { playerKeys } from '../api/player.keys';
import { getPlayerStats } from '../api';

/** Platform-wide player counts for the list KPI row. */
export function usePlayerStats() {
  return useQuery({
    queryKey: playerKeys.stats(),
    queryFn: getPlayerStats,
  });
}
