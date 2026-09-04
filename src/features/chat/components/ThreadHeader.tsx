import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowStartIcon,
  Avatar,
  ExternalLinkIcon,
  IconButton,
  RegionTag,
  StadiumIcon,
  clsx,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { useAdminScope } from '../hooks/useAdminScope';
import { CategoryBadge, StatusBadge } from './ChatBadges';
import type { Conversation } from '../api/chat.types';
import styles from './threadHeader.module.css';

interface Props {
  conversation: Conversation;
  /** True while the owner is typing — replaces the presence line. */
  isTyping: boolean;
  /** Rendered on the narrow layout, where the rail and thread swap places. */
  onBack: () => void;
}

/**
 * The open thread's header: who is on the other end, which channel this is, and
 * the way out to the records behind it.
 *
 * The deep links are what stop the chat becoming an island — an admin reading a
 * complaint about a facility must be one click from that facility. Owner
 * profiles are a super-admin route, so the link is offered only to the role that
 * can actually open it; a regional admin sees the name as plain text rather than
 * a link that would bounce off the guard.
 */
export function ThreadHeader({ conversation, isTyping, onBack }: Props) {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAdminScope();

  const ownerLink = `${PATHS.ownerManagement}/${conversation.owner.id}`;
  const facilityLink = conversation.facilityId
    ? `${PATHS.facilityManagement}/${conversation.facilityId}`
    : null;

  return (
    <header className={styles.header}>
      <IconButton
        className={styles.back}
        variant="ghost"
        label={t('chat.actions.backToList')}
        icon={<ArrowStartIcon className="flipInRtl" />}
        onClick={onBack}
        data-testid="chat-back"
      />

      <Avatar src={conversation.owner.photoUrl} name={conversation.owner.name} size="md" />

      <div className={styles.identity}>
        <div className={styles.nameRow}>
          {isSuperAdmin ? (
            <Link className={styles.name} to={ownerLink} dir="auto">
              {conversation.owner.name}
              <ExternalLinkIcon className={styles.nameIcon} />
            </Link>
          ) : (
            <span className={clsx(styles.name, styles.namePlain)} dir="auto">
              {conversation.owner.name}
            </span>
          )}
          <CategoryBadge category={conversation.category} />
          <StatusBadge status={conversation.status} />
        </div>

        <div className={styles.metaRow}>
          {isTyping ? (
            <span className={styles.typing}>{t('chat.thread.typing')}</span>
          ) : (
            <>
              {facilityLink ? (
                <Link className={styles.facility} to={facilityLink}>
                  <StadiumIcon />
                  <span dir="auto">{conversation.facilityName}</span>
                </Link>
              ) : (
                <span className={styles.team}>{t(conversation.team)}</span>
              )}
              {conversation.owner.email && (
                <span className={styles.email} dir="auto">
                  {conversation.owner.email}
                </span>
              )}
            </>
          )}
          <RegionTag
            regionNames={conversation.regionNames}
            isOrphan={conversation.isOrphan}
            compact
          />
        </div>
      </div>
    </header>
  );
}
