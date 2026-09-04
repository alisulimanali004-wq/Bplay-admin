import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Spinner, Badge, SearchInput, XIcon } from '@ui';
import { useAssignAdmins } from '../hooks/useRegionMutations';
import { useAdminsForAssign } from '../hooks/useAdminsForAssign';
import { useAssignedAdminIds } from '../hooks/useAssignedAdminIds';
import type { Region } from '../api/region.types';
import styles from './regionForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  region: Region | null;
}

export function AssignAdminModal({ isOpen, onClose, region }: Props) {
  const { t } = useTranslation();
  const mutation = useAssignAdmins();
  const { data: admins, isLoading } = useAdminsForAssign();
  const { data: assignedIds } = useAssignedAdminIds();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  // Pre-check from the region's current assignment; reset filters on (re)open.
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(region?.assignedAdminIds ?? []);
      setQuery('');
      setUnassignedOnly(false);
      setActiveOnly(false);
    }
  }, [isOpen, region]);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const list = admins ?? [];
  // Chips always come from the FULL list so a filtered-out selection stays removable.
  const selectedAdmins = list.filter((admin) => selectedIds.includes(admin.id));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.filter((admin) => {
      if (needle && !admin.name.toLowerCase().includes(needle)) return false;
      if (unassignedOnly && assignedIds?.has(admin.id)) return false;
      if (activeOnly && !admin.isActive) return false;
      return true;
    });
  }, [list, query, unassignedOnly, activeOnly, assignedIds]);

  const submit = async () => {
    if (!region) return;
    // Only persist ids that still resolve to a live admin, and derive names from
    // that same set — so adminIds and adminNames always stay the same length/order.
    const validAdmins = list.filter((admin) => selectedIds.includes(admin.id));
    await mutation.mutateAsync({
      id: region.id,
      adminIds: validAdmins.map((admin) => admin.id),
      adminNames: validAdmins.map((admin) => admin.name),
    });
    onClose();
  };

  const hasFilter = query.trim().length > 0 || unassignedOnly || activeOnly;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('region.assign.title')}
      description={t('region.assign.subtitle')}
      size="lg"
      closeLabel={t('common.cancel')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={submit}
            isLoading={mutation.isPending}
            disabled={isLoading}
            data-testid="region-assign-submit"
          >
            {t('region.assign.submit')}
          </Button>
        </>
      }
    >
      <div className={styles.assignBody}>
        {isLoading ? (
          <div className={styles.loading}>
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <p className={styles.empty}>{t('region.assign.empty')}</p>
        ) : (
          <>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={t('region.assign.search')}
            />

            <div className={styles.filterToggles} role="group" aria-label={t('region.assign.filters')}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={unassignedOnly}
                  onChange={(event) => setUnassignedOnly(event.target.checked)}
                  data-testid="region-assign-unassigned"
                />
                <span>{t('region.assign.unassignedOnly')}</span>
              </label>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={activeOnly}
                  onChange={(event) => setActiveOnly(event.target.checked)}
                  data-testid="region-assign-active"
                />
                <span>{t('region.assign.activeOnly')}</span>
              </label>
            </div>

            <div className={styles.assignHead}>
              <span className={styles.assignCount}>
                {t('region.assign.selected', { count: selectedIds.length })}
              </span>
              <span className={styles.assignCount}>
                {t('region.assign.showing', { count: filtered.length, total: list.length })}
              </span>
            </div>

            {selectedAdmins.length > 0 && (
              <div className={styles.chips}>
                {selectedAdmins.map((admin) => (
                  <span key={admin.id} className={styles.chip}>
                    {admin.name}
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => toggle(admin.id)}
                      aria-label={t('region.assign.remove', { name: admin.name })}
                    >
                      <XIcon />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <p className={styles.empty}>{t('region.assign.noMatch')}</p>
            ) : (
              <ul className={styles.list} data-testid="region-assign-list">
                {filtered.map((admin) => {
                  const checked = selectedIds.includes(admin.id);
                  const isUnassigned = !assignedIds?.has(admin.id);
                  return (
                    <li key={admin.id}>
                      <label className={styles.row}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={checked}
                          onChange={() => toggle(admin.id)}
                          data-testid={`region-assign-option-${admin.id}`}
                        />
                        <span className={styles.rowName}>{admin.name}</span>
                        {!admin.isActive && (
                          <Badge variant="neutral" size="sm">
                            {t('region.assign.inactiveTag')}
                          </Badge>
                        )}
                        {isUnassigned && admin.isActive && (
                          <Badge variant="success" size="sm">
                            {t('region.assign.freeTag')}
                          </Badge>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {hasFilter && (
              <button
                type="button"
                className={styles.clearFilters}
                onClick={() => {
                  setQuery('');
                  setUnassignedOnly(false);
                  setActiveOnly(false);
                }}
              >
                {t('common.clearFilters')}
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
