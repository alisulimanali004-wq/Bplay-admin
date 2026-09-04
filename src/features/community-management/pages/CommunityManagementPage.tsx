import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PageContainer,
  PageHeader,
  Toolbar,
  SearchInput,
  Select,
  FilterField,
  DateRange,
  DataTable,
  Pagination,
  Spinner,
  EmptyState,
  ErrorState,
  ClearFiltersBar,
  InboxIcon,
  HeartIcon,
  MessageCircleIcon,
  SearchIcon,
  PowerIcon,
  UserIcon,
  EyeIcon,
  CalendarIcon,
  EMPTY_DATE_RANGE,
  isDateRangeActive,
  type Column,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { usePostsQuery } from '../hooks/usePostsQuery';
import { usePostStats } from '../hooks/usePostStats';
import { CommunityStatCards } from '../components/CommunityStatCards';
import { ViewToggle, type ViewMode } from '../components/ViewToggle';
import { PostCard } from '../components/PostCard';
import { PostRowActions } from '../components/PostRowActions';
import { PostMediaThumb } from '../components/PostMediaThumb';
import { PostStatusBadge } from '../components/PostStatusBadge';
import { AuthorCell } from '../components/AuthorCell';
import { hasMedia, type Post, type PostListParams } from '../api/community.types';
import styles from './CommunityManagementPage.module.css';

const INITIAL: PostListParams = {
  q: '',
  authorType: 'all',
  status: 'all',
  hasMedia: 'all',
  visibility: 'all',
  dateRange: EMPTY_DATE_RANGE,
  page: 1,
};

export default function CommunityManagementPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useState<PostListParams>(INITIAL);
  const [view, setView] = useState<ViewMode>('grid');
  const { data, isLoading, isError, refetch } = usePostsQuery(params);
  const { data: stats } = usePostStats();

  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const posts = data?.items ?? [];
  const openDetail = (post: Post) => navigate(`${PATHS.communityManagement}/${post.id}`);
  const patch = (next: Partial<PostListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: 1 }));

  const hasActiveFilters =
    (params.q ?? '') !== '' ||
    (params.authorType ?? 'all') !== 'all' ||
    (params.status ?? 'all') !== 'all' ||
    (params.hasMedia ?? 'all') !== 'all' ||
    (params.visibility ?? 'all') !== 'all' ||
    isDateRangeActive(params.dateRange ?? EMPTY_DATE_RANGE);

  const columns: Column<Post>[] = [
    {
      key: 'post',
      header: t('community.col.post'),
      render: (post) => (
        <button
          type="button"
          className={styles.postCell}
          onClick={() => openDetail(post)}
          data-testid={`post-open-${post.id}`}
        >
          {hasMedia(post) && <PostMediaThumb post={post} size="sm" />}
          <span className={styles.postText}>
            <span className={styles.postBody}>{post.body || t('community.noBody')}</span>
          </span>
        </button>
      ),
    },
    {
      key: 'author',
      header: t('community.col.author'),
      render: (post) => <AuthorCell actor={post.author} />,
    },
    {
      key: 'reactions',
      header: t('community.col.reactions'),
      align: 'center',
      render: (post) => (
        <span className={styles.metricCell}>
          <HeartIcon /> {post.totalReactions}
        </span>
      ),
    },
    {
      key: 'comments',
      header: t('community.col.comments'),
      align: 'center',
      render: (post) => (
        <span className={styles.metricCell}>
          <MessageCircleIcon /> {post.totalComments}
        </span>
      ),
    },
    {
      key: 'created',
      header: t('community.col.created'),
      render: (post) =>
        new Date(post.createdAt).toLocaleDateString(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      key: 'status',
      header: t('community.col.status'),
      render: (post) => <PostStatusBadge status={post.moderationStatus} />,
    },
  ];

  return (
    <PageContainer>
      <PageHeader title={t('community.title')} subtitle={t('community.subtitle')} />

      <CommunityStatCards stats={stats} />

      <Toolbar
        end={
          hasActiveFilters ? (
            <ClearFiltersBar
              count={data?.total ?? 0}
              onClear={() => setParams(INITIAL)}
              testId="community-clear-filters"
            />
          ) : null
        }
      >
        <FilterField label={t('common.search')} icon={<SearchIcon />}>
          <SearchInput
            value={params.q ?? ''}
            onChange={(q) => patch({ q })}
            placeholder={t('community.search')}
          />
        </FilterField>
        <FilterField label={t('community.col.author')} icon={<UserIcon />}>
          <Select
            aria-label={t('community.col.author')}
            value={params.authorType ?? 'all'}
            onChange={(value) => patch({ authorType: value as PostListParams['authorType'] })}
            options={[
              { value: 'all', label: t('community.filter.allAuthorTypes') },
              { value: 'player', label: t('community.actorType.player') },
              { value: 'facility', label: t('community.actorType.facility') },
            ]}
          />
        </FilterField>
        <FilterField label={t('community.col.status')} icon={<PowerIcon />}>
          <Select
            aria-label={t('community.col.status')}
            value={params.status ?? 'all'}
            onChange={(value) => patch({ status: value as PostListParams['status'] })}
            options={[
              { value: 'all', label: t('community.filter.allStatus') },
              { value: 'published', label: t('community.status.published') },
              { value: 'removed', label: t('community.status.removed') },
            ]}
          />
        </FilterField>
        <FilterField label={t('community.col.media')} icon={<MessageCircleIcon />}>
          <Select
            aria-label={t('community.col.media')}
            value={params.hasMedia ?? 'all'}
            onChange={(value) => patch({ hasMedia: value as PostListParams['hasMedia'] })}
            options={[
              { value: 'all', label: t('community.filter.allMedia') },
              { value: 'yes', label: t('community.filter.hasMedia') },
              { value: 'no', label: t('community.filter.noMedia') },
            ]}
          />
        </FilterField>
        <FilterField label={t('community.col.visibility')} icon={<EyeIcon />}>
          <Select
            aria-label={t('community.col.visibility')}
            value={params.visibility ?? 'all'}
            onChange={(value) => patch({ visibility: value as PostListParams['visibility'] })}
            options={[
              { value: 'all', label: t('community.filter.allVisibility') },
              { value: 'public', label: t('community.visibility.public') },
              { value: 'private', label: t('community.visibility.private') },
            ]}
          />
        </FilterField>
        <FilterField label={t('community.filter.date')} icon={<CalendarIcon />}>
          <DateRange
            value={params.dateRange ?? EMPTY_DATE_RANGE}
            onChange={(dateRange) => patch({ dateRange })}
            ariaLabel={t('community.filter.date')}
            allLabel={t('community.filter.dateAll')}
            last7Label={t('community.filter.date7d')}
            last30Label={t('community.filter.date30d')}
            last90Label={t('community.filter.date90d')}
            customLabel={t('community.filter.dateCustom')}
            fromLabel={t('community.filter.dateFrom')}
            toLabel={t('community.filter.dateTo')}
            testId="community-date-range"
          />
        </FilterField>
        <ViewToggle value={view} onChange={setView} />
      </Toolbar>

      {view === 'grid' ? (
        isLoading ? (
          <div className={styles.center}>
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <ErrorState
            message={t('common.loadError')}
            retryLabel={t('common.retry')}
            onRetry={() => void refetch()}
          />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<InboxIcon />}
            title={t('community.empty.title')}
            description={t('community.empty.desc')}
          />
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onOpen={openDetail} />
            ))}
          </div>
        )
      ) : (
        <DataTable<Post>
          columns={columns}
          data={posts}
          isLoading={isLoading}
          error={isError ? t('common.loadError') : undefined}
          onRetry={() => void refetch()}
          getRowId={(post) => post.id}
          actionsLabel={t('community.col.actions')}
          emptyState={
            <EmptyState
              icon={<InboxIcon />}
              title={t('community.empty.title')}
              description={t('community.empty.desc')}
            />
          }
          rowActions={(post) => <PostRowActions post={post} onView={openDetail} />}
        />
      )}

      <Pagination
        page={data?.page ?? 1}
        pageCount={data?.pageCount ?? 1}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
      />
    </PageContainer>
  );
}
