import { useQuery } from '@tanstack/react-query';
import { planKeys } from '../api/plan.keys';
import { getPlanById } from '../api';

/** Single-plan query for the plan detail page. Disabled until an id is present. */
export function usePlanQuery(id?: string) {
  return useQuery({
    queryKey: planKeys.detail(id ?? ''),
    queryFn: () => getPlanById(id!),
    enabled: Boolean(id),
  });
}
