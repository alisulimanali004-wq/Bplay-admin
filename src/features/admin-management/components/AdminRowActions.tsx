import { useTranslation } from 'react-i18next';
import {
  IconButton,
  ConfirmDialog,
  EditIcon,
  TrashIcon,
  PowerIcon,
  EyeIcon,
  MapPinIcon,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { useDeleteAdmin, useToggleAdmin } from '../hooks/useAdminMutations';
import type { Admin } from '../api/admin.types';
import styles from './AdminRowActions.module.css';

interface Props {
  admin: Admin;
  onView: (admin: Admin) => void;
  onEdit: (admin: Admin) => void;
  onAssign: (admin: Admin) => void;
}

/**
 * There is no deleted-admin branch here any more. Deletion is permanent — the
 * API removes the row outright — so an admin is never in a "deleted but
 * restorable" state and the restore action it used to offer could not work.
 * Deactivating is the reversible alternative, and it is still on this row.
 */
export function AdminRowActions({ admin, onView, onEdit, onAssign }: Props) {
  const { t } = useTranslation();
  const toggle = useToggleAdmin();
  const remove = useDeleteAdmin();
  const suspendConfirm = useDisclosure();
  const deleteConfirm = useDisclosure();
  const isActive = admin.status === 'active';

  return (
    <div className={styles.actions}>
      <IconButton
        size="sm"
        variant="ghost"
        label={t('admin.actions.viewDetails')}
        icon={<EyeIcon />}
        onClick={() => onView(admin)}
        data-testid={`admin-view-${admin.id}`}
      />
      <IconButton
        size="sm"
        variant="ghost"
        label={t('admin.actions.edit')}
        icon={<EditIcon />}
        onClick={() => onEdit(admin)}
      />
      {admin.scope === 'regional' && (
        <IconButton
          size="sm"
          variant="ghost"
          label={t('admin.actions.assignRegions')}
          icon={<MapPinIcon />}
          onClick={() => onAssign(admin)}
        />
      )}
      <IconButton
        size="sm"
        variant={isActive ? 'caution' : 'ghost'}
        label={t(isActive ? 'admin.actions.suspend' : 'admin.actions.activate')}
        icon={<PowerIcon />}
        onClick={suspendConfirm.open}
      />
      <IconButton
        size="sm"
        variant="danger"
        label={t('admin.actions.delete')}
        icon={<TrashIcon />}
        onClick={deleteConfirm.open}
      />

      <ConfirmDialog
        isOpen={suspendConfirm.isOpen}
        onClose={suspendConfirm.close}
        onConfirm={async () => {
          await toggle.mutateAsync({ id: admin.id, isActive: !isActive });
          suspendConfirm.close();
        }}
        title={t(isActive ? 'admin.suspend.title' : 'admin.activate.title')}
        message={t(isActive ? 'admin.suspend.message' : 'admin.activate.message')}
        confirmText={t(isActive ? 'admin.suspend.confirm' : 'admin.activate.confirm')}
        variant={isActive ? 'caution' : 'primary'}
        isLoading={toggle.isPending}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={deleteConfirm.close}
        onConfirm={async () => {
          await remove.mutateAsync(admin.id);
          deleteConfirm.close();
        }}
        title={t('admin.delete.title')}
        message={t('admin.delete.message')}
        confirmText={t('admin.delete.confirm')}
        variant="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
}
