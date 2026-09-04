import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, IconButton } from '@ui';
import { actionVariant, availableActions } from './facilityActions';
import { FACILITY_ACTION_ICONS, FacilityActionDialogs } from './FacilityStatusActions';
import { facilityDocsAllApproved, type FacilityAction, type FacilityListItem } from '../api/facility.types';
import styles from './FacilityRowActions.module.css';

export interface FacilityRowActionsProps {
  item: FacilityListItem;
  onView: (item: FacilityListItem) => void;
}

/** Directory row actions: View + the governance actions valid for this facility's status. */
export function FacilityRowActions({ item, onView }: FacilityRowActionsProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<FacilityAction | null>(null);
  const actions = availableActions(item.status);

  return (
    <div className={styles.actions}>
      <IconButton
        size="sm"
        variant="ghost"
        label={t('facility.actions.view')}
        icon={<EyeIcon />}
        onClick={() => onView(item)}
        data-testid={`facility-row-view-${item.id}`}
      />
      {actions.map((action) => {
        const variant = actionVariant(action);
        const blocked = action === 'approve' && !facilityDocsAllApproved(item.documents);
        return (
          <IconButton
            key={action}
            size="sm"
            variant={variant === 'primary' ? 'ghost' : variant}
            label={blocked ? t('facility.approveBlocked') : t(`facility.actions.${action}`)}
            icon={FACILITY_ACTION_ICONS[action]}
            disabled={blocked}
            onClick={() => setPending(action)}
            data-testid={`facility-row-${action}-${item.id}`}
          />
        );
      })}

      <FacilityActionDialogs
        facility={{
          id: item.id,
          name: item.name,
          status: item.status,
          documents: item.documents,
        }}
        action={pending}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
