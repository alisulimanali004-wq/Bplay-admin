import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ownerKeys } from '../api/owner.keys';
import { getOwners } from '../api';
import type { OwnerListParams } from '../api/owner.types';

export function useOwnersQuery(params: OwnerListParams) {
  return useQuery({
    queryKey: ownerKeys.list(params),
    queryFn: () => getOwners(params),
    placeholderData: keepPreviousData,
  });
}
