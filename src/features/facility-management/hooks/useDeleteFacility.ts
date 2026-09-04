import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { errorMessageKey } from '@shared/lib/errors';
import { facilityKeys } from '../api/facility.keys';
import { deleteFacility } from '../api';

/**
 * Soft-delete a facility.
 *
 * The failure toast reads the SERVER's reason rather than a generic message:
 * the common rejection is "there are still upcoming bookings"
 * (ERR_FACILITY_HAS_BOOKINGS), which tells the admin exactly what to do next,
 * whereas a flat "something went wrong" would leave them retrying forever.
 */
export function useDeleteFacility() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => deleteFacility(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facilityKeys.all });
      toast.success(t('facility.toast.deleted'));
    },
    onError: (error) => {
      const key = errorMessageKey(error);
      toast.error(key ? t(key) : t('facility.toast.error'));
    },
  });
}
