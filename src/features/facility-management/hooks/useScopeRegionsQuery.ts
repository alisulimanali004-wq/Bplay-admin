import { useQuery } from '@tanstack/react-query';
import { getScopeTree } from '@features/region-management/api';

/**
 * One fetch of the scope endpoint, read through two selectors.
 *
 * Both hooks share the `['regions', 'scope']` key, so React Query issues a
 * single request and each consumer narrows it — the scope banner wants cities,
 * the filter bar wants the whole tree.
 */
const SCOPE_KEY = ['regions', 'scope'] as const;

/** Active scope regions (cities with a geo circle) for filters and the scope banner. */
export function useScopeRegionsQuery() {
  return useQuery({
    queryKey: SCOPE_KEY,
    queryFn: () => getScopeTree(),
    select: (tree) => tree.regions.filter((region) => region.isActive),
  });
}

/**
 * Active neighbourhoods, for grouping under their city in the region filter.
 * A neighbourhood id is a valid `regionId`: the API matches
 * `city_id = $1 OR neighbourhood_id = $1`.
 */
export function useScopeNeighbourhoodsQuery() {
  return useQuery({
    queryKey: SCOPE_KEY,
    queryFn: () => getScopeTree(),
    select: (tree) => tree.neighbourhoods.filter((n) => n.isActive),
  });
}
