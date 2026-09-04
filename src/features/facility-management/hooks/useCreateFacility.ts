import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { facilityKeys } from '../api/facility.keys';
import { createFacility } from '../api';
import type { CreateFacilityInput } from '../api/facility.types';

/** Wizard submit — the page navigates with the returned facility's id. */
export function useCreateFacility() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: CreateFacilityInput) => createFacility(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facilityKeys.all });
      toast.success(t('facility.toast.created'));
    },
    onError: () => toast.error(t('facility.toast.error')),
  });
}
