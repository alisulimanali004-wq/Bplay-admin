import { useTranslation } from 'react-i18next';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ConfirmDialog,
  EditIcon,
  EyeIcon,
  IconButton,
  PowerIcon,
  TrashIcon,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { useMovePlan, useSetPlanActive } from '../hooks/usePlanMutations';
import type { Plan } from '../api/plan.types';
import styles from './planActions.module.css';

interface Props {
  plan: Plan;
  onView: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  /** Position of the plan inside its own audience group, for the move guards. */
  isFirst: boolean;
  isLast: boolean;
}

/** Row actions for the catalog table: view, edit, reorder, activate/deactivate, delete. */
export function PlanRowActions({ plan, onView, onEdit, onDelete, isFirst, isLast }: Props) {
  const { t } = useTranslation();
  const deactivate = useDisclosure();
  const setActive = useSetPlanActive();
  const move = useMovePlan();

  return (
    <div className={styles.rowActions}>
      <IconButton
        size="sm"
        label={t('plan.actions.view')}
        icon={<EyeIcon />}
        onClick={() => onView(plan)}
        data-testid={`plan-view-${plan.id}`}
      />
      <IconButton
        size="sm"
        label={t('common.edit')}
        icon={<EditIcon />}
        onClick={() => onEdit(plan)}
        data-testid={`plan-edit-${plan.id}`}
      />
      <IconButton
        size="sm"
        label={t('plan.actions.moveUp')}
        icon={<ChevronUpIcon />}
        disabled={isFirst || move.isPending}
        onClick={() => move.mutate({ id: plan.id, direction: 'up' })}
        data-testid={`plan-move-up-${plan.id}`}
      />
      <IconButton
        size="sm"
        label={t('plan.actions.moveDown')}
        icon={<ChevronDownIcon />}
        disabled={isLast || move.isPending}
        onClick={() => move.mutate({ id: plan.id, direction: 'down' })}
        data-testid={`plan-move-down-${plan.id}`}
      />
      <IconButton
        size="sm"
        variant={plan.isActive ? 'caution' : 'primary'}
        label={t(plan.isActive ? 'plan.actions.deactivate' : 'plan.actions.activate')}
        icon={<PowerIcon />}
        disabled={setActive.isPending}
        // Activating is safe and immediate; deactivating hides the plan from the
        // apps, so it goes through a confirm.
        onClick={() =>
          plan.isActive ? deactivate.open() : setActive.mutate({ id: plan.id, isActive: true })
        }
        data-testid={`plan-toggle-${plan.id}`}
      />
      <IconButton
        size="sm"
        variant="danger"
        label={t('common.delete')}
        icon={<TrashIcon />}
        onClick={() => onDelete(plan)}
        data-testid={`plan-delete-${plan.id}`}
      />

      <ConfirmDialog
        isOpen={deactivate.isOpen}
        onClose={deactivate.close}
        title={t('plan.confirm.deactivateTitle')}
        message={t('plan.confirm.deactivateMessage', { name: plan.name })}
        confirmText={t('plan.actions.deactivate')}
        cancelText={t('common.cancel')}
        variant="caution"
        isLoading={setActive.isPending}
        onConfirm={async () => {
          await setActive.mutateAsync({ id: plan.id, isActive: false });
          deactivate.close();
        }}
      />
    </div>
  );
}
