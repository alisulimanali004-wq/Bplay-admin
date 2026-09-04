import { useQuery } from '@tanstack/react-query';
import { getRegionFacilities } from '@features/facility-management/api';
import type { Region } from '../api/region.types';

/**
 * The facilities that fall inside a region's geo circle (region detail page).
 * Disabled until a region is present.
 */
export function useRegionFacilities(region?: Region) {
  return useQuery({
    queryKey: ['regions', 'facilities', region?.id],
    queryFn: () => getRegionFacilities(region!),
    enabled: Boolean(region),
  });
}
