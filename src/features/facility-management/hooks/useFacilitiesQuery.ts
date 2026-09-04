import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { facilityKeys } from '../api/facility.keys';
import { getFacilities } from '../api';
import type { FacilityListParams } from '../api/facility.types';

export function useFacilitiesQuery(params: FacilityListParams) {
  return useQuery({
    queryKey: facilityKeys.list(params),
    queryFn: () => getFacilities(params),
    placeholderData: keepPreviousData,
  });
}
