import { useQuery } from '@tanstack/react-query';
import { getPosts } from '@features/community-management/api';
import { playerKeys } from '../api/player.keys';

/** Community posts authored by this player — powers the profile "Posts" tab. */
export function usePlayerPosts(playerId: string) {
  return useQuery({
    queryKey: playerKeys.posts(playerId),
    queryFn: () => getPosts({ authorId: playerId, pageSize: 50 }),
    select: (result) => result.items,
  });
}
