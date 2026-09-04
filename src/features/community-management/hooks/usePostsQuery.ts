import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthRole } from '@shared/stores/authStore';
import { communityKeys } from '../api/community.keys';
import { getPosts } from '../api';
import type { PostListParams } from '../api/community.types';

export function usePostsQuery(params: PostListParams) {
  // Every /admin/community-management route is super_admin-only server-side, so
  // firing this as a regional admin can only ever produce a 403. The route guard
  // already redirects them, but a stale bundle or a not-yet-hydrated session can
  // still mount this page for a moment — and when it does the screen fills with
  // "You do not have permission to do that." toasts. Not asking is the fix.
  const isSuperAdmin = useAuthRole() === 'super_admin';

  return useQuery({
    queryKey: communityKeys.list(params),
    queryFn: () => getPosts(params),
    placeholderData: keepPreviousData,
    enabled: isSuperAdmin,
  });
}
