import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { ownerKeys } from '../api/owner.keys';
import { updateOwnerStatus } from '../api';
import type { OwnerAction } from '../api/owner.types';

/** Approve/reject/suspend/activate/block/unblock — reason optional per action. */
export function useOwnerActions() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: OwnerAction; reason?: string }) =>
      updateOwnerStatus(id, action, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.all });
      toast.success(t(`owner.toast.${variables.action}`));
    },
  });
}
