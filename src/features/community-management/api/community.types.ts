/**
 * Community Management — domain types.
 *
 * The super-admin / admin moderates the in-app community feed: players and
 * facilities publish posts (text + images/video); other users react and comment.
 * The model mirrors the Bplay mobile community contract 1:1 so going live is a
 * flag flip. Reactions are AGGREGATE COUNTS per type (like the app), not per-actor
 * rows; the "who reacted" list is fetched separately as CommunityActor rows.
 *
 * Two-tier moderation applies identically to a Post and a Comment:
 *   - moderationStatus: published | removed
 *   - "remove" (soft, reason-gated, reversible) sets status = removed + records
 *     removedReason/removedAt/removedBy; "restore" clears it; "delete" is permanent.
 */

import type { BadgeVariant, DateRangeValue } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { resolveUploadUrl } from '@shared/utils/url';

/** A post/comment author or a reactor — a player or a facility. */
export type CommunityActorType = 'player' | 'facility';

/** The five reaction kinds the app supports (matches ReactionType apiValues). */
export type ReactionType = 'like' | 'love' | 'celebrate' | 'support' | 'insightful';
export const REACTION_TYPES: ReactionType[] = ['like', 'love', 'celebrate', 'support', 'insightful'];

export interface CommunityActor {
  /**
   * The id used for author-scoped post queries: a player id for a player, the
   * OWNER id for a facility (so a facility's posts still surface under its owner's
   * "Posts" tab). The clickable profile link uses {@link facilityId} for facilities.
   */
  id: string;
  type: CommunityActorType;
  name: string;
  logoUrl?: string;
  /** For a 'facility' actor: the facility's own id — the author link deep-links here. */
  facilityId?: string;
}

/** A reactor row: an actor plus the reaction they left. */
export interface Reactor extends CommunityActor {
  reaction: ReactionType;
}

/** Aggregate reaction counts (one per type) — the app's InteractionEntity shape. */
export interface ReactionCounts {
  like: number;
  love: number;
  celebrate: number;
  support: number;
  insightful: number;
}

export function sumReactions(counts: ReactionCounts): number {
  return counts.like + counts.love + counts.celebrate + counts.support + counts.insightful;
}

// ---------------------------------------------------------------------------
// Moderation (shared shape — Post AND Comment)
// ---------------------------------------------------------------------------

export type ModerationStatus = 'published' | 'removed';
export type ModerationAction = 'remove' | 'restore' | 'delete';

export interface Moderatable {
  moderationStatus: ModerationStatus;
  removedReason?: string;
  removedAt?: string;
  /** Display name of the admin who removed it. */
  removedBy?: string;
}

const MOD_STATUS_KEY: Record<ModerationStatus, string> = {
  published: 'active',
  removed: 'rejected',
};
export function moderationBadgeVariant(status: ModerationStatus): BadgeVariant {
  return statusToBadgeVariant(MOD_STATUS_KEY[status]);
}

/** Facility = mint (brand), Player = blue (info) — the actor-type pill colours. */
export const ACTOR_TYPE_VARIANT: Record<CommunityActorType, BadgeVariant> = {
  facility: 'success',
  player: 'info',
};

/** Badge colour per reaction type (used on reactor rows). */
export const REACTION_VARIANT: Record<ReactionType, BadgeVariant> = {
  like: 'info',
  love: 'danger',
  celebrate: 'warning',
  support: 'success',
  insightful: 'caution',
};

// ---------------------------------------------------------------------------
// Post
// ---------------------------------------------------------------------------

export type PostVisibility = 'public' | 'private';
export type MediaType = 'image' | 'video';

export interface Post extends Moderatable {
  id: string;
  author: CommunityActor;
  body?: string;
  /** Attached images (mediaUrls). */
  images: string[];
  /** A single primary media url (an extra image or the post's video). */
  mediaUrl?: string;
  mediaType?: MediaType;
  visibility: PostVisibility;
  createdAt: string;
  interactions: ReactionCounts;
  /** Derived in toPost(): the sum of the five interaction counts. */
  totalReactions: number;
  totalComments: number;
  totalShares: number;
}

export interface Comment extends Moderatable {
  id: string;
  postId: string;
  author: CommunityActor;
  body: string;
  createdAt: string;
}

/** One media element, ready for the thumbnail grid / the ImageLightbox gallery. */
export interface PostMedia {
  kind: MediaType;
  src: string;
}

/** Flattened media list: every image, then the primary mediaUrl (if any). */
export function postMedia(post: Post): PostMedia[] {
  const media: PostMedia[] = post.images.map((src) => ({ kind: 'image' as const, src }));
  if (post.mediaUrl) media.push({ kind: post.mediaType ?? 'image', src: post.mediaUrl });
  return media;
}

export function hasMedia(post: Post): boolean {
  return post.images.length > 0 || Boolean(post.mediaUrl);
}

export function hasVideo(post: Post): boolean {
  return post.mediaType === 'video' && Boolean(post.mediaUrl);
}

// ---------------------------------------------------------------------------
// List params / result / stats
// ---------------------------------------------------------------------------

export type PostAuthorTypeFilter = 'all' | CommunityActorType;
export type PostStatusFilter = 'all' | ModerationStatus;
export type PostMediaFilter = 'all' | 'yes' | 'no';
export type PostVisibilityFilter = 'all' | PostVisibility;

export interface PostListParams {
  q?: string;
  authorType?: PostAuthorTypeFilter;
  status?: PostStatusFilter;
  hasMedia?: PostMediaFilter;
  visibility?: PostVisibilityFilter;
  dateRange?: DateRangeValue;
  /** Internal — scopes the list to a single author (profile "Posts" tabs). Not a Toolbar control. */
  authorId?: string;
  page?: number;
  pageSize?: number;
}

export interface PostListResult {
  items: Post[];
  total: number;
  page: number;
  pageCount: number;
}

/** Platform-wide community counts for the list KPI row. */
export interface PostStats {
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
  removed: number;
}

// ---------------------------------------------------------------------------
// Wire DTO (snake_case, tolerant aliases) + normaliser — go-live is a flag flip
// ---------------------------------------------------------------------------

export interface CommunityActorDto {
  id?: string | number;
  author_id?: string | number;
  actor_id?: string | number;
  facility_id?: string | number;
  facilityId?: string | number;
  type?: string;
  author_type?: string;
  actor_type?: string;
  name?: string;
  full_name?: string;
  logo_url?: string;
  avatar_url?: string;
  photo_url?: string;
  reaction?: string;
  reaction_type?: string;
}

export interface PostDto {
  id?: string | number;
  _id?: string;
  post_id?: string | number;
  author?: CommunityActorDto;
  body?: string;
  content?: string;
  text?: string;
  images?: string[];
  media_urls?: string[];
  media_url?: string;
  mediaUrl?: string;
  media_type?: string;
  mediaType?: string;
  visibility?: string;
  moderation_status?: string;
  status?: string;
  removed_reason?: string;
  removed_at?: string;
  removed_by?: string;
  interactions?: Partial<Record<ReactionType, number>>;
  total_comments?: number;
  comments_count?: number;
  total_shares?: number;
  shares_count?: number;
  created_at?: string;
  createdAt?: string;
}

export interface CommentDto {
  id?: string | number;
  _id?: string;
  comment_id?: string | number;
  post_id?: string | number;
  postId?: string | number;
  author?: CommunityActorDto;
  body?: string;
  text?: string;
  moderation_status?: string;
  status?: string;
  removed_reason?: string;
  removed_at?: string;
  removed_by?: string;
  created_at?: string;
  createdAt?: string;
}

function normalizeActorType(value: string | undefined): CommunityActorType {
  return value === 'facility' ? 'facility' : 'player';
}

function normalizeReaction(value: string | undefined): ReactionType {
  const v = (value ?? '').toLowerCase();
  return (REACTION_TYPES as string[]).includes(v) ? (v as ReactionType) : 'like';
}

function normalizeStatus(value: string | undefined): ModerationStatus {
  return value === 'removed' ? 'removed' : 'published';
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

export function toActor(dto: CommunityActorDto | undefined): CommunityActor {
  const raw = dto ?? {};
  const facilityId = raw.facility_id ?? raw.facilityId;
  return {
    id: String(raw.id ?? raw.author_id ?? raw.actor_id ?? ''),
    type: normalizeActorType(raw.type ?? raw.author_type ?? raw.actor_type),
    name: raw.name ?? raw.full_name ?? '',
    logoUrl: resolveUploadUrl(raw.logo_url ?? raw.avatar_url ?? raw.photo_url),
    facilityId: facilityId != null ? String(facilityId) : undefined,
  };
}

export function toReactor(dto: CommunityActorDto): Reactor {
  return { ...toActor(dto), reaction: normalizeReaction(dto.reaction ?? dto.reaction_type) };
}

export function toPost(dto: PostDto): Post {
  const raw = dto.interactions ?? {};
  const interactions: ReactionCounts = {
    like: num(raw.like),
    love: num(raw.love),
    celebrate: num(raw.celebrate),
    support: num(raw.support),
    insightful: num(raw.insightful),
  };
  return {
    id: String(dto.id ?? dto._id ?? dto.post_id ?? ''),
    author: toActor(dto.author),
    body: dto.body ?? dto.content ?? dto.text,
    // Every media field goes through `resolveUploadUrl`, like the facility
    // gallery and the KYC documents already do. Without it a row stamped with an
    // empty APP_URL stays the relative `/uploads/…`, which resolves against the
    // DASHBOARD's origin — and the SPA fallback answers with index.html, so the
    // moderator sees a blank tile instead of the post they have to judge.
    images: (Array.isArray(dto.media_urls) ? dto.media_urls : (dto.images ?? []))
      .map((url) => resolveUploadUrl(url) ?? '')
      .filter(Boolean),
    mediaUrl: resolveUploadUrl(dto.media_url ?? dto.mediaUrl),
    mediaType: (dto.media_type ?? dto.mediaType) === 'video' ? 'video' : dto.media_url || dto.mediaUrl ? 'image' : undefined,
    visibility: dto.visibility === 'private' ? 'private' : 'public',
    createdAt: dto.created_at ?? dto.createdAt ?? new Date().toISOString(),
    interactions,
    totalReactions: sumReactions(interactions),
    totalComments: num(dto.total_comments ?? dto.comments_count),
    totalShares: num(dto.total_shares ?? dto.shares_count),
    moderationStatus: normalizeStatus(dto.moderation_status ?? dto.status),
    removedReason: dto.removed_reason,
    removedAt: dto.removed_at,
    removedBy: dto.removed_by,
  };
}

export function toComment(dto: CommentDto): Comment {
  return {
    id: String(dto.id ?? dto._id ?? dto.comment_id ?? ''),
    postId: String(dto.post_id ?? dto.postId ?? ''),
    author: toActor(dto.author),
    body: dto.body ?? dto.text ?? '',
    createdAt: dto.created_at ?? dto.createdAt ?? new Date().toISOString(),
    moderationStatus: normalizeStatus(dto.moderation_status ?? dto.status),
    removedReason: dto.removed_reason,
    removedAt: dto.removed_at,
    removedBy: dto.removed_by,
  };
}
