import { useTranslation } from 'react-i18next';
import { clsx, Card, Badge, HeartIcon, MessageCircleIcon, ShareIcon } from '@ui';
import { hasMedia, type Post } from '../api/community.types';
import { AuthorCell } from './AuthorCell';
import { PostMediaThumb } from './PostMediaThumb';
import { PostStatusBadge } from './PostStatusBadge';
import styles from './postCard.module.css';

interface Props {
  post: Post;
  onOpen: (post: Post) => void;
}

/**
 * A visual post tile for the grid view — a single clickable surface (mouse +
 * keyboard) that opens the post detail, where full moderation lives. The author
 * is shown statically here to keep the tile one accessible click target.
 */
export function PostCard({ post, onOpen }: Props) {
  const { t, i18n } = useTranslation();
  const removed = post.moderationStatus === 'removed';
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const created = new Date(post.createdAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card
      className={clsx(styles.card, removed && styles.removed)}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(post);
        }
      }}
      data-testid={`post-card-${post.id}`}
    >
      {hasMedia(post) && <PostMediaThumb post={post} size="lg" />}

      <div className={styles.head}>
        <AuthorCell actor={post.author} subtitle={created} clickable={false} />
        <div className={styles.badges}>
          <Badge variant={post.visibility === 'public' ? 'info' : 'neutral'} size="sm">
            {t(`community.visibility.${post.visibility}`)}
          </Badge>
          {removed && <PostStatusBadge status={post.moderationStatus} />}
        </div>
      </div>

      {post.body && <p className={styles.body}>{post.body}</p>}

      <div className={styles.metrics}>
        <span className={styles.metric}>
          <HeartIcon /> {post.totalReactions}
        </span>
        <span className={styles.metric}>
          <MessageCircleIcon /> {post.totalComments}
        </span>
        <span className={styles.metric}>
          <ShareIcon /> {post.totalShares}
        </span>
      </div>
    </Card>
  );
}
