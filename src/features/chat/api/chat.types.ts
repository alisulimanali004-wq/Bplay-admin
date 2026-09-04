/**
 * CHAT (SRS module 15, FR-ADM-CHAT-001..006) — the direct conversation channel
 * between the Bplay administration and a FACILITY OWNER.
 *
 * The governing decisions, straight from the SRS "قرارات الوحدة":
 *  - CH1  the two parties are administration (regional admin + super-admin) ↔ owner;
 *  - CH2  V1 is owners ONLY. Players never appear here — they reach the platform
 *         through Feedback (module 10). Player↔owner chat is V2;
 *  - CH3  TEXT ONLY when sending in V1. Attachments are FR-ADM-CHAT-005 (V2);
 *  - CH4  a regional admin sees their own region's threads, a super-admin sees all;
 *  - CH5  explicitly out of scope: queues, SLAs, canned replies, CSAT, escalation,
 *         live-chat bots, knowledge base. Do not add them;
 *  - CH6  the two channels (per-facility review + per-owner general support) are
 *         shown in ONE unified list, the handling team is derived automatically,
 *         and approving/rejecting a facility (module 09) emits a SYSTEM message
 *         into that facility's review thread.
 *
 * The vocabulary below is the mobile owner app's messaging contract 1:1
 * (Bplay-mobile/lib/shared_logic/enums/enums.dart → ConversationCategory /
 * ConversationStatus / MessageSenderType / DeliveryStatus / SystemEventType), so
 * both ends of the same thread agree on the wire without a translation layer.
 */

import type { BadgeVariant } from '@ui';
import type { UserRole } from '@shared/stores/authStore';
import { statusToBadgeVariant } from '@shared/utils/status';
import { resolveUploadUrl } from '@shared/utils/url';

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/**
 * CH6 — the two V1 channels. `facility_review` is opened per facility under
 * review; `general_support` is the owner's single ongoing thread with the team.
 * The mobile enum reserves `finance` / `reports`; neither has a UI on either
 * side, so they are deliberately absent here rather than rendered as dead filters.
 */
export type ConversationCategory = 'facility_review' | 'general_support';

/** Thread lifecycle. `awaiting_admin` is the "needs an answer" state. */
export type ConversationStatus =
  | 'open'
  | 'awaiting_owner'
  | 'awaiting_admin'
  | 'resolved'
  | 'closed';

/** Who authored a message. `system` renders as a centred event pill, not a bubble. */
export type MessageSenderType = 'owner' | 'admin' | 'system';

/** Per-message delivery state. "seen" is deliberately not modelled (owner-app MD8). */
export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'failed';

/** Attachment class — drives thumbnail vs. file-chip rendering. */
export type AttachmentType = 'image' | 'document';

/**
 * An automatic event bubble. These are EMITTED BY THE BACKEND from the facility
 * review decision (module 09 FR-ADM-FAC-002), never composed by an admin.
 */
export type SystemEventType =
  | 'request_submitted'
  | 'review_started'
  | 'document_requested'
  | 'approved'
  | 'rejected'
  | 'status_changed';

export const CONVERSATION_CATEGORIES: ConversationCategory[] = [
  'facility_review',
  'general_support',
];

export const CONVERSATION_STATUSES: ConversationStatus[] = [
  'open',
  'awaiting_owner',
  'awaiting_admin',
  'resolved',
  'closed',
];

/** FR-ADM-CHAT-001 — the list carries a read filter, not a full status filter. */
export type ChatReadState = 'all' | 'unread';

/** Body bounds — mirrored by the zod schema and by what the backend must enforce. */
export const MESSAGE_MIN_LENGTH = 1;
export const MESSAGE_MAX_LENGTH = 4000;

/** Below this many characters remaining, the composer counter becomes visible. */
export const MESSAGE_COUNTER_THRESHOLD = 400;

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/**
 * The owner on the other side of the thread. Not a full `Owner` record: the chat
 * shows an identity and deep-links to owner-management for the rest, so this
 * slice never has to stay in sync with that feature's model.
 */
export interface ChatCounterpart {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  /** Governorate/city label — the human-readable form of the scope. */
  city?: string;
}

/**
 * A file the OWNER attached from the mobile app. The admin cannot send one in V1
 * (CH3), but the owner app's composer can, so an inbound attachment must render
 * rather than silently vanish from the thread.
 *
 * `url` is USER-CONTROLLED and must never reach an href/src without
 * `safeHttpUrl()` — the same rule feedback attachments follow.
 */
export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: AttachmentType;
  /** Bytes, when the server reports it; drives the size label on a file chip. */
  sizeBytes?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  /** Absent on a system message. */
  senderId?: string;
  senderName?: string;
  /** Which side of the administration wrote it — only meaningful when admin. */
  senderRole?: UserRole;
  senderPhotoUrl?: string;
  /** Rendered as a TEXT NODE, never as HTML. */
  body: string;
  attachments: ChatAttachment[];
  systemEventType?: SystemEventType;
  /** Extra context on a detail-bearing system event (the rejection reason, …). */
  systemEventDetail?: string;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
  /**
   * Client-side only. A message still in flight carries the id the optimistic
   * insert gave it, so a retry can find and replace the right row.
   */
  isOptimistic?: boolean;
}

export interface Conversation {
  id: string;
  category: ConversationCategory;
  /** Facility name for a review thread, the support label for a general one. */
  title: string;
  owner: ChatCounterpart;
  /** Present on `facility_review` only — the facility the thread is about. */
  facilityId?: string;
  facilityName?: string;
  /**
   * FR-ADM-CHAT-004 — the region of the owner's facility, resolved by the
   * BACKEND. `null` = the facility sits outside every live region (an "orphan",
   * visible to super-admins only), exactly as facilities and feedback model it.
   */
  regionId: string | null;
  regionNames: string[];
  isOrphan: boolean;
  status: ConversationStatus;
  /** CH6 — derived automatically from the category; there is no manual routing. */
  team: string;
  /** Denormalised for the rail: never fetch a thread to render its list row. */
  lastMessagePreview: string;
  lastMessageAt: string;
  lastMessageSender: MessageSenderType | null;
  /** Messages the signed-in administration side has not read yet. */
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListParams {
  /** FR-ADM-CHAT-001 — searches the owner name (plus facility + last message). */
  q?: string;
  category?: 'all' | ConversationCategory;
  status?: 'all' | ConversationStatus;
  readState?: ChatReadState;
  /** Region id, or the `orphans` sentinel (super-admin only). */
  regionId?: string;
  page?: number;
  pageSize?: number;
}

export interface ConversationListResult {
  items: Conversation[];
  total: number;
  page: number;
  pageCount: number;
}

/** Counters for the rail header — computed over the whole SCOPED set, never a page. */
export interface ChatStats {
  total: number;
  /** Threads with at least one unread message. */
  unread: number;
  /** Threads whose ball is in the administration's court. */
  awaitingAdmin: number;
  resolved: number;
}

export interface MessagePage {
  messages: ChatMessage[];
  /** True when older messages exist beyond the returned window. */
  hasMore: boolean;
}

export interface SendMessageInput {
  body: string;
}

/** FR-ADM-CHAT-003 — open (or resolve) a thread with an owner, then write to it. */
export interface StartConversationInput {
  ownerId: string;
  category: ConversationCategory;
  /** Required for `facility_review`; ignored for `general_support`. */
  facilityId?: string;
}

/**
 * An owner the admin may start a thread with — the picker's row. Sourced from the
 * owners the caller's region scope already covers.
 */
export interface ChatOwnerOption {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
  city?: string;
  regionId: string | null;
  regionNames: string[];
  /** The owner's facilities, so a review thread can name its subject. */
  facilities: { id: string; name: string }[];
}

/**
 * What the live transport delivers.
 *
 * These are SIGNALS, never payloads. A socket frame must not be able to inject a
 * row the scope gate never saw, so an arriving message invalidates the queries
 * and the list/thread refetch through the one scoping pipeline they normally use
 * — the same rule `useNotificationStream` follows. `typing` is the sole
 * exception: it is transient, is never persisted, and renders nothing but an
 * animated ellipsis.
 */
export type ChatStreamEvent =
  | { type: 'message'; conversationId: string }
  | { type: 'typing'; conversationId: string; senderType: MessageSenderType }
  | { type: 'read'; conversationId: string };

/** Unsubscribe handle returned by `subscribeToChat`. */
export type ChatStreamUnsubscribe = () => void;

// ---------------------------------------------------------------------------
// Rules — pure, so the behaviour lives in exactly one place
// ---------------------------------------------------------------------------

/** A closed thread is read-only; everything else accepts a reply. */
export function canReplyTo(conversation: Pick<Conversation, 'status'>): boolean {
  return conversation.status !== 'closed';
}

/** FR-ADM-CHAT-001 — the "needs attention" affordance on a rail row. */
export function needsAdminReply(
  conversation: Pick<Conversation, 'status' | 'unreadCount'>,
): boolean {
  return conversation.status === 'awaiting_admin' || conversation.unreadCount > 0;
}

/**
 * Sending flips the ball to the owner. A resolved or closed thread is reopened by
 * the answer — the same "a reply revives the item" rule feedback uses, so the two
 * inboxes behave identically.
 */
export function statusAfterAdminReply(): ConversationStatus {
  return 'awaiting_owner';
}

/** CH6 — the handling team is derived, never picked by a human. */
export const TEAM_KEY: Record<ConversationCategory, string> = {
  facility_review: 'chat.team.review',
  general_support: 'chat.team.support',
};

// ---------------------------------------------------------------------------
// Badge variants
// ---------------------------------------------------------------------------

const STATUS_KEY: Record<ConversationStatus, string> = {
  open: 'new',
  awaiting_owner: 'pending',
  awaiting_admin: 'pending',
  resolved: 'approved',
  closed: 'archived',
};
export function conversationStatusBadgeVariant(status: ConversationStatus): BadgeVariant {
  // `awaiting_admin` is the one that must stand out — it is the admin's queue.
  if (status === 'awaiting_admin') return 'caution';
  return statusToBadgeVariant(STATUS_KEY[status]);
}

const CATEGORY_VARIANT: Record<ConversationCategory, BadgeVariant> = {
  facility_review: 'info',
  general_support: 'neutral',
};
export function conversationCategoryBadgeVariant(
  category: ConversationCategory,
): BadgeVariant {
  return CATEGORY_VARIANT[category];
}

/**
 * A system event's tone. Approval reads as success, rejection as danger, and the
 * procedural steps stay neutral so the thread does not look alarming by default.
 */
const SYSTEM_VARIANT: Record<SystemEventType, BadgeVariant> = {
  request_submitted: 'info',
  review_started: 'info',
  document_requested: 'warning',
  approved: 'success',
  rejected: 'danger',
  status_changed: 'neutral',
};
export function systemEventBadgeVariant(event: SystemEventType): BadgeVariant {
  return SYSTEM_VARIANT[event];
}

// ---------------------------------------------------------------------------
// Wire DTOs (snake_case) + normalisers
// ---------------------------------------------------------------------------

export interface ChatCounterpartDto {
  id?: string | number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  city?: string | null;
}

export interface ChatAttachmentDto {
  id?: string | number;
  name?: string;
  url?: string;
  type?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
}

export interface ChatMessageDto {
  id?: string | number;
  conversation_id?: string | number;
  sender_type?: string;
  sender_id?: string | number | null;
  sender_name?: string | null;
  sender_role?: string | null;
  sender_photo_url?: string | null;
  body?: string | null;
  /** The owner app names this field `text`; both spellings are accepted. */
  text?: string | null;
  attachments?: ChatAttachmentDto[];
  system_event_type?: string | null;
  system_event_detail?: string | null;
  delivery_status?: string | null;
  created_at?: string;
  sent_at?: string;
}

export interface ConversationDto {
  id?: string | number;
  category?: string;
  title?: string;
  owner?: ChatCounterpartDto;
  facility_id?: string | number | null;
  facility_name?: string | null;
  region_id?: string | number | null;
  region_names?: string[];
  status?: string;
  team?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  last_message_sender?: string | null;
  unread_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChatOwnerOptionDto {
  id?: string | number;
  name?: string;
  email?: string | null;
  photo_url?: string | null;
  city?: string | null;
  region_id?: string | number | null;
  region_names?: string[];
  facilities?: { id?: string | number; name?: string }[];
}

function normalizeCategory(value: string | undefined): ConversationCategory {
  return value === 'facility_review' ? 'facility_review' : 'general_support';
}

function normalizeStatus(value: string | undefined): ConversationStatus {
  const status = (value ?? '').toLowerCase();
  return (CONVERSATION_STATUSES as string[]).includes(status)
    ? (status as ConversationStatus)
    : 'open';
}

function normalizeSenderType(value: string | null | undefined): MessageSenderType {
  if (value === 'owner') return 'owner';
  if (value === 'admin') return 'admin';
  return 'system';
}

function normalizeDelivery(value: string | null | undefined): DeliveryStatus {
  const status = (value ?? '').toLowerCase();
  return status === 'sending' || status === 'delivered' || status === 'failed'
    ? (status as DeliveryStatus)
    : 'sent';
}

function normalizeRole(value: string | null | undefined): UserRole | undefined {
  if (value === 'super_admin') return 'super_admin';
  if (value === 'admin') return 'admin';
  return undefined;
}

function normalizeSystemEvent(value: string | null | undefined): SystemEventType | undefined {
  const events: string[] = [
    'request_submitted',
    'review_started',
    'document_requested',
    'approved',
    'rejected',
    'status_changed',
  ];
  return value && events.includes(value) ? (value as SystemEventType) : undefined;
}

/**
 * Which renderer an attachment gets. Mirrors `attachmentKind()` in feedback:
 * declared type first, mime second, extension as the last resort — so no
 * component ever has to sniff a URL itself.
 */
export function attachmentType(
  declared: string | null | undefined,
  mime: string | null | undefined,
  url: string,
): AttachmentType {
  if (declared === 'image') return 'image';
  if (declared === 'document') return 'document';
  if (mime?.startsWith('image/')) return 'image';
  return /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(url) ? 'image' : 'document';
}

export function toChatAttachment(dto: ChatAttachmentDto): ChatAttachment {
  const url = resolveUploadUrl(dto.url) ?? '';
  return {
    id: String(dto.id ?? ''),
    name: dto.name ?? '',
    url,
    type: attachmentType(dto.type, dto.mime_type, url),
    sizeBytes: dto.size_bytes ?? undefined,
  };
}

export function toChatMessage(dto: ChatMessageDto): ChatMessage {
  const senderType = normalizeSenderType(dto.sender_type);
  return {
    id: String(dto.id ?? ''),
    conversationId: String(dto.conversation_id ?? ''),
    senderType,
    senderId: dto.sender_id === null || dto.sender_id === undefined ? undefined : String(dto.sender_id),
    senderName: dto.sender_name ?? undefined,
    senderRole: senderType === 'admin' ? normalizeRole(dto.sender_role) : undefined,
    senderPhotoUrl: dto.sender_photo_url ?? undefined,
    body: dto.body ?? dto.text ?? '',
    attachments: (dto.attachments ?? []).map(toChatAttachment),
    systemEventType: normalizeSystemEvent(dto.system_event_type),
    systemEventDetail: dto.system_event_detail ?? undefined,
    deliveryStatus: normalizeDelivery(dto.delivery_status),
    createdAt: dto.created_at ?? dto.sent_at ?? new Date().toISOString(),
  };
}

export function toConversation(dto: ConversationDto): Conversation {
  const ownerDto = dto.owner ?? {};
  const regionId =
    dto.region_id === null || dto.region_id === undefined ? null : String(dto.region_id);
  const category = normalizeCategory(dto.category);
  const now = new Date().toISOString();
  const lastMessageAt = dto.last_message_at ?? dto.updated_at ?? dto.created_at ?? now;
  return {
    id: String(dto.id ?? ''),
    category,
    title: dto.title ?? dto.facility_name ?? ownerDto.name ?? '',
    owner: {
      id: String(ownerDto.id ?? ''),
      name: ownerDto.name ?? '',
      email: ownerDto.email ?? undefined,
      phone: ownerDto.phone ?? undefined,
      photoUrl: ownerDto.photo_url ?? undefined,
      city: ownerDto.city ?? undefined,
    },
    facilityId:
      dto.facility_id === null || dto.facility_id === undefined
        ? undefined
        : String(dto.facility_id),
    facilityName: dto.facility_name ?? undefined,
    regionId,
    regionNames: dto.region_names ?? [],
    // Derived from the ID alone, like feedback: `regionNames` is a display label
    // and an empty one must never contradict the field the scope gate reads.
    isOrphan: regionId === null,
    status: normalizeStatus(dto.status),
    team: dto.team ?? TEAM_KEY[category],
    lastMessagePreview: dto.last_message_preview ?? '',
    lastMessageAt,
    lastMessageSender: dto.last_message_sender
      ? normalizeSenderType(dto.last_message_sender)
      : null,
    unreadCount: dto.unread_count ?? 0,
    createdAt: dto.created_at ?? now,
    updatedAt: dto.updated_at ?? lastMessageAt,
  };
}

export function toChatOwnerOption(dto: ChatOwnerOptionDto): ChatOwnerOption {
  return {
    id: String(dto.id ?? ''),
    name: dto.name ?? '',
    email: dto.email ?? undefined,
    photoUrl: dto.photo_url ?? undefined,
    city: dto.city ?? undefined,
    regionId:
      dto.region_id === null || dto.region_id === undefined ? null : String(dto.region_id),
    regionNames: dto.region_names ?? [],
    facilities: (dto.facilities ?? []).map((facility) => ({
      id: String(facility.id ?? ''),
      name: facility.name ?? '',
    })),
  };
}
