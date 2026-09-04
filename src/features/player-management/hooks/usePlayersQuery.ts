import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { playerKeys } from '../api/player.keys';
import { getPlayers } from '../api';
import type { PlayerListParams } from '../api/player.types';

export function usePlayersQuery(params: PlayerListParams) {
  return useQuery({
    queryKey: playerKeys.list(params),
    queryFn: () => getPlayers(params),
    placeholderData: keepPreviousData,
  });
}
