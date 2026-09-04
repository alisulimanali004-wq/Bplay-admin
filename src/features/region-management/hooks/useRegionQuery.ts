import { useQuery } from '@tanstack/react-query';
import { regionKeys } from '../api/region.keys';
import { getRegionById } from '../api';

/** Single-region query for the region detail page. Disabled until an id is present. */
export function useRegionQuery(id?: string) {
  return useQuery({
    queryKey: regionKeys.detail(id ?? ''),
    queryFn: () => getRegionById(id!),
    enabled: Boolean(id),
  });
}
