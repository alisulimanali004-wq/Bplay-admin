import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { ownerKeys } from '../api/owner.keys';
import { uploadOwnerDocument } from '../api';
import type { OwnerDocType } from '../api/owner.types';

/**
 * Attach a verification document to an owner on their behalf.
 *
 * An admin-created owner has no documents at all, so the review screen has
 * nothing to act on and the account cannot be approved. This is how the
 * paperwork gets in.
 */
export function useUploadOwnerDocument() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, docType, file }: { id: string; docType: OwnerDocType; file: File }) =>
      uploadOwnerDocument(id, docType, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ownerKeys.stats() });
      toast.success(t('owner.doc.toast.uploaded'));
    },
  });
}
