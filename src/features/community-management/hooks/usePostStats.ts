import { useQuery } from '@tanstack/react-query';
import { useAuthRole } from '@shared/stores/authStore';
import { communityKeys } from '../api/community.keys';
import { getPostStats } from '../api';

/** Platform-wide community counts for the list KPI row. */
export function usePostStats() {
  // super_admin-only server-side, same as the post list — see usePostsQuery.
  const isSuperAdmin = useAuthRole() === 'super_admin';

  return useQuery({
    queryKey: communityKeys.stats(),
    queryFn: getPostStats,
    enabled: isSuperAdmin,
  });
}
