import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { regionKeys } from '../api/region.keys';
import { getRegions } from '../api';
import type { RegionListParams } from '../api/region.types';

export function useRegionsQuery(params: RegionListParams) {
  return useQuery({
    queryKey: regionKeys.list(params),
    queryFn: () => getRegions(params),
    placeholderData: keepPreviousData,
  });
}
