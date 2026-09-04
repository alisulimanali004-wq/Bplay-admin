import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { facilityKeys } from '../api/facility.keys';
import { getPendingFacilities } from '../api';
import type { FacilityListParams } from '../api/facility.types';

/** The review queue — status is forced to 'pending' by the api layer. */
export function usePendingQueueQuery(params: FacilityListParams) {
  return useQuery({
    queryKey: facilityKeys.pending(params),
    queryFn: () => getPendingFacilities(params),
    placeholderData: keepPreviousData,
  });
}
