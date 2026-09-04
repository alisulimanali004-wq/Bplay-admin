/**
 * FEEDBACK (FEED) — the service channel players and facility owners use to send
 * notes, complaints and suggestions to the Bplay administration (SRS module 10,
 * FR-ADM-FEED-001..005).
 *
 * The governing principle is VIEW + REPLY ONLY (FD4): this is not a moderation
 * surface. There are no warnings, no content takedowns, no automated triage —
 * the admin reads, answers, and closes.
 *
 * Deliberately NOT:
 *  - a facility review (player→facility) — that belongs to the owner app;
 *  - a content report — community-management owns those;
 *  - a chat. Multiple replies are allowed, but the interactive thread is SRS
 *    module 15 (FD2). Here a reply is a one-way answer that notifies the sender.
 */

import type { BadgeVariant } from '@ui';
import type { UserRole } from '@shared/stores/authStore';
import { statusToBadgeVariant } from '@shared/utils/status';
import { resolveUploadUrl } from '@shared/utils/url';

/** Who wrote in. Drives the region resolution and the profile deep-link. */
export type FeedbackSenderType = 'player' | 'owner';

/**
 * SRS: ملاحظة / شكوى / اقتراح — plus `technical`, a fourth kind added so a bug
 * report carries the app version and OS it happened on (see
 * [FeedbackDeviceContext]) instead of arriving as an untriageable "complaint".
 *
 * This stays ONE channel rather than a second "contact us" inbox: every Bplay
 * user is authenticated, so the sender is always known and a separate anonymous
 * form would carry no distinct job.
 */
export type FeedbackKind = 'note' | 'complaint' | 'suggestion' | 'technical';

/** FR-ADM-FEED-004: جديد / تمّ الرد / مغلق. */
export type FeedbackStatus = 'new' | 'replied' | 'closed';

export type FeedbackSortBy = 'createdAt' | 'updatedAt';

export const FEEDBACK_SENDER_TYPES: FeedbackSenderType[] = ['player', 'owner'];
export const FEEDBACK_KINDS: FeedbackKind[] = [
  'note',
  'complaint',
  'suggestion',
  'technical',
];
export const FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'replied', 'closed'];

/** Body bounds — mirrored by the zod schema and by what the backend must enforce. */
export const REPLY_MIN_LENGTH = 2;
export const REPLY_MAX_LENGTH = 4000;

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface FeedbackSender {
  id: string;
  type: FeedbackSenderType;
  name: string;
  email?: string;
  photoUrl?: string;
  /** Governorate/city the sender is registered in — the human label for the scope. */
  city?: string;
}

/**
 * A file the sender attached. `url` is USER-CONTROLLED and must never be placed
 * in an href/src without `safeHttpUrl()`; `kind` picks the viewer branch.
 */
export interface FeedbackAttachment {
  id: string;
  name: string;
  url: string;
  kind: 'image' | 'pdf';
}

/** One admin answer. Replies accumulate — an edit never overwrites an earlier one. */
export interface FeedbackReply {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

/**
 * App version + OS a `technical` report was filed from, captured by the mobile
 * app at submit time so the team can reproduce a bug instead of asking "which
 * version are you on?".
 *
 * `undefined` on every other kind — the app deliberately attaches this ONLY to
 * a technical report rather than harvesting device data on every message.
 */
export interface FeedbackDeviceContext {
  appVersion: string;
  /** `android` | `ios` | the raw platform string. */
  platform: string;
  osVersion?: string;
  deviceModel?: string;
}

export interface Feedback {
  id: string;
  sender: FeedbackSender;
  kind: FeedbackKind;
  /** The sender's message. Rendered as a text node — never as HTML. */
  body: string;
  attachments: FeedbackAttachment[];
  status: FeedbackStatus;
  /**
   * FR-ADM-FEED-005 — the sender's region, resolved by the BACKEND at submission
   * time. `null` = the sender sits outside every active region (an "orphan",
   * visible to super-admins only), matching how facilities model it.
   */
  regionId: string | null;
  regionNames: string[];
  isOrphan: boolean;
  /** Populated on the detail read; the list carries `replyCount` only. */
  replies: FeedbackReply[];
  replyCount: number;
  /** Present on a `technical` report only. */
  deviceContext?: FeedbackDeviceContext;
  createdAt: string;
  /** Bumped by a reply or a status change — the "last activity" column. */
  updatedAt: string;
  closedAt?: string;
  closedByName?: string;
}

export interface FeedbackListParams {
  q?: string;
  senderType?: 'all' | FeedbackSenderType;
  kind?: 'all' | FeedbackKind;
  status?: 'all' | FeedbackStatus;
  /** Region id, or the `orphans` sentinel (super-admin only). */
  regionId?: string;
  dateRange?: import('@ui').DateRangeValue;
  sortBy?: FeedbackSortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface FeedbackListResult {
  items: Feedback[];
  total: number;
  page: number;
  pageCount: number;
}

/** Counters for the KPI row — computed over the whole SCOPED collection, never one page. */
export interface FeedbackStats {
  total: number;
  new: number;
  replied: number;
  closed: number;
}

export interface ReplyFeedbackInput {
  body: string;
}

// ---------------------------------------------------------------------------
// Status machine (FR-ADM-FEED-004) — pure, so the rules live in exactly one place
// ---------------------------------------------------------------------------

/**
 * Replying always lands on `replied` — including on a closed item, which the
 * reply reopens (SRS: "الرد على عنصر مغلق يعيد فتحه ويحوّله إلى تمّ الرد").
 */
export function statusAfterReply(): FeedbackStatus {
  return 'replied';
}

/** Reopening returns to where the item was before it was closed. */
export function statusAfterReopen(feedback: Pick<Feedback, 'replyCount'>): FeedbackStatus {
  return feedback.replyCount > 0 ? 'replied' : 'new';
}

export function canCloseFeedback(feedback: Pick<Feedback, 'status'>): boolean {
  return feedback.status !== 'closed';
}

export function canReopenFeedback(feedback: Pick<Feedback, 'status'>): boolean {
  return feedback.status === 'closed';
}

/** Awaiting an answer — drives the "needs attention" affordance. */
export function isAwaitingReply(feedback: Pick<Feedback, 'status'>): boolean {
  return feedback.status === 'new';
}

// ---------------------------------------------------------------------------
// Badge variants
// ---------------------------------------------------------------------------

const STATUS_KEY: Record<FeedbackStatus, string> = {
  new: 'new',
  replied: 'approved',
  closed: 'archived',
};
export function feedbackStatusBadgeVariant(status: FeedbackStatus): BadgeVariant {
  return statusToBadgeVariant(STATUS_KEY[status]);
}

const KIND_VARIANT: Record<FeedbackKind, BadgeVariant> = {
  note: 'neutral',
  complaint: 'danger',
  suggestion: 'info',
  // A bug report is actionable engineering work, not a grievance — amber, the
  // dashboard's 'needs attention' colour, rather than the complaint red.
  technical: 'warning',
};
export function feedbackKindBadgeVariant(kind: FeedbackKind): BadgeVariant {
  return KIND_VARIANT[kind];
}

const SENDER_VARIANT: Record<FeedbackSenderType, BadgeVariant> = {
  player: 'info',
  owner: 'warning',
};
export function feedbackSenderBadgeVariant(type: FeedbackSenderType): BadgeVariant {
  return SENDER_VARIANT[type];
}

// ---------------------------------------------------------------------------
// Wire DTOs (snake_case) + normalisers
// ---------------------------------------------------------------------------

export interface FeedbackSenderDto {
  id?: string | number;
  type?: string;
  name?: string;
  email?: string | null;
  photo_url?: string | null;
  city?: string | null;
}

export interface FeedbackAttachmentDto {
  id?: string | number;
  name?: string;
  url?: string;
  mime_type?: string | null;
}

export interface FeedbackReplyDto {
  id?: string | number;
  body?: string;
  author_id?: string | number;
  author_name?: string;
  author_role?: string;
  created_at?: string;
}

export interface FeedbackDeviceContextDto {
  app_version?: string;
  platform?: string;
  os_version?: string | null;
  device_model?: string | null;
}

export interface FeedbackDto {
  id?: string | number;
  sender?: FeedbackSenderDto;
  kind?: string;
  body?: string;
  attachments?: FeedbackAttachmentDto[];
  status?: string;
  region_id?: string | number | null;
  region_names?: string[];
  replies?: FeedbackReplyDto[];
  reply_count?: number;
  device_context?: FeedbackDeviceContextDto | null;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
  closed_by_name?: string | null;
}

function normalizeSenderType(value: string | undefined): FeedbackSenderType {
  return value === 'owner' ? 'owner' : 'player';
}

function normalizeKind(value: string | undefined): FeedbackKind {
  const kind = (value ?? '').toLowerCase();
  return (FEEDBACK_KINDS as string[]).includes(kind) ? (kind as FeedbackKind) : 'note';
}

function normalizeStatus(value: string | undefined): FeedbackStatus {
  const status = (value ?? '').toLowerCase();
  return (FEEDBACK_STATUSES as string[]).includes(status) ? (status as FeedbackStatus) : 'new';
}

function normalizeRole(value: string | undefined): UserRole {
  return value === 'super_admin' ? 'super_admin' : 'admin';
}

/**
 * Which viewer an attachment opens in. Derived once here (mime first, extension
 * as the fallback) so no component has to sniff the URL — mirrors owner docs.
 */
export function attachmentKind(mime: string | null | undefined, url: string): 'image' | 'pdf' {
  if (mime?.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(url) ? 'image' : 'pdf';
}

export function toFeedbackReply(dto: FeedbackReplyDto): FeedbackReply {
  return {
    id: String(dto.id ?? ''),
    body: dto.body ?? '',
    authorId: String(dto.author_id ?? ''),
    authorName: dto.author_name ?? '',
    authorRole: normalizeRole(dto.author_role),
    createdAt: dto.created_at ?? new Date().toISOString(),
  };
}

function toDeviceContext(
  dto: FeedbackDeviceContextDto | null | undefined,
): FeedbackDeviceContext | undefined {
  // A context with no app version tells the team nothing, so treat it as absent
  // rather than rendering an empty technical line.
  if (!dto?.app_version) return undefined;
  return {
    appVersion: dto.app_version,
    platform: dto.platform ?? 'unknown',
    osVersion: dto.os_version ?? undefined,
    deviceModel: dto.device_model ?? undefined,
  };
}

export function toFeedback(dto: FeedbackDto): Feedback {
  const senderDto = dto.sender ?? {};
  const replies = (dto.replies ?? []).map(toFeedbackReply);
  const regionId = dto.region_id === null || dto.region_id === undefined ? null : String(dto.region_id);
  const regionNames = dto.region_names ?? [];
  const now = new Date().toISOString();
  return {
    id: String(dto.id ?? ''),
    sender: {
      id: String(senderDto.id ?? ''),
      type: normalizeSenderType(senderDto.type),
      name: senderDto.name ?? '',
      email: senderDto.email ?? undefined,
      photoUrl: senderDto.photo_url ?? undefined,
      city: senderDto.city ?? undefined,
    },
    kind: normalizeKind(dto.kind),
    body: dto.body ?? '',
    attachments: (dto.attachments ?? []).map((item) => {
      const url = resolveUploadUrl(item.url) ?? '';
      return {
        id: String(item.id ?? ''),
        name: item.name ?? '',
        url,
        kind: attachmentKind(item.mime_type, url),
      };
    }),
    status: normalizeStatus(dto.status),
    regionId,
    regionNames,
    // Derived from the ID alone: `regionNames` is a display label and an empty
    // one must never contradict the field the scope gate reads. Whether the
    // region is still LIVE is resolved per request (see isEffectivelyOrphan).
    isOrphan: regionId === null,
    replies,
    replyCount: dto.reply_count ?? replies.length,
    deviceContext: toDeviceContext(dto.device_context),
    createdAt: dto.created_at ?? now,
    updatedAt: dto.updated_at ?? dto.created_at ?? now,
    closedAt: dto.closed_at ?? undefined,
    closedByName: dto.closed_by_name ?? undefined,
  };
}
