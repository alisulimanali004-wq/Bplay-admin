import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Badge } from '@ui';
import { useNeighbourhoods } from '@features/region-management/hooks/useNeighbourhoods';
import { useAssignRegions } from '../hooks/useAdminMutations';
import { RegionPicker } from './RegionPicker';
import type { Admin } from '../api/admin.types';
import styles from './adminForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin | null;
}

/**
 * Region assignment for a regional admin, across both levels of the geography.
 *
 * Pick cities, then optionally narrow to specific NEIGHBOURHOODS within them.
 * A city with no neighbourhood selected means the whole city; selecting some
 * means only those. Both are many-to-many — several admins may cover the same
 * city or the same neighbourhood (`admin_neighbourhoods` is keyed on the pair),
 * so nothing here is exclusive.
 *
 * Which of the two the backend stores matters: a positive neighbourhood grant
 * takes precedence over the city grant in its scope resolver, so selecting
 * "Olaya" under Riyadh narrows the admin to Olaya rather than adding to Riyadh.
 * The UI states that in the hint rather than hiding it.
 */
export function AssignRegionsModal({ isOpen, onClose, admin }: Props) {
  const { t } = useTranslation();
  const mutation = useAssignRegions();
  const { data: neighbourhoods } = useNeighbourhoods();
  const [cities, setCities] = useState<string[]>([]);
  const [hoods, setHoods] = useState<string[]>([]);

  // Pre-check from the admin's current scope; reset on (re)open.
  useEffect(() => {
    if (isOpen) {
      setCities(admin?.assignedRegionIds ?? []);
      setHoods(admin?.includedNeighbourhoodIds ?? []);
    }
  }, [isOpen, admin]);

  /** Neighbourhoods of the selected cities, grouped by city. */
  const groups = useMemo(() => {
    const byCity = new Map<string, { cityName: string; items: typeof neighbourhoods }>();
    for (const hood of neighbourhoods ?? []) {
      if (!cities.includes(hood.cityId)) continue;
      const entry = byCity.get(hood.cityId) ?? { cityName: hood.cityName, items: [] };
      entry.items = [...(entry.items ?? []), hood];
      byCity.set(hood.cityId, entry);
    }
    return [...byCity.entries()].map(([cityId, entry]) => ({ cityId, ...entry }));
  }, [neighbourhoods, cities]);

  const toggleHood = (id: string) => {
    setHoods((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!admin) return;
    // Keep only selections that still sit inside a selected city — dropping a
    // city must not leave a grant pointing into it.
    const live = new Set(
      (neighbourhoods ?? []).filter((h) => cities.includes(h.cityId)).map((h) => h.id),
    );
    await mutation.mutateAsync({
      id: admin.id,
      regionIds: cities,
      neighbourhoods: {
        includedIds: hoods.filter((id) => live.has(id)),
        // Exclusions are not authored here; preserve whatever is already set
        // rather than silently clearing a carve-out made elsewhere.
        excludedIds: admin.excludedNeighbourhoodIds ?? [],
      },
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin.assign.title')}
      description={t('admin.assign.subtitle')}
      size="lg"
      closeLabel={t('common.cancel')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} isLoading={mutation.isPending} data-testid="admin-assign-submit">
            {t('admin.assign.submit')}
          </Button>
        </>
      }
    >
      <RegionPicker value={cities} onChange={setCities} />

      {groups.length > 0 && (
        <section className={styles.exclusions} data-testid="admin-assign-hoods">
          <h3 className={styles.exclusionsTitle}>{t('admin.assign.hoods.title')}</h3>
          <p className={styles.exclusionsHint}>{t('admin.assign.hoods.hint')}</p>

          {groups.map((group) => {
            const picked = (group.items ?? []).filter((hood) => hoods.includes(hood.id)).length;
            return (
              <div key={group.cityId} className={styles.exclusionGroup}>
                <span className={styles.exclusionCity}>
                  {group.cityName}
                  <span className={styles.exclusionScope}>
                    {picked === 0
                      ? t('admin.assign.hoods.wholeCity')
                      : t('admin.assign.hoods.limited', { count: picked })}
                  </span>
                </span>
                <div className={styles.exclusionChips}>
                  {(group.items ?? []).map((hood) => {
                    const on = hoods.includes(hood.id);
                    return (
                      <button
                        key={hood.id}
                        type="button"
                        className={styles.exclusionChip}
                        onClick={() => toggleHood(hood.id)}
                        aria-pressed={on}
                        data-testid={`admin-hood-${hood.id}`}
                      >
                        <Badge variant={on ? 'success' : 'neutral'}>
                          {on ? t('admin.assign.hoods.on') : t('admin.assign.hoods.off')}
                        </Badge>
                        <span>{hood.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </Modal>
  );
}
