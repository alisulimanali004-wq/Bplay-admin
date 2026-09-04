import { useQuery } from '@tanstack/react-query';
import { getScopeRegions } from '@features/region-management/api';

/**
 * The active geo regions, for the region filter's labels. Keyed under the
 * REGIONS root so region mutations invalidate it (the same key the other scoped
 * features use, so the cache entry is shared).
 */
export function useScopeRegionsQuery() {
  return useQuery({
    queryKey: ['regions', 'scope'],
    queryFn: () => getScopeRegions(),
    select: (regions) => regions.filter((region) => region.isActive),
  });
}
