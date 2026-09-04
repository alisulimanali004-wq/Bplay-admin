import type { RegionListParams } from './region.types';

export const regionKeys = {
  all: ['regions'] as const,
  lists: () => [...regionKeys.all, 'list'] as const,
  list: (params: RegionListParams) => [...regionKeys.lists(), params] as const,
  details: () => [...regionKeys.all, 'detail'] as const,
  detail: (id: string) => [...regionKeys.details(), id] as const,
  stats: () => [...regionKeys.all, 'stats'] as const,
  /**
   * Neighbourhoods live UNDER the region key prefix on purpose: a region
   * mutation invalidates `regionKeys.all`, and a city change (deactivation,
   * a moved circle) can change what its neighbourhoods mean.
   */
  neighbourhoods: () => [...regionKeys.all, 'neighbourhoods'] as const,
  neighbourhoodsByCity: (cityId: string) => [...regionKeys.neighbourhoods(), cityId] as const,
};
