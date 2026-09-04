import { useQuery } from '@tanstack/react-query';
import { ownerKeys } from '../api/owner.keys';
import { getOwnerById } from '../api';

export function useOwnerQuery(id: string | undefined) {
  return useQuery({
    queryKey: ownerKeys.detail(id ?? ''),
    queryFn: () => getOwnerById(id as string),
    enabled: Boolean(id),
  });
}
