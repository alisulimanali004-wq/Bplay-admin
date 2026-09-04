import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { facilityKeys } from '../api/facility.keys';
import { bulkAction } from '../api';
import type { BulkFacilityAction } from '../api/facility.types';

/** Approve or reject many pending submissions at once from the review queue. */
export function useBulkFacilityAction() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      ids,
      action,
      reason,
    }: {
      ids: string[];
      action: BulkFacilityAction;
      reason?: string;
    }) => bulkAction(ids, action, reason),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: facilityKeys.all });
      toast.success(
        t(
          variables.action === 'approve'
            ? 'facility.toast.bulkApproved'
            : 'facility.toast.bulkRejected',
          { count: result.succeeded },
        ),
      );
      if (result.skipped.length > 0) {
        toast.info(t('facility.toast.bulkSkipped', { count: result.skipped.length }));
      }
    },
    onError: () => toast.error(t('facility.toast.error')),
  });
}
