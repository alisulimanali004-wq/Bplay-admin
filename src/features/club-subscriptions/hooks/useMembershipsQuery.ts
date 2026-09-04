import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { membershipKeys } from '../api/membership.keys';
import { getMemberships } from '../api';
import type { MembershipListParams } from '../api';

export function useMembershipsQuery(params: MembershipListParams) {
  return useQuery({
    queryKey: membershipKeys.list(params),
    queryFn: () => getMemberships(params),
    placeholderData: keepPreviousData,
  });
}
