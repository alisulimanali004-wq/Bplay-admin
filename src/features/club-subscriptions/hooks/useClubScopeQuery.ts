import { useQuery } from '@tanstack/react-query';
import { getFacilities } from '@features/facility-management/api';
import { buildFacilityScopeIndex } from '../api/membership.filter';

/**
 * The facility scope index (visible club ids + region names + orphan flags),
 * used by the detail page to render a membership's club RegionTag — the
 * Membership entity itself carries no region data.
 */
export function useClubScopeQuery() {
  return useQuery({
    queryKey: ['facilities', 'clubs', 'scope-index'],
    queryFn: () => getFacilities({ kind: 'club', page: 1, pageSize: 1000 }),
    select: (result) => buildFacilityScopeIndex(result.items),
  });
}
