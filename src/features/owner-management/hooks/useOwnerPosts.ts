import { useQuery } from '@tanstack/react-query';
import { getPosts } from '@features/community-management/api';
import { ownerKeys } from '../api/owner.keys';

/** Community posts authored by this owner's facility — powers the profile "Posts" tab. */
export function useOwnerPosts(ownerId: string) {
  return useQuery({
    queryKey: ownerKeys.posts(ownerId),
    queryFn: () => getPosts({ authorId: ownerId, pageSize: 50 }),
    select: (result) => result.items,
  });
}
