import { useQuery } from '@tanstack/react-query';
import { membershipKeys } from '../api/membership.keys';
import { getMembershipById } from '../api';

export function useMembershipQuery(id: string | undefined) {
  return useQuery({
    queryKey: membershipKeys.detail(id ?? ''),
    queryFn: () => getMembershipById(id as string),
    enabled: Boolean(id),
  });
}
