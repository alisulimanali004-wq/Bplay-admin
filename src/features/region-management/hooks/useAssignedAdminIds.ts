import { useQuery } from '@tanstack/react-query';
import { getRegions } from '../api';

/**
 * The set of admin ids assigned to ANY region — powers the "only unassigned
 * admins" filter in the assign dialog. Under the ['regions'] key prefix so
 * region mutations (which invalidate regionKeys.all) keep it fresh.
 */
export function useAssignedAdminIds() {
  return useQuery({
    queryKey: ['regions', 'assigned-admin-ids'],
    queryFn: () => getRegions({ page: 1, pageSize: 1000 }),
    select: (result) => new Set(result.items.flatMap((region) => region.assignedAdminIds)),
  });
}
