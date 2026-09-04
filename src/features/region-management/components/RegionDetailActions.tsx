import { useTranslation } from 'react-i18next';
import {
  Button,
  ConfirmDialog,
  EditIcon,
  MapPinIcon,
  PowerIcon,
  TrashIcon,
  UserPlusIcon,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { googleMapsLink } from '@shared/lib/geo';
import { useDeleteRegion, useRestoreRegion, useToggleRegion } from '../hooks/useRegionMutations';
import type { Region } from '../api/region.types';
import styles from './RegionDetailActions.module.css';

interface Props {
  region: Region;
  /** Open the shared edit modal (owned by the page). */
  onEdit: () => void;
  /** Open the shared assign-admins modal (owned by the page). */
  onAssign: () => void;
}

/**
 * The region detail header action bar (labeled buttons).
 *
 * No "Add facility": it seeded the new facility's coordinates from the region
 * CENTRE, inventing a location nobody chose. Facilities are created from the
 * facilities screen, where the location is picked explicitly.
 *
 * Owns ONLY the
 * toggle / delete / restore confirm dialogs; the edit + assign modals live on
 * the page and are opened through the onEdit / onAssign callbacks. A deleted
 * region shows only Restore + View on Google Maps.
 */
export function RegionDetailActions({ region, onEdit, onAssign }: Props) {
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

  const viewOnMapButton = (
    <Button variant="secondary" leftIcon={<MapPinIcon />} onClick={openOnMap}>
      {t('region.actions.viewOnMap')}
    </Button>
  );

  // A soft-deleted region only offers Restore + View on Google Maps.
  if (region.isDeleted) {
    return (
      <div className={styles.actions}>
        {viewOnMapButton}
        <Button
          leftIcon={<PowerIcon />}
          onClick={restoreConfirm.open}
          data-testid="region-detail-restore"
        >
          {t('region.actions.restore')}
        </Button>

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
      {viewOnMapButton}
      <Button variant="secondary" leftIcon={<UserPlusIcon />} onClick={onAssign} data-testid="region-detail-assign">
        {t('region.actions.assign')}
      </Button>
      <Button variant="secondary" leftIcon={<EditIcon />} onClick={onEdit} data-testid="region-detail-edit">
        {t('region.actions.edit')}
      </Button>
      <Button
        variant={isActive ? 'caution' : 'primary'}
        leftIcon={<PowerIcon />}
        onClick={toggleConfirm.open}
        data-testid="region-detail-toggle"
      >
        {t(isActive ? 'region.actions.deactivate' : 'region.actions.activate')}
      </Button>
      <Button
        variant="danger"
        leftIcon={<TrashIcon />}
        onClick={deleteConfirm.open}
        data-testid="region-detail-delete"
      >
        {t('region.actions.delete')}
      </Button>

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
