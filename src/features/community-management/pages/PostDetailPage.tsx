import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader, Spinner, EmptyState, ErrorState, InboxIcon } from '@ui';
import { PATHS } from '@app/router/paths';
import { usePostQuery } from '../hooks/usePostQuery';
import { PostStatusActions } from '../components/PostStatusActions';
import { PostHeroCard } from '../components/PostHeroCard';
import { CommentsCard } from '../components/CommentsCard';
import type { ModerationAction, Post } from '../api/community.types';
import styles from './PostDetailPage.module.css';

const NOT_FOUND_MESSAGE = 'Post not found';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: post, isLoading, isError, error, refetch } = usePostQuery(postId);

  const notFound =
    (isError && error instanceof Error && error.message === NOT_FOUND_MESSAGE) ||
    (!isLoading && !isError && !post);

  // A hard-delete removes the post entirely — leave the (now empty) detail page.
  const onModerated = (action: ModerationAction) => {
    if (action === 'delete') navigate(PATHS.communityManagement);
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('community.detail.title')}
        subtitle={t('community.detail.subtitle')}
        showBack
        backLabel={t('common.back')}
        actions={post ? <PostStatusActions post={post} onModerated={onModerated} /> : undefined}
      />

      {isLoading ? (
        <div className={styles.center}>
          <Spinner size="lg" />
        </div>
      ) : notFound ? (
        <EmptyState icon={<InboxIcon />} title={t('community.detail.notFound')} />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : post ? (
        <PostDetailContent post={post} />
      ) : null}
    </PageContainer>
  );
}

function PostDetailContent({ post }: { post: Post }) {
  return (
    <div className={styles.page}>
      <PostHeroCard post={post} />
      <CommentsCard postId={post.id} />
    </div>
  );
}
