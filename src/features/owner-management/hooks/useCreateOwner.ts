import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { ownerKeys } from '../api/owner.keys';
import { createOwner } from '../api';
import type { CreateOwnerInput } from '../api/owner.types';

/** Create an owner with a one-time temporary password (FR-ADM-OWNER-005). */
export function useCreateOwner() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: CreateOwnerInput) => createOwner(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.all });
      toast.success(t('owner.toast.created'));
    },
  });
}
