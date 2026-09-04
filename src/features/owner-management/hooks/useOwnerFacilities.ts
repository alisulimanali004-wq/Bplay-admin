import { useQuery } from '@tanstack/react-query';
import { getFacilities } from '@features/facility-management/api';
import { ownerKeys } from '../api/owner.keys';

/** The facilities this owner owns — powers the detail page stats + facilities card. */
export function useOwnerFacilities(ownerId: string | undefined) {
  return useQuery({
    queryKey: ownerKeys.facilities(ownerId ?? ''),
    queryFn: () => getFacilities({ ownerId: ownerId as string, pageSize: 100 }),
    enabled: Boolean(ownerId),
    select: (result) => result.items,
  });
}
