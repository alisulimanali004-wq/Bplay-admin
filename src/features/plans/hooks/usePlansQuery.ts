import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { planKeys } from '../api/plan.keys';
import { getPlans } from '../api';
import type { PlanListParams } from '../api/plan.types';

/** The plan catalog list — keeps the previous page while the next one loads. */
export function usePlansQuery(params: PlanListParams) {
  return useQuery({
    queryKey: planKeys.list(params),
    queryFn: () => getPlans(params),
    placeholderData: keepPreviousData,
  });
}
