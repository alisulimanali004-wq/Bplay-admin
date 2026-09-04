import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { ownerKeys } from '../api/owner.keys';
import { reviewOwnerDocument } from '../api';
import type { OwnerDocAction } from '../api/owner.types';

/** Accept/reject a single verification document (reject carries a reason). */
export function useOwnerDocumentReview() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      id,
      documentId,
      action,
      reason,
    }: {
      id: string;
      documentId: string;
      action: OwnerDocAction;
      reason?: string;
    }) => reviewOwnerDocument(id, documentId, action, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ownerKeys.stats() });
      toast.success(
        t(variables.action === 'accept' ? 'owner.doc.toast.accepted' : 'owner.doc.toast.rejected'),
      );
    },
  });
}
