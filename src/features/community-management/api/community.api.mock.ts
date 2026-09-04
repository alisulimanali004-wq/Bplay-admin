import { mockDelay } from '@shared/lib/mock';
import { useAuthStore } from '@shared/stores/authStore';
import { filterAndPaginatePosts } from './community.filter';
import {
  REACTION_TYPES,
  sumReactions,
  type Comment,
  type CommunityActor,
  type CommunityActorType,
  type ModerationAction,
  type Post,
  type PostListParams,
  type PostListResult,
  type PostStats,
  type PostVisibility,
  type ReactionCounts,
  type Reactor,
} from './community.types';

// --- time helpers (mock runs at app runtime, so Date is available) -----------
const iso = (ms: number): string => new Date(ms).toISOString();
const daysAgo = (n: number): string => iso(Date.now() - n * 86_400_000);
const hoursAgo = (n: number): string => iso(Date.now() - n * 3_600_000);

// --- author pool -------------------------------------------------------------
// Ids reuse the player mock (500+) and owner mock (300+) id schemes so an
// author / commenter / reactor deep-links to a real profile in mock mode.
interface AuthorSeed {
  id: string;
  type: CommunityActorType;
  name: string;
  logoUrl?: string;
  /** For facility authors: the real facility id the author link deep-links to. */
  facilityId?: string;
}

const PLAYER_AUTHORS: AuthorSeed[] = [
  { id: '500', type: 'player', name: 'Yara Ibrahim', logoUrl: 'https://i.pravatar.cc/512?img=20' },
  { id: '501', type: 'player', name: 'Kareem Saleh', logoUrl: 'https://i.pravatar.cc/512?img=12' },
  { id: '502', type: 'player', name: 'Lana Haddad', logoUrl: 'https://i.pravatar.cc/512?img=32' },
  { id: '504', type: 'player', name: 'Sara Deeb', logoUrl: 'https://i.pravatar.cc/512?img=47' },
  { id: '506', type: 'player', name: 'Nour Aziz', logoUrl: 'https://i.pravatar.cc/512?img=5' },
  { id: '507', type: 'player', name: 'Bilal Khoury', logoUrl: 'https://i.pravatar.cc/512?img=13' },
  { id: '512', type: 'player', name: 'Dina Rahal', logoUrl: 'https://i.pravatar.cc/512?img=44' },
  { id: '514', type: 'player', name: 'Lina Kassem', logoUrl: 'https://i.pravatar.cc/512?img=25' },
];

// Facility authors: `id` is the OWNER id (so their posts still show under the
// owner's "Posts" tab), while `facilityId` is the real facility the author link
// opens — name + id aligned to actual facility seeds (f1–f4) for a coherent click.
const FACILITY_AUTHORS: AuthorSeed[] = [
  { id: '300', type: 'facility', facilityId: 'f1', name: 'Al-Baramkeh Sports Club', logoUrl: 'https://picsum.photos/seed/fac-f1/200' },
  { id: '301', type: 'facility', facilityId: 'f2', name: 'Mezzeh Padel Arena', logoUrl: 'https://picsum.photos/seed/fac-f2/200' },
  { id: '302', type: 'facility', facilityId: 'f3', name: 'Qasioun Heights Club', logoUrl: 'https://picsum.photos/seed/fac-f3/200' },
  { id: '303', type: 'facility', facilityId: 'f4', name: 'Barada Riverside Pitch', logoUrl: 'https://picsum.photos/seed/fac-f4/200' },
];

const AUTHORS: AuthorSeed[] = [...PLAYER_AUTHORS, ...FACILITY_AUTHORS];
const authorById = (id: string): AuthorSeed =>
  AUTHORS.find((a) => a.id === id) ?? AUTHORS[0];

const toActorRow = (seed: AuthorSeed): CommunityActor => ({
  id: seed.id,
  type: seed.type,
  name: seed.name,
  logoUrl: seed.logoUrl,
  facilityId: seed.facilityId,
});

// --- media helpers -----------------------------------------------------------
const img = (seed: string): string => `https://picsum.photos/seed/${seed}/900/650`;
const SAMPLE_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4';

const COMMENT_BODIES = [
  'Great post — count me in!',
  'Where exactly is this happening?',
  'Looks amazing 👏',
  'What time does it start?',
  "I'll definitely be there.",
  'Can I bring a friend along?',
  'Awesome, thanks for sharing!',
  'Is there parking nearby?',
];

// --- seed ---------------------------------------------------------------------
interface PostSeed {
  authorId: string;
  body?: string;
  imageCount: number;
  video?: boolean;
  visibility: PostVisibility;
  removed?: boolean;
  removedReason?: string;
  reactorCount: number;
  commentCount: number;
  /** Index of a comment to seed as already-removed (moderation demo). */
  removedCommentIndex?: number;
  ageDays: number;
}

const SEED: PostSeed[] = [
  { authorId: '300', body: 'Weekend padel tournament — a few spots still open! Come join the fun 🎾', imageCount: 3, visibility: 'public', reactorCount: 9, commentCount: 5, ageDays: 1 },
  { authorId: '500', body: 'Amazing match today at Green Valley. Great vibes all around!', imageCount: 1, visibility: 'public', reactorCount: 7, commentCount: 3, ageDays: 2 },
  { authorId: '502', body: 'Looking for two more players for Friday football — drop a comment!', imageCount: 0, visibility: 'public', reactorCount: 5, commentCount: 6, ageDays: 3 },
  { authorId: '301', body: 'Our new indoor courts are now open. Book your slot this week.', imageCount: 5, visibility: 'public', reactorCount: 10, commentCount: 4, ageDays: 4 },
  { authorId: '507', body: "Highlights from last night's game 🔥", imageCount: 0, video: true, visibility: 'public', reactorCount: 8, commentCount: 2, ageDays: 1 },
  { authorId: '504', body: 'Swim session complete. New personal best today!', imageCount: 1, visibility: 'public', reactorCount: 6, commentCount: 1, ageDays: 5 },
  { authorId: '302', body: 'Ramadan special: late-night bookings at half price all month.', imageCount: 2, visibility: 'public', reactorCount: 9, commentCount: 3, ageDays: 6 },
  { authorId: '506', body: 'Buy followers cheap!! Click my profile link now!!!', imageCount: 0, visibility: 'public', removed: true, removedReason: 'Repeated self-promotion / spam reported by the community.', reactorCount: 4, commentCount: 2, ageDays: 7 },
  { authorId: '512', body: 'Private note to my team about tomorrow’s training schedule.', imageCount: 0, visibility: 'private', reactorCount: 4, commentCount: 0, ageDays: 2 },
  { authorId: '303', body: 'Grand opening this Saturday — free entry all day! Bring the family.', imageCount: 4, visibility: 'public', reactorCount: 10, commentCount: 5, ageDays: 8 },
  { authorId: '501', body: 'Anyone up for a tennis match this weekend?', imageCount: 0, visibility: 'public', reactorCount: 5, commentCount: 4, ageDays: 3 },
  { authorId: '514', body: 'Great coaching session today — highly recommend the team here!', imageCount: 1, visibility: 'public', reactorCount: 6, commentCount: 2, ageDays: 9 },
  { authorId: '300', body: 'Maintenance notice: Court A will be closed Monday morning.', imageCount: 0, visibility: 'public', reactorCount: 4, commentCount: 1, ageDays: 10 },
  { authorId: '507', body: 'Pre-season friendly — who’s in? 💪', imageCount: 1, visibility: 'public', reactorCount: 5, commentCount: 3, removedCommentIndex: 1, ageDays: 4 },
];

// --- deterministic generators ------------------------------------------------
function genReactors(i: number, authorId: string, count: number): Reactor[] {
  const pool = AUTHORS.filter((a) => a.id !== authorId);
  const list: Reactor[] = [];
  const n = Math.min(count, pool.length);
  for (let k = 0; k < n; k += 1) {
    const seed = pool[(i * 3 + k) % pool.length];
    list.push({ ...toActorRow(seed), reaction: REACTION_TYPES[(i + k) % REACTION_TYPES.length] });
  }
  return list;
}

function tallyReactions(reactors: Reactor[]): ReactionCounts {
  const counts: ReactionCounts = { like: 0, love: 0, celebrate: 0, support: 0, insightful: 0 };
  for (const reactor of reactors) counts[reactor.reaction] += 1;
  return counts;
}

function genComments(
  postId: string,
  i: number,
  authorId: string,
  count: number,
  removedCommentIndex?: number,
): Comment[] {
  const pool = AUTHORS.filter((a) => a.id !== authorId);
  const list: Comment[] = [];
  for (let k = 0; k < count; k += 1) {
    const seed = pool[(i + k) % pool.length];
    const removed = k === removedCommentIndex;
    list.push({
      id: `${postId}-c${k + 1}`,
      postId,
      author: toActorRow(seed),
      body: COMMENT_BODIES[(i + k) % COMMENT_BODIES.length],
      createdAt: hoursAgo((i + 1) * 3 + k * 5),
      moderationStatus: removed ? 'removed' : 'published',
      removedReason: removed ? 'Off-topic / spam comment.' : undefined,
      removedAt: removed ? hoursAgo((i + 1) * 3) : undefined,
      removedBy: removed ? 'Super Admin' : undefined,
    });
  }
  return list;
}

// --- in-memory mutable stores (mutations persist for the session) ------------
const commentsBy: Record<string, Comment[]> = {};
const reactorsBy: Record<string, Reactor[]> = {};

function publishedCommentCount(postId: string): number {
  return (commentsBy[postId] ?? []).filter((c) => c.moderationStatus === 'published').length;
}

const postsDb: Post[] = SEED.map((seed, i) => {
  const id = String(700 + i);
  const author = authorById(seed.authorId);
  const reactors = (reactorsBy[id] = genReactors(i, seed.authorId, seed.reactorCount));
  const interactions = tallyReactions(reactors);
  commentsBy[id] = genComments(id, i, seed.authorId, seed.commentCount, seed.removedCommentIndex);

  const images = Array.from({ length: seed.imageCount }, (_, k) => img(`post-${id}-${k}`));

  return {
    id,
    author: toActorRow(author),
    body: seed.body,
    images,
    mediaUrl: seed.video ? SAMPLE_VIDEO : undefined,
    mediaType: seed.video ? 'video' : undefined,
    visibility: seed.visibility,
    createdAt: daysAgo(seed.ageDays),
    interactions,
    totalReactions: sumReactions(interactions),
    totalComments: publishedCommentCount(id),
    totalShares: (i * 2) % 7,
    moderationStatus: seed.removed ? 'removed' : 'published',
    removedReason: seed.removed ? seed.removedReason : undefined,
    removedAt: seed.removed ? daysAgo(seed.ageDays - 0.5) : undefined,
    removedBy: seed.removed ? 'Super Admin' : undefined,
  };
});

// --- moderation --------------------------------------------------------------
function currentAdminName(): string {
  return useAuthStore.getState().user?.name ?? 'Super Admin';
}

function applyModeration(target: Post | Comment, action: ModerationAction): void {
  if (action === 'remove') {
    target.moderationStatus = 'removed';
    target.removedAt = new Date().toISOString();
    target.removedBy = currentAdminName();
  } else if (action === 'restore') {
    target.moderationStatus = 'published';
    target.removedReason = undefined;
    target.removedAt = undefined;
    target.removedBy = undefined;
  }
}

// --- query functions ---------------------------------------------------------
export async function getPosts(params: PostListParams): Promise<PostListResult> {
  await mockDelay();
  return filterAndPaginatePosts(postsDb, params);
}

export async function getPostById(id: string): Promise<Post> {
  await mockDelay();
  const post = postsDb.find((item) => item.id === id);
  if (!post) throw new Error('Post not found');
  return { ...post, images: [...post.images], interactions: { ...post.interactions } };
}

export async function getPostStats(): Promise<PostStats> {
  await mockDelay(200);
  return {
    totalPosts: postsDb.length,
    totalComments: postsDb.reduce((sum, post) => sum + post.totalComments, 0),
    totalReactions: postsDb.reduce((sum, post) => sum + post.totalReactions, 0),
    removed: postsDb.filter((post) => post.moderationStatus === 'removed').length,
  };
}

export async function getPostComments(postId: string): Promise<Comment[]> {
  await mockDelay(300);
  return (commentsBy[postId] ?? []).map((comment) => ({ ...comment }));
}

export async function getPostReactors(postId: string): Promise<Reactor[]> {
  await mockDelay(300);
  return (reactorsBy[postId] ?? []).map((reactor) => ({ ...reactor }));
}

// --- mutations ---------------------------------------------------------------
export async function updatePostModeration(
  id: string,
  action: ModerationAction,
  reason?: string,
): Promise<void> {
  await mockDelay();
  const index = postsDb.findIndex((item) => item.id === id);
  if (index === -1) return;
  if (action === 'delete') {
    postsDb.splice(index, 1);
    delete commentsBy[id];
    delete reactorsBy[id];
    return;
  }
  const post = postsDb[index];
  applyModeration(post, action);
  if (action === 'remove') post.removedReason = reason;
}

export async function updateCommentModeration(
  postId: string,
  commentId: string,
  action: ModerationAction,
  reason?: string,
): Promise<void> {
  await mockDelay();
  const list = commentsBy[postId];
  if (!list) return;
  const index = list.findIndex((item) => item.id === commentId);
  if (index === -1) return;
  if (action === 'delete') {
    list.splice(index, 1);
  } else {
    applyModeration(list[index], action);
    if (action === 'remove') list[index].removedReason = reason;
  }
  // Keep the post's public comment counter in sync.
  const post = postsDb.find((item) => item.id === postId);
  if (post) post.totalComments = publishedCommentCount(postId);
}
