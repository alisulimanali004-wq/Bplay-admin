import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Badge,
  Spinner,
  ErrorState,
  EmptyState,
  HeartIcon,
  MessageCircleIcon,
  ImageIcon,
  InboxIcon,
  Thumb,
} from '@ui';
import { PATHS } from '@app/router/paths';
import type { Post } from '@features/community-management/api';
import { usePlayerPosts } from '../hooks/usePlayerPosts';
import styles from './PlayerPostsCard.module.css';

interface Props {
  playerId: string;
}

/** The player's community posts — a compact, read-only list; each row opens the full post. */
export function PlayerPostsCard({ playerId }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: posts, isLoading, isError, refetch } = usePlayerPosts(playerId);
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const list = posts ?? [];

  return (
    <Card padding="lg" className={styles.card} data-testid="player-posts">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('community.authorPanel.title')}</h2>
        {posts && <span className={styles.count}>{list.length}</span>}
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState icon={<InboxIcon />} title={t('community.authorPanel.empty')} />
      ) : (
        <div className={styles.list}>
          {list.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              locale={locale}
              onOpen={() => navigate(`${PATHS.communityManagement}/${post.id}`)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function PostRow({ post, locale, onOpen }: { post: Post; locale: string; onOpen: () => void }) {
  const { t } = useTranslation();
  const image = post.images[0] ?? (post.mediaType === 'image' ? post.mediaUrl : undefined);
  const created = new Date(post.createdAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <button
      type="button"
      className={styles.row}
      onClick={onOpen}
      data-testid={`player-post-${post.id}`}
    >
      <Thumb
        src={image}
        className={styles.thumb}
        fallbackClassName={styles.thumbFallback}
        fallback={<ImageIcon />}
      />
      <span className={styles.main}>
        <span className={styles.body}>{post.body || t('community.noBody')}</span>
        <span className={styles.meta}>
          <span>{created}</span>
          <span className={styles.metric}>
            <HeartIcon /> {post.totalReactions}
          </span>
          <span className={styles.metric}>
            <MessageCircleIcon /> {post.totalComments}
          </span>
        </span>
      </span>
      {post.moderationStatus === 'removed' && (
        <Badge variant="danger" size="sm">
          {t('community.status.removed')}
        </Badge>
      )}
    </button>
  );
}
