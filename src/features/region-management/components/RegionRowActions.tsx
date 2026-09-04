import { useTranslation } from 'react-i18next';
import {
  IconButton,
  ConfirmDialog,
  EditIcon,
  TrashIcon,
  UserPlusIcon,
  PowerIcon,
  MapPinIcon,
  EyeIcon,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { googleMapsLink } from '@shared/lib/geo';
import { useDeleteRegion, useRestoreRegion, useToggleRegion } from '../hooks/useRegionMutations';
import type { Region } from '../api/region.types';
import styles from './RegionRowActions.module.css';

interface Props {
  region: Region;
  onView: (region: Region) => void;
  onEdit: (region: Region) => void;
  onAssign: (region: Region) => void;
}

export function RegionRowActions({ region, onView, onEdit, onAssign }: Props) {
  const { t } = useTranslation();
  const toggle = useToggleRegion();
  const remove = useDeleteRegion();
  const restore = useRestoreRegion();
  const toggleConfirm = useDisclosure();
  const deleteConfirm = useDisclosure();
  const restoreConfirm = useDisclosure();
  const isActive = region.isActive;

  const openOnMap = () => {
    window.open(googleMapsLink(region.centerLat, region.centerLng), '_blank', 'noopener');
  };

  // A soft-deleted region only offers "view details" + "view on map" + "restore".
  if (region.isDeleted) {
    return (
      <div className={styles.actions}>
        <IconButton
          size="sm"
          variant="ghost"
          label={t('region.actions.viewDetails')}
          icon={<EyeIcon />}
          onClick={() => onView(region)}
          data-testid={`region-view-${region.id}`}
        />
        <IconButton
          size="sm"
          variant="ghost"
          label={t('region.actions.viewOnMap')}
          icon={<MapPinIcon />}
          onClick={openOnMap}
        />
        <IconButton
          size="sm"
          variant="ghost"
          label={t('region.actions.restore')}
          icon={<PowerIcon />}
          onClick={restoreConfirm.open}
          data-testid={`region-restore-${region.id}`}
        />
        <ConfirmDialog
          isOpen={restoreConfirm.isOpen}
          onClose={restoreConfirm.close}
          onConfirm={async () => {
            await restore.mutateAsync(region.id);
            restoreConfirm.close();
          }}
          title={t('region.restore.title')}
          message={t('region.restore.message')}
          confirmText={t('region.restore.confirm')}
          variant="primary"
          isLoading={restore.isPending}
        />
      </div>
    );
  }

  return (
    <div className={styles.actions}>
      <IconButton
        size="sm"
        variant="ghost"
        label={t('region.actions.viewDetails')}
        icon={<EyeIcon />}
        onClick={() => onView(region)}
        data-testid={`region-view-${region.id}`}
      />
      <IconButton
        size="sm"
        variant="ghost"
        label={t('region.actions.viewOnMap')}
        icon={<MapPinIcon />}
        onClick={openOnMap}
      />
      <IconButton
        size="sm"
        variant="ghost"
        label={t('region.actions.edit')}
        icon={<EditIcon />}
        onClick={() => onEdit(region)}
      />
      <IconButton
        size="sm"
        variant="ghost"
        label={t('region.actions.assign')}
        icon={<UserPlusIcon />}
        onClick={() => onAssign(region)}
      />
      <IconButton
        size="sm"
        variant={isActive ? 'caution' : 'ghost'}
        label={t(isActive ? 'region.actions.deactivate' : 'region.actions.activate')}
        icon={<PowerIcon />}
        onClick={toggleConfirm.open}
      />
      <IconButton
        size="sm"
        variant="danger"
        label={t('region.actions.delete')}
        icon={<TrashIcon />}
        onClick={deleteConfirm.open}
      />

      <ConfirmDialog
        isOpen={toggleConfirm.isOpen}
        onClose={toggleConfirm.close}
        onConfirm={async () => {
          await toggle.mutateAsync({ id: region.id, isActive: !isActive });
          toggleConfirm.close();
        }}
        title={t(isActive ? 'region.deactivate.title' : 'region.activate.title')}
        message={t(isActive ? 'region.deactivate.message' : 'region.activate.message')}
        confirmText={t(isActive ? 'region.deactivate.confirm' : 'region.activate.confirm')}
        variant={isActive ? 'caution' : 'primary'}
        isLoading={toggle.isPending}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={deleteConfirm.close}
        onConfirm={async () => {
          await remove.mutateAsync(region.id);
          deleteConfirm.close();
        }}
        title={t('region.delete.title')}
        message={t('region.delete.message')}
        confirmText={t('region.delete.confirm')}
        variant="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
}
