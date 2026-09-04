import { useQuery } from '@tanstack/react-query';
import { playerKeys } from '../api/player.keys';
import { getPlayerById } from '../api';

export function usePlayerQuery(id: string | undefined) {
  return useQuery({
    queryKey: playerKeys.detail(id ?? ''),
    queryFn: () => getPlayerById(id as string),
    enabled: Boolean(id),
  });
}
