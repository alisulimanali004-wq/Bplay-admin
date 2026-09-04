import { useTranslation } from 'react-i18next';
import {
  Button,
  EmptyState,
  ErrorState,
  InboxIcon,
  MessageCircleIcon,
  Pagination,
  PlusIcon,
  SearchInput,
  Select,
  Skeleton,
  clsx,
} from '@ui';
import { ORPHAN_REGION } from '../api/chat.filter';
import { CONVERSATION_CATEGORIES } from '../api/chat.types';
import { useAdminScope } from '../hooks/useAdminScope';
import { useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import { ConversationRow } from './ConversationRow';
import { ScopeBanner } from './ScopeBanner';
import type {
  ChatStats,
  Conversation,
  ConversationListParams,
  ConversationListResult,
} from '../api/chat.types';
import styles from './conversationRail.module.css';

interface Props {
  params: ConversationListParams;
  onParamsChange: (next: Partial<ConversationListParams>) => void;
  onPageChange: (page: number) => void;
  data?: ConversationListResult;
  stats?: ChatStats;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  activeId?: string;
  onSelect: (conversation: Conversation) => void;
  typingIn: ReadonlySet<string>;
  onStartConversation: () => void;
}

const SKELETON_ROWS = 6;

/**
 * FR-ADM-CHAT-001 — the conversation rail: search, the unread filter, the
 * channel filter, and the list itself, newest activity first.
 *
 * The SRS asks for a search over owner name and an unread filter; the category
 * and region controls are the two CH6/CH4 dimensions the list actually mixes, so
 * they earn their place. Nothing else is offered — CH5 rules out queues, SLAs
 * and triage, and a filter bar is where those creep in first.
 */
export function ConversationRail({
  params,
  onParamsChange,
  onPageChange,
  data,
  stats,
  isLoading,
  isError,
  onRetry,
  activeId,
  onSelect,
  typingIn,
  onStartConversation,
}: Props) {
  const { t } = useTranslation();
  const { isSuperAdmin, assignedRegionIds } = useAdminScope();
  const regionsQuery = useScopeRegionsQuery();

  const items = data?.items ?? [];
  const unreadOnly = params.readState === 'unread';

  // Only offer the regions this admin can actually see; a single-region admin
  // gets no filter at all, because it could only ever have one value.
  const scopedRegions = (regionsQuery.data ?? []).filter(
    (region) =>
      !assignedRegionIds || assignedRegionIds.length === 0 || assignedRegionIds.includes(region.id),
  );
  const showRegionFilter = isSuperAdmin || scopedRegions.length > 1;

  const regionOptions = [
    { value: 'all', label: t('chat.filters.allRegions') },
    ...scopedRegions.map((region) => ({ value: region.id, label: region.name })),
    // Only a super-admin can see a thread no live region covers, so only a
    // super-admin is offered the bucket that isolates them.
    ...(isSuperAdmin ? [{ value: ORPHAN_REGION, label: t('common.outsideRegions') }] : []),
  ];

  const categoryOptions = [
    { value: 'all', label: t('chat.filters.allChannels') },
    ...CONVERSATION_CATEGORIES.map((category) => ({
      value: category,
      label: t(`chat.category.${category}`),
    })),
  ];

  const hasFilters =
    (params.q ?? '') !== '' ||
    (params.category ?? 'all') !== 'all' ||
    (params.regionId ?? 'all') !== 'all' ||
    unreadOnly;

  return (
    <aside className={styles.rail} aria-label={t('chat.rail.label')}>
      <header className={styles.head}>
        <div className={styles.headTop}>
          <h2 className={styles.title}>
            <MessageCircleIcon />
            {t('chat.rail.title')}
          </h2>
          <Button
            size="sm"
            leftIcon={<PlusIcon />}
            onClick={onStartConversation}
            data-testid="chat-new-conversation"
          >
            {t('chat.actions.new')}
          </Button>
        </div>

        <ScopeBanner />

        <SearchInput
          value={params.q ?? ''}
          onChange={(q) => onParamsChange({ q })}
          placeholder={t('chat.filters.searchPlaceholder')}
          testId="chat-search"
        />

        <div className={styles.filters}>
          <Select
            className={styles.filter}
            value={params.category ?? 'all'}
            onChange={(value) =>
              onParamsChange({ category: value as ConversationListParams['category'] })
            }
            options={categoryOptions}
            aria-label={t('chat.filters.channel')}
          />
          {showRegionFilter && (
            <Select
              className={styles.filter}
              value={params.regionId ?? 'all'}
              onChange={(regionId) => onParamsChange({ regionId })}
              options={regionOptions}
              aria-label={t('chat.filters.region')}
            />
          )}
        </div>

        {/* The unread filter is a toggle, not a third dropdown: it is the one
            control FR-ADM-CHAT-001 names, and it is binary. */}
        <div className={styles.quickRow}>
          <button
            type="button"
            className={clsx(styles.chip, unreadOnly && styles.chipActive)}
            aria-pressed={unreadOnly}
            onClick={() => onParamsChange({ readState: unreadOnly ? 'all' : 'unread' })}
            data-testid="chat-filter-unread"
          >
            {t('chat.filters.unreadOnly')}
            {stats && stats.unread > 0 && <span className={styles.chipCount}>{stats.unread}</span>}
          </button>

          {stats && stats.awaitingAdmin > 0 && !unreadOnly && (
            <span className={styles.awaiting} title={t('chat.stats.awaitingAdminHint')}>
              {t('chat.stats.awaitingAdmin', { count: stats.awaitingAdmin })}
            </span>
          )}

          {hasFilters && (
            <button
              type="button"
              className={styles.clear}
              onClick={() =>
                onParamsChange({ q: '', category: 'all', regionId: 'all', readState: 'all' })
              }
              data-testid="chat-clear-filters"
            >
              {t('common.clearFilters')}
            </button>
          )}
        </div>
      </header>

      <div className={styles.list} data-testid="chat-rail-list">
        {isLoading && (
          <div className={styles.skeletons} aria-hidden>
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <div key={index} className={styles.skeletonRow}>
                <Skeleton width="40px" height="40px" radius="var(--radius-full)" />
                <div className={styles.skeletonText}>
                  <Skeleton width="55%" />
                  <Skeleton width="85%" height="var(--space-3)" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <ErrorState
            title={t('common.loadError')}
            retryLabel={t('common.retry')}
            onRetry={onRetry}
          />
        )}

        {!isLoading && !isError && items.length === 0 && (
          <EmptyState
            icon={<InboxIcon />}
            title={hasFilters ? t('chat.empty.noMatches') : t('chat.empty.noConversations')}
            description={
              hasFilters ? t('chat.empty.noMatchesHint') : t('chat.empty.noConversationsHint')
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onParamsChange({ q: '', category: 'all', regionId: 'all', readState: 'all' })
                  }
                >
                  {t('common.clearFilters')}
                </Button>
              ) : (
                <Button size="sm" leftIcon={<PlusIcon />} onClick={onStartConversation}>
                  {t('chat.actions.new')}
                </Button>
              )
            }
          />
        )}

        {!isLoading &&
          !isError &&
          items.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeId}
              isTyping={typingIn.has(conversation.id)}
              onSelect={onSelect}
              showRegion={showRegionFilter}
            />
          ))}
      </div>

      {!isLoading && !isError && (data?.pageCount ?? 1) > 1 && (
        <footer className={styles.foot}>
          <Pagination
            page={data?.page ?? 1}
            pageCount={data?.pageCount ?? 1}
            onPageChange={onPageChange}
          />
        </footer>
      )}
    </aside>
  );
}
