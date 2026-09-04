import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { facilityKeys } from '../api/facility.keys';
import { updateFacility } from '../api';
import type { UpdateFacilityInput } from '../api/facility.types';

/** Edit wizard submit — the page navigates to the updated facility's profile. */
export function useUpdateFacility() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFacilityInput }) =>
      updateFacility(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facilityKeys.all });
      toast.success(t('facility.toast.updated'));
    },
    onError: () => toast.error(t('facility.toast.error')),
  });
}
