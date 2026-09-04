import { useTranslation } from 'react-i18next';
import { Alert, Button, ConfirmDialog, Modal } from '@ui';
import { usePlanFormat } from '../hooks/usePlanFormat';
import { useDeletePlan, useSetPlanActive } from '../hooks/usePlanMutations';
import { canDeletePlan, type Plan } from '../api/plan.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  /** Called after a successful delete — the detail page uses it to navigate away. */
  onDeleted?: () => void;
}

/**
 * PN4 / FR-ADM-PLAN-004 — «خطة فيها مشتركون → لا تُحذف، يُكتفى بإلغاء التفعيل».
 * A plan with subscribers can never be deleted, so the dialog does not offer a
 * disabled button and a dead end: it explains why and hands the admin the
 * deactivate action instead. A plan with no subscribers gets a plain confirm.
 */
export function PlanDeleteDialog({ isOpen, onClose, plan, onDeleted }: Props) {
  const { t } = useTranslation();
  const fmt = usePlanFormat();
  const deleteMutation = useDeletePlan();
  const deactivateMutation = useSetPlanActive();

  if (!plan) return null;

  if (!canDeletePlan(plan)) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('plan.delete.blockedTitle')}
        size="sm"
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            {plan.isActive && (
              <Button
                variant="caution"
                isLoading={deactivateMutation.isPending}
                data-testid="plan-delete-deactivate"
                onClick={async () => {
                  await deactivateMutation.mutateAsync({ id: plan.id, isActive: false });
                  onClose();
                }}
              >
                {t('plan.actions.deactivate')}
              </Button>
            )}
          </>
        }
      >
        <Alert variant="warning">
          {t('plan.delete.blockedMessage', {
            name: plan.name,
            n: fmt.number(plan.subscriberCount),
          })}
        </Alert>
      </Modal>
    );
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('plan.delete.title')}
      message={t('plan.delete.message', { name: plan.name })}
      confirmText={t('common.delete')}
      cancelText={t('common.cancel')}
      variant="danger"
      isLoading={deleteMutation.isPending}
      onConfirm={async () => {
        await deleteMutation.mutateAsync(plan.id);
        onClose();
        onDeleted?.();
      }}
    />
  );
}
