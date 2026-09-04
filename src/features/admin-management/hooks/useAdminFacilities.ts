import { useQuery } from '@tanstack/react-query';
import { getRegionFacilities, type RegionFacility } from '@features/facility-management/api';
import type { Region } from '@features/region-management/api/region.types';

/**
 * Facilities across ALL of an admin's regions, de-duplicated by id (a facility
 * near two overlapping circles counts once). Powers the detail stat, the map
 * pins and the facilities card. Disabled until the admin has at least one region.
 */
export function useAdminFacilities(regions?: Region[]) {
  const ids = (regions ?? []).map((region) => region.id).sort();
  return useQuery({
    queryKey: ['regions', 'admin-facilities', ids],
    queryFn: async (): Promise<RegionFacility[]> => {
      const lists = await Promise.all((regions ?? []).map((region) => getRegionFacilities(region)));
      const byId = new Map<string, RegionFacility>();
      for (const list of lists) {
        for (const facility of list) byId.set(facility.id, facility);
      }
      return Array.from(byId.values());
    },
    enabled: Boolean(regions && regions.length > 0),
  });
}
