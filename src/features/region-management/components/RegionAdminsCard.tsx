import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Avatar, Badge, Button, Spinner, UserPlusIcon, clsx } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { PATHS } from '@app/router/paths';
import { useAdminsForAssign } from '../hooks/useAdminsForAssign';
import type { Region } from '../api/region.types';
import styles from './RegionAdminsCard.module.css';

interface Props {
  region: Region;
  /** Open the shared assign-admins modal (owned by the page). */
  onManage: () => void;
}

/**
 * The managing-admins card: resolves each of the region's assigned admin ids to
 * a full admin record (name, email, active flag) and renders it as an avatar
 * row with a status badge. The "Manage admins" button opens the same assign
 * modal the header uses (owned by the page).
 */
export function RegionAdminsCard({ region, onManage }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: admins, isLoading } = useAdminsForAssign();

  const assigned = (admins ?? []).filter((admin) => region.assignedAdminIds.includes(admin.id));
  // Fall back to the region's stored names for any id we couldn't resolve.
  const unresolved = region.assignedAdminIds.filter(
    (id) => !assigned.some((admin) => admin.id === id),
  );

  return (
    <Card className={styles.card} data-testid="region-detail-admins">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('region.detail.sections.admins')}</h2>
        <Button variant="secondary" size="sm" leftIcon={<UserPlusIcon />} onClick={onManage}>
          {t('region.detail.admins.manage')}
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner />
        </div>
      ) : assigned.length === 0 && unresolved.length === 0 ? (
        <p className={styles.empty}>{t('region.detail.admins.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {assigned.map((admin) => (
            <li key={admin.id}>
              <button
                type="button"
                className={clsx(styles.row, styles.rowInteractive)}
                onClick={() => navigate(`${PATHS.adminManagement}/${admin.id}`)}
                aria-label={t('region.detail.admins.view', { name: admin.name })}
                data-testid={`region-admin-${admin.id}`}
              >
                <Avatar src={admin.photoUrl} name={admin.name} size="md" />
                <div className={styles.meta}>
                  <span className={styles.name}>{admin.name}</span>
                  <span className={styles.email}>{admin.email}</span>
                </div>
                <Badge variant={statusToBadgeVariant(admin.isActive ? 'active' : 'inactive')}>
                  {t(admin.isActive ? 'status.active' : 'status.inactive')}
                </Badge>
              </button>
            </li>
          ))}
          {unresolved.map((id, index) => (
            <li className={styles.row} key={id}>
              <Avatar name={region.assignedAdminNames[region.assignedAdminIds.indexOf(id)] ?? '?'} size="md" />
              <div className={styles.meta}>
                <span className={styles.name}>
                  {region.assignedAdminNames[region.assignedAdminIds.indexOf(id)] ?? `#${index + 1}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
