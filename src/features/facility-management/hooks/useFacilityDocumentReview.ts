import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { facilityKeys } from '../api/facility.keys';
import { reviewFacilityDocument } from '../api';
import type { FacilityDocAction } from '../api/facility.types';

/** Accept/reject a single facility verification document (reject carries a reason). */
export function useFacilityDocumentReview() {
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
      action: FacilityDocAction;
      reason?: string;
    }) => reviewFacilityDocument(id, documentId, action, reason),
    onSuccess: (_data, variables) => {
      // The document status feeds the detail card, the directory verification
      // badge/filter and the review-desk chips — refresh the whole feature.
      queryClient.invalidateQueries({ queryKey: facilityKeys.all });
      toast.success(
        t(
          variables.action === 'accept'
            ? 'facility.doc.toast.accepted'
            : 'facility.doc.toast.rejected',
        ),
      );
    },
    onError: () => toast.error(t('facility.toast.error')),
  });
}
