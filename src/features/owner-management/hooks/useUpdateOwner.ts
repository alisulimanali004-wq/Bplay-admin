import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { errorMessageKey } from '@shared/lib/errors';
import { ownerKeys } from '../api/owner.keys';
import { updateOwner } from '../api';
import type { EditOwnerInput } from '../api/owner.types';

/**
 * Edit an owner's profile details (name, address).
 *
 * The failure toast prefers the SERVER's reason: this endpoint refuses
 * protected fields explicitly (ERR_FIELD_NOT_EDITABLE), and that is worth
 * showing rather than flattening into a generic error.
 */
export function useUpdateOwner() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditOwnerInput }) => updateOwner(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.all });
      toast.success(t('owner.toast.updated'));
    },
    onError: (error) => {
      const key = errorMessageKey(error);
      toast.error(key ? t(key) : t('owner.toast.error'));
    },
  });
}
