import type { ReactNode } from 'react';
import { Card } from '../Card/Card';
import { Avatar } from '../Avatar/Avatar';
import styles from './DetailHero.module.css';

export interface DetailHeroProps {
  name: string;
  email?: string;
  photoUrl?: string;
  /** When provided, the avatar becomes a button that opens a photo viewer. */
  onPhotoClick?: () => void;
  /** Accessible name for the photo button (required when onPhotoClick is set). */
  photoLabel?: string;
  /** The status/role badge row shown under the name. */
  badges?: ReactNode;
  /** The contact meta row — compose from <MetaItem/>. */
  meta?: ReactNode;
  testId?: string;
}

/**
 * The canonical "person/entity" identity hero: a large avatar (optionally a
 * photo-viewer trigger), name + email, a badge row, and a divider-separated
 * contact-meta strip. Shared by every detail page (admin, owner, …) so they
 * read as one design — never fork this markup into a feature.
 */
export function DetailHero({
  name,
  email,
  photoUrl,
  onPhotoClick,
  photoLabel,
  badges,
  meta,
  testId,
}: DetailHeroProps) {
  return (
    <Card className={styles.hero} data-testid={testId}>
      <div className={styles.identity}>
        {onPhotoClick ? (
          <button
            type="button"
            className={styles.avatarButton}
            onClick={onPhotoClick}
            aria-label={photoLabel}
          >
            <Avatar src={photoUrl} name={name} size="xl" />
          </button>
        ) : (
          <Avatar src={photoUrl} name={name} size="xl" />
        )}
        <div className={styles.identityText}>
          <p className={styles.name}>{name}</p>
          {email && (
            <span className={styles.email} dir="ltr">
              {email}
            </span>
          )}
          {badges && <div className={styles.badges}>{badges}</div>}
        </div>
      </div>

      {meta && <div className={styles.rows}>{meta}</div>}
    </Card>
  );
}

export interface MetaItemProps {
  icon: ReactNode;
  label: string;
  value: string;
  /** Force LTR on the value (phone numbers, ids, coordinates). */
  ltr?: boolean;
}

/** One contact-meta item: an icon chip + a stacked label / value. */
export function MetaItem({ icon, label, value, ltr }: MetaItemProps) {
  return (
    <span className={styles.row}>
      <span className={styles.rowIcon} aria-hidden>
        {icon}
      </span>
      <span className={styles.rowText}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value} dir={ltr ? 'ltr' : undefined}>
          {value}
        </span>
      </span>
    </span>
  );
}
