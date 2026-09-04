import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BanIcon, Button, CheckIcon, ConfirmDialog, PowerIcon, ReasonDialog, XIcon } from '@ui';
import { actionVariant, availableActions, type FacilityActionTarget } from './facilityActions';
import { useFacilityActions } from '../hooks/useFacilityActions';
import { facilityDocsAllApproved, type FacilityAction } from '../api/facility.types';

/** One icon per governance action — shared by the header buttons and row actions. */
export const FACILITY_ACTION_ICONS: Record<FacilityAction, ReactNode> = {
  approve: <CheckIcon />,
  reject: <XIcon />,
  suspend: <BanIcon />,
  reactivate: <PowerIcon />,
};

export interface FacilityActionDialogsProps {
  facility: FacilityActionTarget;
  action: FacilityAction | null;
  onClose: () => void;
  onDone?: () => void;
}

/**
 * The single dialog pair behind every facility governance flow: approve and
 * reactivate confirm via ConfirmDialog; reject and suspend demand a ≥10-char
 * reason via ReasonDialog (mirrors the backend's reason-required rule).
 */
export function FacilityActionDialogs({
  facility,
  action,
  onClose,
  onDone,
}: FacilityActionDialogsProps) {
  const { t } = useTranslation();
  const { approve, reject, suspend, reactivate } = useFacilityActions();

  const confirmAction = action === 'approve' || action === 'reactivate' ? action : null;
  const reasonAction = action === 'reject' || action === 'suspend' ? action : null;
  const confirmMutation = confirmAction === 'reactivate' ? reactivate : approve;
  const reasonMutation = reasonAction === 'suspend' ? suspend : reject;

  return (
    <>
      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={onClose}
        onConfirm={async () => {
          if (!confirmAction) return;
          await confirmMutation.mutateAsync(facility.id);
          onClose();
          onDone?.();
        }}
        title={confirmAction ? t(`facility.confirm.${confirmAction}.title`) : ''}
        message={
          confirmAction
            ? t(`facility.confirm.${confirmAction}.message`, { name: facility.name })
            : undefined
        }
        confirmText={confirmAction ? t(`facility.actions.${confirmAction}`) : ''}
        cancelText={t('common.cancel')}
        variant="primary"
        isLoading={confirmMutation.isPending}
      />

      <ReasonDialog
        isOpen={reasonAction !== null}
        onClose={onClose}
        onConfirm={async (reason) => {
          if (!reasonAction) return;
          await reasonMutation.mutateAsync({ id: facility.id, reason });
          onClose();
          onDone?.();
        }}
        title={reasonAction ? t(`facility.reason.${reasonAction}.title`) : ''}
        description={reasonAction ? t(`facility.reason.${reasonAction}.description`) : undefined}
        reasonLabel={reasonAction ? t(`facility.reason.${reasonAction}.label`) : ''}
        reasonPlaceholder={
          reasonAction ? t(`facility.reason.${reasonAction}.placeholder`) : undefined
        }
        confirmText={reasonAction ? t(`facility.reason.${reasonAction}.confirm`) : ''}
        cancelText={t('common.cancel')}
        variant={reasonAction === 'suspend' ? 'caution' : 'danger'}
        minLength={10}
        isLoading={reasonMutation.isPending}
      />
    </>
  );
}

export interface FacilityStatusActionsProps {
  facility: FacilityActionTarget;
}

/**
 * The governance buttons for the profile PageHeader, driven by
 * availableActions(): pending → Approve + Reject; active/owner_suspended →
 * Suspend; suspended → Reactivate; rejected → nothing. Renders as a fragment —
 * the PageHeader actions slot provides the flex layout.
 */
export function FacilityStatusActions({ facility }: FacilityStatusActionsProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<FacilityAction | null>(null);
  const actions = availableActions(facility.status);

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      {actions.map((action) => {
        const blocked = action === 'approve' && !facilityDocsAllApproved(facility.documents);
        return (
          <Button
            key={action}
            size="sm"
            variant={actionVariant(action)}
            leftIcon={FACILITY_ACTION_ICONS[action]}
            disabled={blocked}
            title={blocked ? t('facility.approveBlocked') : undefined}
            onClick={() => setPending(action)}
            data-testid={`facility-action-${action}`}
          >
            {t(`facility.actions.${action}`)}
          </Button>
        );
      })}

      <FacilityActionDialogs
        facility={facility}
        action={pending}
        onClose={() => setPending(null)}
      />
    </>
  );
}
