import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../api/admin.keys';
import { getAdminById } from '../api';

/** Single-admin query for the admin detail page. Disabled until an id is present. */
export function useAdminQuery(id?: string) {
  return useQuery({
    queryKey: adminKeys.detail(id ?? ''),
    queryFn: () => getAdminById(id!),
    enabled: Boolean(id),
  });
}
