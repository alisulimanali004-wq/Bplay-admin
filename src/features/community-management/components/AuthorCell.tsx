import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge } from '@ui';
import { PATHS } from '@app/router/paths';
import { useAuthRole } from '@shared/stores/authStore';
import { ACTOR_TYPE_VARIANT, type CommunityActor } from '../api/community.types';
import styles from './AuthorCell.module.css';

/** The route to an actor's profile — player → player-management, facility → facility-management. */
export function actorProfilePath(actor: CommunityActor): string {
  return actor.type === 'facility'
    ? `${PATHS.facilityManagement}/${actor.facilityId ?? actor.id}`
    : `${PATHS.playerManagement}/${actor.id}`;
}

interface Props {
  actor: CommunityActor;
  /** A muted secondary line under the name (e.g. a relative timestamp). */
  subtitle?: string;
  /** When true, the cell is a button that opens the actor's profile (stops row clicks). */
  clickable?: boolean;
}

/** Avatar + name + actor-type pill; optionally deep-links to the actor's profile. */
export function AuthorCell({ actor, subtitle, clickable = true }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthRole();
  // The player/owner profiles this links into are super_admin-only; for other
  // roles the cell stays static so the link never dead-ends on a redirect.
  const canOpen = clickable && role === 'super_admin';

  const inner = (
    <>
      <Avatar src={actor.logoUrl} name={actor.name} size="sm" />
      <span className={styles.text}>
        <span className={styles.nameRow}>
          <span className={styles.name}>{actor.name}</span>
          <Badge variant={ACTOR_TYPE_VARIANT[actor.type]} size="sm">
            {t(`community.actorType.${actor.type}`)}
          </Badge>
        </span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
    </>
  );

  if (canOpen) {
    return (
      <button
        type="button"
        className={styles.cellButton}
        onClick={(event) => {
          event.stopPropagation();
          navigate(actorProfilePath(actor));
        }}
        title={t('community.actions.viewProfile')}
      >
        {inner}
      </button>
    );
  }

  return <span className={styles.cell}>{inner}</span>;
}
