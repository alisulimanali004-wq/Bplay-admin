import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchInput, Badge, Spinner, XIcon } from '@ui';
import { useRegionsForAssign } from '../hooks/useRegionsForAssign';
import styles from './adminForm.module.css';

interface Props {
  value: string[];
  onChange: (regionIds: string[]) => void;
}

/**
 * A controlled multi-select of regions with search + the Regions-page filters
 * (active-only, without-admin-only) + removable chips. Shared by AdminFormModal
 * (embedded when scope is regional) and AssignRegionsModal (standalone). Mirrors
 * the region side's AssignAdminModal, inverted to pick regions for an admin.
 */
export function RegionPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { data: regions, isLoading } = useRegionsForAssign();
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [withoutAdminOnly, setWithoutAdminOnly] = useState(false);

  const list = regions ?? [];
  // Chips come from the FULL list so a filtered-out selection stays removable.
  const selected = list.filter((region) => value.includes(region.id));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((current) => current !== id) : [...value, id]);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.filter((region) => {
      if (needle && !region.name.toLowerCase().includes(needle)) return false;
      if (activeOnly && !region.isActive) return false;
      if (withoutAdminOnly && region.hasAdmin) return false;
      return true;
    });
  }, [list, query, activeOnly, withoutAdminOnly]);

  const hasFilter = query.trim().length > 0 || activeOnly || withoutAdminOnly;

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner />
      </div>
    );
  }
  if (list.length === 0) {
    return <p className={styles.empty}>{t('admin.assign.empty')}</p>;
  }

  return (
    <div className={styles.picker}>
      <SearchInput value={query} onChange={setQuery} placeholder={t('admin.assign.search')} />

      <div className={styles.filterToggles} role="group" aria-label={t('admin.assign.filters')}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={activeOnly}
            onChange={(event) => setActiveOnly(event.target.checked)}
            data-testid="admin-assign-active"
          />
          <span>{t('admin.assign.activeOnly')}</span>
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={withoutAdminOnly}
            onChange={(event) => setWithoutAdminOnly(event.target.checked)}
            data-testid="admin-assign-free"
          />
          <span>{t('admin.assign.withoutAdminOnly')}</span>
        </label>
      </div>

      <div className={styles.pickerHead}>
        <span className={styles.pickerCount}>
          {t('admin.assign.selected', { count: value.length })}
        </span>
        <span className={styles.pickerCount}>
          {t('admin.assign.showing', { count: filtered.length, total: list.length })}
        </span>
      </div>

      {selected.length > 0 && (
        <div className={styles.chips}>
          {selected.map((region) => (
            <span key={region.id} className={styles.chip}>
              {region.name}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => toggle(region.id)}
                aria-label={t('admin.assign.remove', { name: region.name })}
              >
                <XIcon />
              </button>
            </span>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className={styles.empty}>{t('admin.assign.noMatch')}</p>
      ) : (
        <ul className={styles.list} data-testid="admin-assign-list">
          {filtered.map((region) => {
            const checked = value.includes(region.id);
            return (
              <li key={region.id}>
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={checked}
                    onChange={() => toggle(region.id)}
                    data-testid={`admin-assign-option-${region.id}`}
                  />
                  <span className={styles.rowName}>{region.name}</span>
                  {!region.isActive && (
                    <Badge variant="neutral" size="sm">
                      {t('status.inactive')}
                    </Badge>
                  )}
                  {!region.hasAdmin && region.isActive && (
                    <Badge variant="success" size="sm">
                      {t('admin.assign.freeTag')}
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
            setActiveOnly(false);
            setWithoutAdminOnly(false);
          }}
        >
          {t('common.clearFilters')}
        </button>
      )}
    </div>
  );
}
