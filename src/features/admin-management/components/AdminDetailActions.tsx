import { useTranslation } from 'react-i18next';
import {
  Button,
  ConfirmDialog,
  EditIcon,
  GlobeIcon,
  LockIcon,
  MapPinIcon,
  PowerIcon,
  TrashIcon,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { useDeleteAdmin, useSetAdminScope, useToggleAdmin } from '../hooks/useAdminMutations';
import type { Admin } from '../api/admin.types';
import styles from './AdminDetailActions.module.css';

interface Props {
  admin: Admin;
  /** Open the page-owned edit modal. */
  onEdit: () => void;
  /** Open the page-owned assign-regions modal. */
  onAssign: () => void;
  /** Open the page-owned set-password modal. */
  onResetPassword: () => void;
}

/**
 * The admin detail header action bar. Owns the promote/demote, toggle and delete
 * confirm dialogs; edit / assign / reset are page-owned modals opened via
 * callbacks.
 *
 * There is no deleted-admin branch: deletion is permanent, so an admin is never
 * in a "deleted but restorable" state.
 */
export function AdminDetailActions({ admin, onEdit, onAssign, onResetPassword }: Props) {
  const { t } = useTranslation();
  const toggle = useToggleAdmin();
  const remove = useDeleteAdmin();
  const setScope = useSetAdminScope();
  const scopeConfirm = useDisclosure();
  const toggleConfirm = useDisclosure();
  const deleteConfirm = useDisclosure();
  const isActive = admin.status === 'active';
  const nextScope = admin.scope === 'regional' ? 'general' : 'regional';

  return (
    <div className={styles.actions}>
      <Button variant="secondary" leftIcon={<EditIcon />} onClick={onEdit} data-testid="admin-detail-edit">
        {t('admin.actions.edit')}
      </Button>
      {admin.scope === 'regional' && (
        <Button
          variant="secondary"
          leftIcon={<MapPinIcon />}
          onClick={onAssign}
          data-testid="admin-detail-assign"
        >
          {t('admin.actions.assignRegions')}
        </Button>
      )}
      <Button
        variant="secondary"
        leftIcon={<LockIcon />}
        onClick={onResetPassword}
        data-testid="admin-detail-reset"
      >
        {t('admin.actions.resetPassword')}
      </Button>
      <Button
        variant="secondary"
        leftIcon={<GlobeIcon />}
        onClick={scopeConfirm.open}
        data-testid="admin-detail-scope"
      >
        {t(nextScope === 'general' ? 'admin.actions.promote' : 'admin.actions.demote')}
      </Button>
      <Button
        variant={isActive ? 'caution' : 'primary'}
        leftIcon={<PowerIcon />}
        onClick={toggleConfirm.open}
        data-testid="admin-detail-toggle"
      >
        {t(isActive ? 'admin.actions.suspend' : 'admin.actions.activate')}
      </Button>
      <Button
        variant="danger"
        leftIcon={<TrashIcon />}
        onClick={deleteConfirm.open}
        data-testid="admin-detail-delete"
      >
        {t('admin.actions.delete')}
      </Button>

      <ConfirmDialog
        isOpen={scopeConfirm.isOpen}
        onClose={scopeConfirm.close}
        onConfirm={async () => {
          await setScope.mutateAsync({ id: admin.id, scope: nextScope });
          scopeConfirm.close();
        }}
        title={t(nextScope === 'general' ? 'admin.promote.title' : 'admin.demote.title')}
        message={t(nextScope === 'general' ? 'admin.promote.message' : 'admin.demote.message')}
        confirmText={t(nextScope === 'general' ? 'admin.promote.confirm' : 'admin.demote.confirm')}
        variant="primary"
        isLoading={setScope.isPending}
      />

      <ConfirmDialog
        isOpen={toggleConfirm.isOpen}
        onClose={toggleConfirm.close}
        onConfirm={async () => {
          await toggle.mutateAsync({ id: admin.id, isActive: !isActive });
          toggleConfirm.close();
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
