import { useTranslation } from 'react-i18next';
import { ConfirmDialog, ReasonDialog } from '@ui';
import { actionNeedsReason, actionVariant } from './ownerActions';
import { useOwnerActions } from '../hooks/useOwnerActions';
import type { Owner, OwnerAction } from '../api/owner.types';

interface Props {
  owner: Owner;
  action: OwnerAction | null;
  onClose: () => void;
}

/** Runs a single owner action — a reason dialog for reject/suspend/block, a plain confirm otherwise. */
export function OwnerActionConfirm({ owner, action, onClose }: Props) {
  const { t } = useTranslation();
  const mutation = useOwnerActions();

  if (!action) return null;

  const variant = actionVariant(action);
  const run = (reason?: string) =>
    mutation.mutate({ id: owner.id, action, reason }, { onSuccess: onClose });

  if (actionNeedsReason(action)) {
    return (
      <ReasonDialog
        isOpen
        onClose={onClose}
        onConfirm={(reason) => run(reason)}
        title={t(`owner.confirm.${action}.title`)}
        description={t(`owner.confirm.${action}.message`, { name: owner.name })}
        reasonLabel={t('owner.confirm.reasonLabel')}
        reasonPlaceholder={t('owner.confirm.reasonPlaceholder')}
        confirmText={t(`owner.actions.${action}`)}
        cancelText={t('common.cancel')}
        variant={variant}
        isLoading={mutation.isPending}
      />
    );
  }

  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      onConfirm={() => run()}
      title={t(`owner.confirm.${action}.title`)}
      message={t(`owner.confirm.${action}.message`, { name: owner.name })}
      confirmText={t(`owner.actions.${action}`)}
      variant={variant}
      isLoading={mutation.isPending}
    />
  );
}
