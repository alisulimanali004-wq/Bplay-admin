import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { facilityKeys } from '../api/facility.keys';
import {
  approveFacility,
  reactivateFacility,
  rejectFacility,
  suspendFacility,
} from '../api';

/**
 * Approve / reject / suspend / reactivate. One invalidation of the root key
 * covers list, pending queue, pending count and detail at once.
 */
export function useFacilityActions() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  const onDone = (toastKey: string) => () => {
    queryClient.invalidateQueries({ queryKey: facilityKeys.all });
    toast.success(t(toastKey));
  };
  const onFail = () => toast.error(t('facility.toast.error'));

  const approve = useMutation({
    mutationFn: (id: string) => approveFacility(id),
    onSuccess: onDone('facility.toast.approved'),
    onError: onFail,
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectFacility(id, reason),
    onSuccess: onDone('facility.toast.rejected'),
    onError: onFail,
  });

  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => suspendFacility(id, reason),
    onSuccess: onDone('facility.toast.suspended'),
    onError: onFail,
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => reactivateFacility(id),
    onSuccess: onDone('facility.toast.reactivated'),
    onError: onFail,
  });

  return { approve, reject, suspend, reactivate };
}
