import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  clsx,
  Card,
  Badge,
  Avatar,
  IconButton,
  Spinner,
  ErrorState,
  EmptyState,
  MessageCircleIcon,
  InboxIcon,
} from '@ui';
import { useAuthRole } from '@shared/stores/authStore';
import { ACTOR_TYPE_VARIANT, type Comment, type ModerationAction } from '../api/community.types';
import { availableModerationActions, MODERATION_ROW_VARIANT } from './moderation';
import { MODERATION_ICON } from './moderationIcons';
import { CommentActionConfirm } from './CommentActionConfirm';
import { actorProfilePath } from './AuthorCell';
import { usePostComments } from '../hooks/usePostRelated';
import styles from './communityCards.module.css';

interface Props {
  postId: string;
}

/** The post's comments, each with author, body, timestamp and moderation actions. Self-fetches by postId. */
export function CommentsCard({ postId }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  // The player/owner profiles this links into are super_admin-only.
  const canOpenProfiles = useAuthRole() === 'super_admin';
  const { data, isLoading, isError, refetch } = usePostComments(postId);
  const [pending, setPending] = useState<{ comment: Comment; action: ModerationAction } | null>(null);
  const comments = data ?? [];
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const dateFmt = (value: string) =>
    new Date(value).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Card padding="lg" className={styles.card} data-testid="post-comments">
      <div className={styles.head}>
        <h2 className={styles.title}>
          <MessageCircleIcon /> {t('community.comments.title')}
        </h2>
        <span className={styles.count}>{comments.length}</span>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : comments.length === 0 ? (
        <EmptyState icon={<InboxIcon />} title={t('community.comments.empty')} />
      ) : (
        <div className={styles.list}>
          {comments.map((comment) => {
            const removed = comment.moderationStatus === 'removed';
            const actions = availableModerationActions(comment.moderationStatus);
            return (
              <div
                key={comment.id}
                className={clsx(styles.commentRow, removed && styles.commentRemoved)}
              >
                <Avatar src={comment.author.logoUrl} name={comment.author.name} size="sm" />
                <div className={styles.commentMain}>
                  <div className={styles.commentHead}>
                    {canOpenProfiles ? (
                      <button
                        type="button"
                        className={styles.authorLink}
                        onClick={() => navigate(actorProfilePath(comment.author))}
                      >
                        {comment.author.name}
                      </button>
                    ) : (
                      <span className={styles.authorName}>{comment.author.name}</span>
                    )}
                    <Badge variant={ACTOR_TYPE_VARIANT[comment.author.type]} size="sm">
                      {t(`community.actorType.${comment.author.type}`)}
                    </Badge>
                    <span className={styles.time}>{dateFmt(comment.createdAt)}</span>
                    {removed && (
                      <Badge variant="danger" size="sm">
                        {t('community.status.removed')}
                      </Badge>
                    )}
                  </div>
                  <p className={styles.commentBody}>{comment.body}</p>
                  {removed && comment.removedReason && (
                    <span className={styles.removedNote}>
                      {t('community.moderation.removedReason')}: {comment.removedReason}
                    </span>
                  )}
                </div>
                <div className={styles.commentActions}>
                  {actions.map((action) => (
                    <IconButton
                      key={action}
                      size="sm"
                      variant={MODERATION_ROW_VARIANT[action]}
                      label={t(`community.actions.${action}`)}
                      icon={MODERATION_ICON[action]}
                      onClick={() => setPending({ comment, action })}
                      data-testid={`comment-${action}-${comment.id}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CommentActionConfirm
        postId={postId}
        comment={pending?.comment ?? null}
        action={pending?.action ?? null}
        onClose={() => setPending(null)}
      />
    </Card>
  );
}
