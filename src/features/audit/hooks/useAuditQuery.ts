import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditKeys } from '../api/audit.keys';
import { getAuditLog } from '../api';
import type { AuditListParams } from '../api/audit.types';

/**
 * The audit log page.
 *
 * `keepPreviousData` matters more here than on a normal list: an investigator
 * pages through the trail, and a table that empties to a skeleton on every page
 * change loses their place on every click.
 */
export function useAuditQuery(params: AuditListParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => getAuditLog(params),
    placeholderData: keepPreviousData,
  });
}
