import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, CheckIcon, XIcon, PowerIcon, BanIcon, AlertTriangleIcon } from '@ui';
import { actionVariant, ownerActionStates } from './ownerActions';
import { OwnerActionConfirm } from './OwnerActionConfirm';
import type { Owner, OwnerAction } from '../api/owner.types';
import styles from './OwnerStatusActions.module.css';

interface Props {
  owner: Owner;
}

const ACTION_ICON: Record<OwnerAction, ReactNode> = {
  approve: <CheckIcon />,
  reject: <XIcon />,
  suspend: <PowerIcon />,
  activate: <PowerIcon />,
  block: <BanIcon />,
  unblock: <PowerIcon />,
};

/** Full set of account actions on the owner detail header. */
export function OwnerStatusActions({ owner }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<OwnerAction | null>(null);
  const states = ownerActionStates(owner);

  if (states.length === 0) return null;

  // At most one gate is in play at a time (only "approve" has one), so the
  // explanation reads as a single sentence under the row.
  const gated = states.find((state) => state.disabled && state.reasonKey);

  return (
    <div className={styles.wrap}>
      <div className={styles.actions}>
        {states.map(({ action, disabled, reasonKey, reasonParams }) => {
          const variant = actionVariant(action);
          return (
            <Button
              key={action}
              leftIcon={ACTION_ICON[action]}
              variant={variant === 'primary' ? 'secondary' : variant}
              disabled={disabled}
              title={disabled && reasonKey ? t(reasonKey, reasonParams) : undefined}
              onClick={() => setPending(action)}
              data-testid={`owner-action-${action}`}
            >
              {t(`owner.actions.${action}`)}
            </Button>
          );
        })}
      </div>

      {gated?.reasonKey && (
        <p className={styles.gate} data-testid="owner-action-gate">
          <span className={styles.gateIcon} aria-hidden>
            <AlertTriangleIcon />
          </span>
          {t(gated.reasonKey, gated.reasonParams)}
        </p>
      )}

      <OwnerActionConfirm owner={owner} action={pending} onClose={() => setPending(null)} />
    </div>
  );
}
