import { useQuery } from '@tanstack/react-query';
import { getRegions } from '@features/region-management/api';
import type { RegionStatus } from '@features/region-management/api/region.types';

/** A region projected for the assign-regions picker (mirrors useAdminsForAssign, inverted). */
export interface AssignableRegion {
  id: string;
  name: string;
  status: RegionStatus;
  isActive: boolean;
  /** Whether the region already has any admin assigned (powers the "without admin" filter). */
  hasAdmin: boolean;
}

/**
 * All live (non-deleted) regions, projected for the admin's region picker. Under
 * the ['regions'] key prefix so region + admin assignment mutations keep it fresh.
 */
export function useRegionsForAssign() {
  return useQuery({
    queryKey: ['regions', 'for-assign'],
    queryFn: () => getRegions({ page: 1, pageSize: 1000 }),
    select: (result): AssignableRegion[] =>
      result.items.map((region) => ({
        id: region.id,
        name: region.name,
        status: region.status,
        isActive: region.isActive,
        hasAdmin: region.assignedAdminIds.length > 0,
      })),
  });
}
