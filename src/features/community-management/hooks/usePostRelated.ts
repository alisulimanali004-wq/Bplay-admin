import { useQuery } from '@tanstack/react-query';
import { communityKeys } from '../api/community.keys';
import { getPostComments, getPostReactors } from '../api';

/** Comments on a post (shown in the detail page's comments section). */
export function usePostComments(postId: string) {
  return useQuery({
    queryKey: communityKeys.comments(postId),
    queryFn: () => getPostComments(postId),
  });
}

/** Reactors on a post — fetched lazily (only while the reactor modal is open). */
export function usePostReactors(postId: string, enabled = true) {
  return useQuery({
    queryKey: communityKeys.reactors(postId),
    queryFn: () => getPostReactors(postId),
    enabled,
  });
}
