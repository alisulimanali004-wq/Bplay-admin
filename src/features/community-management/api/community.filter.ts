import { filterPaginate } from '@shared/lib/paginate';
import { resolveDateRange, isDateRangeActive } from '@ui';
import { hasMedia, type Post, type PostListParams, type PostListResult } from './community.types';

/**
 * Shared search + filters + pagination (used by both the real and mock sources):
 * an optional author scope (profile tabs), text search over body + author name,
 * author-type, moderation status, media presence, visibility, and a created-date
 * window (the @ui DateRange primitive).
 */
export function filterAndPaginatePosts(all: Post[], params: PostListParams): PostListResult {
  let items = all;

  if (params.authorId) {
    items = items.filter((post) => post.author.id === params.authorId);
  }

  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (post) =>
        (post.body ?? '').toLowerCase().includes(q) || post.author.name.toLowerCase().includes(q),
    );
  }

  if (params.authorType && params.authorType !== 'all') {
    items = items.filter((post) => post.author.type === params.authorType);
  }

  if (params.status && params.status !== 'all') {
    items = items.filter((post) => post.moderationStatus === params.status);
  }

  if (params.hasMedia && params.hasMedia !== 'all') {
    const want = params.hasMedia === 'yes';
    items = items.filter((post) => hasMedia(post) === want);
  }

  if (params.visibility && params.visibility !== 'all') {
    items = items.filter((post) => post.visibility === params.visibility);
  }

  if (params.dateRange && isDateRangeActive(params.dateRange)) {
    const { fromMs, toMs } = resolveDateRange(params.dateRange, Date.now());
    items = items.filter((post) => {
      const t = new Date(post.createdAt).getTime();
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
      return true;
    });
  }

  return filterPaginate(items, params);
}
