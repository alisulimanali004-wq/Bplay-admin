import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, CheckIcon, clsx, RegionTag } from '@ui';
import { PATHS } from '@app/router/paths';
import { useAuthRole } from '@shared/stores/authStore';
import { PhotoStrip } from './PhotoStrip';
import { AgeBadge } from './AgeBadge';
import { DocumentChip } from './DocumentChip';
import { facilityDocsAllApproved, type FacilityListItem } from '../api/facility.types';
import styles from './FacilityReviewCard.module.css';

/**
 * Container variants for the queue grid — spread the cards' fade-up with a
 * 40ms stagger: `<motion.div variants={queueGridVariants} initial="hidden"
 * animate="visible">…cards…</motion.div>`.
 */
export const queueGridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export interface FacilityReviewCardProps {
  item: FacilityListItem;
  onView: (item: FacilityListItem) => void;
  onApprove: (item: FacilityListItem) => void;
  onReject: (item: FacilityListItem) => void;
  /** When true, a selection checkbox is shown for bulk review. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (item: FacilityListItem) => void;
}

/**
 * One pending submission on the review desk. Purely presentational — the page
 * owns the confirm/reason dialogs and mutations behind the callbacks. Rendered as
 * a motion item so a `queueGridVariants` parent staggers it in; an optional
 * checkbox drives bulk selection.
 */
export function FacilityReviewCard({
  item,
  onView,
  onApprove,
  onReject,
  selectable = false,
  selected = false,
  onToggleSelect,
}: FacilityReviewCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  // Owner profiles live on a super_admin-only route.
  const canViewOwner = useAuthRole() === 'super_admin';
  const approveBlocked = !facilityDocsAllApproved(item.documents);

  const cardVariants: Variants = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  return (
    <motion.article
      className={clsx(styles.card, selected && styles.selected)}
      variants={cardVariants}
      data-testid={`facility-card-${item.id}`}
    >
      {selectable && (
        <label className={styles.select}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(item)}
            aria-label={t('facility.bulk.selectOne', { name: item.name })}
            data-testid={`facility-select-${item.id}`}
          />
        </label>
      )}
      <PhotoStrip images={item.images} kind={item.kind} name={item.name} />

      <div className={styles.body}>
        <div className={styles.identity}>
          <h3 className={styles.name}>{item.name}</h3>
          {canViewOwner ? (
            <button
              type="button"
              className={styles.ownerLink}
              onClick={() => navigate(`${PATHS.ownerManagement}/${item.ownerId}`)}
              title={t('facility.profile.viewOwner')}
              data-testid={`facility-card-owner-${item.id}`}
            >
              <Avatar src={item.ownerPhotoUrl} name={item.ownerName} size="sm" />
              <span className={styles.ownerName}>{item.ownerName}</span>
            </button>
          ) : (
            <div className={styles.owner}>
              <Avatar src={item.ownerPhotoUrl} name={item.ownerName} size="sm" />
              <span className={styles.ownerName}>{item.ownerName}</span>
            </div>
          )}
        </div>

        <div className={styles.meta}>
          <RegionTag regionNames={item.regionNames} isOrphan={item.isOrphan} compact />
          <AgeBadge createdAt={item.createdAt} />
        </div>

        {item.documents.length > 0 && (
          <div className={styles.docs}>
            <span className={styles.docsLabel}>{t('facility.queue.docs')}</span>
            <div className={styles.docsRow}>
              {item.documents.map((document) => (
                <DocumentChip key={document.id} document={document} />
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onView(item)}
          data-testid={`facility-view-${item.id}`}
        >
          {t('facility.queue.viewProfile')}
        </Button>
        <div className={styles.footerEnd}>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onReject(item)}
            data-testid={`facility-reject-${item.id}`}
          >
            {t('facility.actions.reject')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<CheckIcon />}
            disabled={approveBlocked}
            title={approveBlocked ? t('facility.approveBlocked') : undefined}
            onClick={() => onApprove(item)}
            data-testid={`facility-approve-${item.id}`}
          >
            {t('facility.actions.approve')}
          </Button>
        </div>
      </footer>
    </motion.article>
  );
}
