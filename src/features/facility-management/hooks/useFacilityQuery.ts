import { useQuery } from '@tanstack/react-query';
import { facilityKeys } from '../api/facility.keys';
import { getFacilityById } from '../api';

export function useFacilityQuery(id: string | undefined) {
  return useQuery({
    queryKey: facilityKeys.detail(id ?? ''),
    queryFn: () => getFacilityById(id as string),
    enabled: Boolean(id),
  });
}
