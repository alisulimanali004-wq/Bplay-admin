import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Badge,
  Button,
  Spinner,
  IconButton,
  ConfirmDialog,
  PlusIcon,
  EditIcon,
  PowerIcon,
  TrashIcon,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { statusToBadgeVariant } from '@shared/utils/status';
import {
  useDeleteNeighbourhood,
  useNeighbourhoodsByCity,
  useToggleNeighbourhood,
} from '../hooks/useNeighbourhoods';
import { NeighbourhoodFormModal } from './NeighbourhoodFormModal';
import type { Region } from '../api/region.types';
import type { Neighbourhood } from '../api/neighbourhood.types';
import styles from './RegionNeighbourhoodsCard.module.css';

interface Props {
  city: Region;
}

/**
 * The sub-city level of the geography.
 *
 * A city owns zero or more neighbourhoods, each a smaller circle nested inside
 * the city's. They matter for two reasons beyond display: the backend resolves
 * a facility's city by finding the nearest NEIGHBOURHOOD, and an admin can be
 * scoped to individual neighbourhoods rather than a whole city.
 */
export function RegionNeighbourhoodsCard({ city }: Props) {
  const { t } = useTranslation();
  const { data: neighbourhoods, isLoading } = useNeighbourhoodsByCity(city.id);
  const toggle = useToggleNeighbourhood();
  const remove = useDeleteNeighbourhood();
  const form = useDisclosure();
  const [editing, setEditing] = useState<Neighbourhood | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Neighbourhood | null>(null);

  const openAdd = () => {
    setEditing(null);
    form.open();
  };

  const openEdit = (neighbourhood: Neighbourhood) => {
    setEditing(neighbourhood);
    form.open();
  };

  const list = neighbourhoods ?? [];

  return (
    <Card className={styles.card} data-testid="region-detail-neighbourhoods">
      <div className={styles.head}>
        <h2 className={styles.title}>
          {t('region.hood.title')}
          {list.length > 0 && <span className={styles.count}>{list.length}</span>}
        </h2>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<PlusIcon />}
          onClick={openAdd}
          data-testid="hood-add"
        >
          {t('region.hood.add')}
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        // Worth stating plainly: a city with no neighbourhoods cannot be matched
        // by the backend's facility-location resolver at all.
        <p className={styles.empty}>{t('region.hood.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {list.map((neighbourhood) => (
            <li key={neighbourhood.id} className={styles.row}>
              <div className={styles.info}>
                <span className={styles.name}>{neighbourhood.name}</span>
                <span className={styles.meta}>
                  {t('region.hood.radius', {
                    km: Number.isFinite(neighbourhood.radiusKm)
                      ? neighbourhood.radiusKm.toFixed(1)
                      : '—',
                  })}
                </span>
              </div>
              <Badge variant={statusToBadgeVariant(neighbourhood.isActive ? 'active' : 'inactive')}>
                {t(neighbourhood.isActive ? 'status.active' : 'status.inactive')}
              </Badge>
              <div className={styles.actions}>
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={t('common.edit')}
                  icon={<EditIcon />}
                  onClick={() => openEdit(neighbourhood)}
                />
                <IconButton
                  size="sm"
                  variant={neighbourhood.isActive ? 'caution' : 'ghost'}
                  label={t(neighbourhood.isActive ? 'region.hood.deactivate' : 'region.hood.activate')}
                  icon={<PowerIcon />}
                  onClick={() =>
                    toggle.mutate({ id: neighbourhood.id, isActive: !neighbourhood.isActive })
                  }
                />
                <IconButton
                  size="sm"
                  variant="danger"
                  label={t('common.delete')}
                  icon={<TrashIcon />}
                  onClick={() => setPendingDelete(neighbourhood)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {form.isOpen && (
        <NeighbourhoodFormModal
          isOpen={form.isOpen}
          onClose={form.close}
          city={city}
          neighbourhood={editing}
        />
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await remove.mutateAsync(pendingDelete.id);
          setPendingDelete(null);
        }}
        title={t('region.hood.delete.title')}
        message={t('region.hood.delete.message', { name: pendingDelete?.name ?? '' })}
        confirmText={t('region.hood.delete.confirm')}
        variant="danger"
        isLoading={remove.isPending}
      />
    </Card>
  );
}
