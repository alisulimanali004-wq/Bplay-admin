import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminKeys } from '../api/admin.keys';
import { getAdmins } from '../api';
import type { AdminListParams } from '../api/admin.types';

export function useAdminsQuery(params: AdminListParams) {
  return useQuery({
    queryKey: adminKeys.list(params),
    queryFn: () => getAdmins(params),
    placeholderData: keepPreviousData,
  });
}
