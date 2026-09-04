import { useQuery } from '@tanstack/react-query';
import { getRegions } from '@features/region-management/api';
import type { Region } from '@features/region-management/api/region.types';
import type { Admin } from '../api/admin.types';

/**
 * The full Region objects an admin manages — derived by inverting the region
 * store (the region owns the many-to-many link). Returns [] for general admins.
 * Under the ['regions'] key prefix so assignment mutations keep it fresh.
 */
export function useAdminRegions(admin?: Admin) {
  return useQuery({
    queryKey: ['regions', 'for-admin', admin?.id ?? ''],
    queryFn: () => getRegions({ page: 1, pageSize: 1000 }),
    enabled: Boolean(admin),
    select: (result): Region[] =>
      result.items.filter((region) => region.assignedAdminIds.includes(admin!.id)),
  });
}
