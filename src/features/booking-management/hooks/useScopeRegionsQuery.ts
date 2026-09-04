import { useQuery } from '@tanstack/react-query';
import { getScopeRegions } from '@features/region-management/api';

/** Active scope regions (cities with a geo circle) for the region filter. */
export function useScopeRegionsQuery() {
  return useQuery({
    queryKey: ['regions', 'scope'],
    queryFn: () => getScopeRegions(),
    select: (regions) => regions.filter((region) => region.isActive),
  });
}
