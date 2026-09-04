import { mockDelay } from '@shared/lib/mock';
import { useAuthStore } from '@shared/stores/authStore';
import { getScopeRegions } from '@features/region-management/api';
import {
  applyOwnerScope,
  computeChatStats,
  filterAndPaginateConversations,
  isConversationVisible,
  projectMembership,
  type ChatScope,
} from './chat.filter';
import { statusAfterAdminReply, TEAM_KEY } from './chat.types';
import type {
  ChatMessage,
  ChatOwnerOption,
  ChatStats,
  ChatStreamEvent,
  ChatStreamUnsubscribe,
  Conversation,
  ConversationCategory,
  ConversationListParams,
  ConversationListResult,
  MessagePage,
  SendMessageInput,
  StartConversationInput,
} from './chat.types';

/**
 * In-memory chat: sending, opening and starting a thread really mutate it, so a
 * refetch reflects the change. State lives for the session and resets on reload.
 *
 * The owners and facilities are the SAME records seeded in owner-management
 * ('300'..'315') and facility-management ('f1'..'f24'), with the same region
 * resolution the backend will have to perform:
 *   c1 Damascus · c2 Aleppo · c3 Homs · c4 Latakia · c6 Tartus.
 * Hama (c5) and Idlib (c7) exist but are INACTIVE, and Daraa / Deir ez-Zor have
 * no region record at all — so threads about facilities there are ORPHANS,
 * visible to a super-admin only. That is not padding: it is the case a
 * regional-scope bug leaks, so it has to exist in the fixture.
 *
 * The content is deliberately ORDINARY. Hostile payloads belong in a test, not
 * in the data a stakeholder opens — the defences live in the code that renders
 * it: every body is a JSX text node, and every attachment URL passes
 * `safeHttpUrl()` before it can reach an `src`/`href`.
 */

let messageSeq = 9000;
/**
 * Set from the seeds below rather than hardcoded: a literal starting number
 * silently collides with a seeded id the moment a thread is added to the
 * fixture, and a duplicate id makes the new thread unreachable.
 */
let conversationSeq = 0;

/**
 * The scope is read outside React, exactly like apiClient reads the token. The
 * live region set is re-read every time so deactivating a region revokes access
 * on the next request instead of on the next deploy.
 */
async function currentScope(): Promise<ChatScope> {
  const { role, user } = useAuthStore.getState();
  const regions = await getScopeRegions();
  return {
    role,
    assignedRegionIds: user?.assignedRegionIds,
    activeRegionIds: new Set(
      regions.filter((region) => region.isActive).map((region) => region.id),
    ),
  };
}

/** The signed-in admin, as the author of an outgoing message. */
function currentAdmin(): Pick<ChatMessage, 'senderId' | 'senderName' | 'senderRole'> {
  const { role, user } = useAuthStore.getState();
  return {
    senderId: user?.email ?? 'admin',
    senderName: user?.name ?? user?.email?.split('@')[0] ?? 'Admin',
    senderRole: role ?? 'admin',
  };
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

const HOUR = 3_600_000;
/**
 * A FIXED clock. Timestamps are anchored to it rather than to `Date.now()` so
 * every reload — and every screenshot — shows the same thread, while relative
 * labels ("2h ago") still read naturally against a recent date.
 */
const NOW = Date.parse('2026-08-02T10:00:00.000Z');
const hoursAgo = (h: number): string => new Date(NOW - h * HOUR).toISOString();

const avatar = (img: number): string => `https://i.pravatar.cc/512?img=${img}`;

interface OwnerSeed {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  photo?: number;
  regionId: string | null;
  regionNames: string[];
  facilities: { id: string; name: string }[];
}

/** Owners mirrored from owner-management, with the facilities they actually own. */
const OWNERS: OwnerSeed[] = [
  {
    id: '300',
    name: 'Fadi Barakat',
    email: 'fadi.barakat@bplay.app',
    phone: '+963 933 100 201',
    city: 'Damascus',
    photo: 11,
    regionId: 'c1',
    regionNames: ['Damascus'],
    facilities: [
      { id: 'f1', name: 'Al-Baramkeh Sports Club' },
      { id: 'f22', name: 'Euphrates Sports Academy' },
      { id: 'f23', name: 'Raqqa North Pitch' },
    ],
  },
  {
    id: '301',
    name: 'Rana Suleiman',
    email: 'rana.suleiman@bplay.app',
    phone: '+963 944 220 118',
    city: 'Aleppo',
    photo: 45,
    regionId: 'c1',
    regionNames: ['Damascus'],
    facilities: [{ id: 'f2', name: 'Mezzeh Padel Arena' }],
  },
  {
    id: '302',
    name: 'Omar Khoury',
    email: 'omar.khoury@bplay.app',
    phone: '+963 955 330 447',
    city: 'Homs',
    photo: 13,
    regionId: 'c1',
    regionNames: ['Damascus'],
    facilities: [
      { id: 'f3', name: 'Qasioun Heights Club' },
      { id: 'f14', name: 'Orontes Sports City' },
    ],
  },
  {
    id: '303',
    name: 'Lina Nasser',
    email: 'lina.nasser@bplay.app',
    phone: '+963 966 440 552',
    city: 'Latakia',
    photo: 5,
    regionId: 'c4',
    regionNames: ['Latakia'],
    facilities: [
      { id: 'f4', name: 'Barada Riverside Pitch' },
      { id: 'f16', name: 'Latakia Coastal Pitch' },
      { id: 'f18', name: 'Tishreen Stadium Annex' },
    ],
  },
  {
    id: '304',
    name: 'Karim Aziz',
    email: 'karim.aziz@bplay.app',
    phone: '+963 977 550 663',
    city: 'Tartus',
    photo: 14,
    regionId: 'c6',
    regionNames: ['Tartus'],
    facilities: [
      { id: 'f19', name: 'Tartus Marina Pitch' },
      { id: 'f20', name: 'Arwad View Sports Club' },
    ],
  },
  {
    id: '306',
    name: 'Ziad Halabi',
    email: 'ziad.halabi@bplay.app',
    phone: '+963 933 770 885',
    city: 'Hama',
    photo: 33,
    // Hama (c5) exists but is INACTIVE -> effectively an orphan.
    regionId: null,
    regionNames: [],
    facilities: [{ id: 'f21', name: 'Hama Norias Sports Club' }],
  },
  {
    id: '308',
    name: 'Hadi Rahal',
    email: 'hadi.rahal@bplay.app',
    phone: '+963 955 990 107',
    city: 'Aleppo',
    photo: 52,
    regionId: 'c2',
    regionNames: ['Aleppo'],
    facilities: [
      { id: 'f9', name: 'Aleppo Champions Academy' },
      { id: 'f10', name: 'Citadel Sports Complex' },
    ],
  },
  {
    id: '309',
    name: 'Dina Saab',
    email: 'dina.saab@bplay.app',
    phone: '+963 966 101 218',
    city: 'Damascus',
    photo: 9,
    regionId: 'c1',
    regionNames: ['Damascus'],
    facilities: [
      { id: 'f5', name: 'Abu Rummaneh Racquet Club' },
      { id: 'f24', name: 'Hauran Volleyball Ground' },
    ],
  },
  {
    id: '310',
    name: 'Tarek Mansour',
    email: 'tarek.mansour@bplay.app',
    phone: '+963 977 212 329',
    city: 'Homs',
    photo: 15,
    regionId: 'c3',
    regionNames: ['Homs'],
    facilities: [
      { id: 'f11', name: 'Al-Aziziyah Community Pitch' },
      { id: 'f13', name: 'Al-Waer Community Club' },
    ],
  },
  {
    id: '311',
    name: 'Yasmin Deeb',
    email: 'yasmin.deeb@bplay.app',
    phone: '+963 988 323 430',
    city: 'Latakia',
    photo: 47,
    regionId: 'c4',
    regionNames: ['Latakia'],
    facilities: [
      { id: 'f8', name: 'Malki Tennis Court' },
      { id: 'f17', name: 'Blue Beach Sports Club' },
    ],
  },
  {
    id: '312',
    name: 'Samer Wehbe',
    email: 'samer.wehbe@bplay.app',
    phone: '+963 933 434 541',
    city: 'Idlib',
    photo: 60,
    // Idlib (c7) is INACTIVE -> orphan, like Hama.
    regionId: null,
    regionNames: [],
    facilities: [{ id: 'f12', name: 'Shahba Tennis Club' }],
  },
  {
    id: '314',
    name: 'Bassel Aouad',
    email: 'bassel.aouad@bplay.app',
    phone: '+963 955 221 144',
    city: 'Damascus',
    regionId: 'c1',
    regionNames: ['Damascus'],
    facilities: [],
  },
];

const ownerById = new Map(OWNERS.map((owner) => [owner.id, owner]));

function counterpart(ownerId: string): Conversation['owner'] {
  const owner = ownerById.get(ownerId);
  if (!owner) return { id: ownerId, name: 'Unknown owner' };
  return {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    photoUrl: owner.photo ? avatar(owner.photo) : undefined,
    city: owner.city,
  };
}

interface ThreadSeed {
  id: string;
  ownerId: string;
  category: ConversationCategory;
  facilityId?: string;
  status: Conversation['status'];
  unreadCount: number;
  messages: SeedMessage[];
}

interface SeedMessage {
  from: 'owner' | 'admin' | 'system';
  /** Hours before NOW. Descending through the array = chronological order. */
  at: number;
  body?: string;
  adminName?: string;
  adminRole?: 'admin' | 'super_admin';
  event?: ChatMessage['systemEventType'];
  detail?: string;
  attachments?: ChatMessage['attachments'];
}

function facilityName(ownerId: string, facilityId: string | undefined): string | undefined {
  if (!facilityId) return undefined;
  return ownerById.get(ownerId)?.facilities.find((f) => f.id === facilityId)?.name;
}

function buildThread(seed: ThreadSeed): { conversation: Conversation; messages: ChatMessage[] } {
  const owner = ownerById.get(seed.ownerId);
  const name = facilityName(seed.ownerId, seed.facilityId);

  const messages: ChatMessage[] = seed.messages.map((m) => ({
    id: `msg-${(messageSeq += 1)}`,
    conversationId: seed.id,
    senderType: m.from,
    senderId: m.from === 'owner' ? seed.ownerId : m.from === 'admin' ? 'admin' : undefined,
    senderName: m.from === 'owner' ? owner?.name : m.from === 'admin' ? m.adminName : undefined,
    senderRole: m.from === 'admin' ? (m.adminRole ?? 'admin') : undefined,
    senderPhotoUrl: m.from === 'owner' && owner?.photo ? avatar(owner.photo) : undefined,
    body: m.body ?? '',
    attachments: m.attachments ?? [],
    systemEventType: m.event,
    systemEventDetail: m.detail,
    deliveryStatus: 'delivered',
    createdAt: hoursAgo(m.at),
  }));

  const last = messages[messages.length - 1];
  const first = messages[0];

  return {
    conversation: {
      id: seed.id,
      category: seed.category,
      // CH6 — a review thread is titled by its facility; a support thread by its team.
      title: seed.category === 'facility_review' ? (name ?? '') : 'General support',
      owner: counterpart(seed.ownerId),
      facilityId: seed.facilityId,
      facilityName: name,
      regionId: owner?.regionId ?? null,
      regionNames: owner?.regionNames ?? [],
      isOrphan: (owner?.regionId ?? null) === null,
      status: seed.status,
      team: TEAM_KEY[seed.category],
      lastMessagePreview: previewOf(last),
      lastMessageAt: last.createdAt,
      lastMessageSender: last.senderType,
      unreadCount: seed.unreadCount,
      createdAt: first.createdAt,
      updatedAt: last.createdAt,
    },
    messages,
  };
}

/**
 * The rail preview. A system event has no body of its own, so it previews as its
 * event key and the rail translates it — the alternative, storing English prose
 * on the row, would not translate.
 */
function previewOf(message: ChatMessage): string {
  if (message.senderType === 'system') return `system:${message.systemEventType ?? 'status_changed'}`;
  if (message.body) return message.body;
  if (message.attachments.length > 0) return `attachment:${message.attachments.length}`;
  return '';
}

// ---------------------------------------------------------------------------
// Seeds — 11 threads across 5 live regions + 2 orphans, mixing both channels.
// ---------------------------------------------------------------------------

const THREAD_SEEDS: ThreadSeed[] = [
  // Damascus — a review thread mid-flight, waiting on the administration.
  {
    id: 'cv-701',
    ownerId: '300',
    category: 'facility_review',
    facilityId: 'f1',
    status: 'awaiting_admin',
    unreadCount: 2,
    messages: [
      { from: 'system', at: 54, event: 'request_submitted' },
      {
        from: 'owner',
        at: 53,
        body: 'Hello, I submitted Al-Baramkeh Sports Club for review yesterday. The two padel cages are already finished and the tennis court is resurfaced. Anything else you need from me?',
      },
      { from: 'system', at: 30, event: 'review_started' },
      {
        from: 'admin',
        at: 29,
        adminName: 'Sara Haddad',
        body: 'Thanks Fadi. The licence you uploaded expires next month — could you send the renewed one before we approve the club?',
      },
      {
        from: 'system',
        at: 29,
        event: 'document_requested',
        detail: 'Business licence (renewed)',
      },
      {
        from: 'owner',
        at: 6,
        body: 'Renewal came through this morning. Uploading it now.',
        attachments: [
          {
            id: 'att-1',
            name: 'business-licence-2026.pdf',
            url: 'https://example.com/uploads/business-licence-2026.pdf',
            type: 'document',
            sizeBytes: 284_120,
          },
        ],
      },
      {
        from: 'owner',
        at: 5,
        body: 'Also attaching a photo of the finished cages so you can see the nets are up.',
        attachments: [
          {
            id: 'att-2',
            name: 'padel-cages.jpg',
            url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900',
            type: 'image',
          },
        ],
      },
    ],
  },
  // Damascus — general support, answered, ball with the owner.
  {
    id: 'cv-702',
    ownerId: '309',
    category: 'general_support',
    status: 'awaiting_owner',
    unreadCount: 0,
    messages: [
      {
        from: 'owner',
        at: 76,
        body: 'The payouts page shows last month as pending but the money already reached my account. Is the dashboard behind?',
      },
      {
        from: 'admin',
        at: 74,
        adminName: 'Rana Suleiman',
        adminRole: 'super_admin',
        body: 'Hi Dina — the transfer cleared on our side too, the page just had not refreshed the settlement date. It should read "settled" now. Can you confirm?',
      },
    ],
  },
  // Aleppo — an approved facility; the system pill closes the story.
  {
    id: 'cv-703',
    ownerId: '308',
    category: 'facility_review',
    facilityId: 'f9',
    status: 'resolved',
    unreadCount: 0,
    messages: [
      { from: 'system', at: 200, event: 'request_submitted' },
      { from: 'system', at: 190, event: 'review_started' },
      {
        from: 'admin',
        at: 188,
        adminName: 'Omar Khoury',
        body: 'Everything checks out — the ownership proof and the tax certificate both match the licence. Approving the academy now.',
      },
      { from: 'system', at: 188, event: 'approved' },
      { from: 'owner', at: 187, body: 'Thank you! We will open bookings from Sunday.' },
    ],
  },
  // Aleppo — a live support thread with unread traffic.
  {
    id: 'cv-704',
    ownerId: '308',
    category: 'general_support',
    status: 'awaiting_admin',
    unreadCount: 1,
    messages: [
      {
        from: 'owner',
        at: 27,
        body: 'A player says the app charged them twice for a Citadel booking on Friday. Booking reference ends 4471. Can you check from your side?',
      },
      {
        from: 'admin',
        at: 26,
        adminName: 'Sara Haddad',
        body: 'Looking into it — I can see the duplicate authorisation. It should drop off automatically, but I will confirm with payments and come back to you today.',
      },
      { from: 'owner', at: 2, body: 'Any news? The player messaged me again this morning.' },
    ],
  },
  // Homs — a rejection, with the reason carried on the system pill.
  {
    id: 'cv-705',
    ownerId: '310',
    category: 'facility_review',
    facilityId: 'f11',
    status: 'closed',
    unreadCount: 0,
    messages: [
      { from: 'system', at: 320, event: 'request_submitted' },
      { from: 'system', at: 310, event: 'review_started' },
      {
        from: 'admin',
        at: 305,
        adminName: 'Sara Haddad',
        body: 'The address on the ownership document does not match the pitch location on the map. I have to decline this one for now — resubmit once the paperwork is corrected and we will look again straight away.',
      },
      {
        from: 'system',
        at: 305,
        event: 'rejected',
        detail: 'Ownership document address does not match the mapped location',
      },
    ],
  },
  // Homs — quiet, healthy support thread.
  {
    id: 'cv-706',
    ownerId: '310',
    category: 'general_support',
    status: 'open',
    unreadCount: 0,
    messages: [
      {
        from: 'owner',
        at: 120,
        body: 'Is there a way to set a different price for weekends without creating a second court?',
      },
      {
        from: 'admin',
        at: 118,
        adminName: 'Omar Khoury',
        body: 'Yes — Manage facility → Pricing rules lets you add a weekend rule on the same court. It overrides the base price for the days you pick.',
      },
      { from: 'owner', at: 117, body: 'Found it, thanks.' },
    ],
  },
  // Latakia — the busiest thread, and the one with the most recent activity.
  {
    id: 'cv-707',
    ownerId: '303',
    category: 'facility_review',
    facilityId: 'f16',
    status: 'awaiting_admin',
    unreadCount: 3,
    messages: [
      { from: 'system', at: 12, event: 'request_submitted' },
      {
        from: 'owner',
        at: 11,
        body: 'Submitted Latakia Coastal Pitch. It is the third venue under the same company, so the documents are identical to the ones already approved for Tishreen Annex.',
      },
      { from: 'system', at: 9, event: 'review_started' },
      {
        from: 'admin',
        at: 8,
        adminName: 'Sara Haddad',
        body: 'Noted — I can reuse the company file. One question: the working hours end at 02:00, is that intentional?',
      },
      { from: 'owner', at: 3, body: 'Yes, the pitch is floodlit and we run late five-a-side leagues through the summer.' },
      { from: 'owner', at: 2, body: 'Happy to cap it at midnight if that is a problem for the platform.' },
      { from: 'owner', at: 1, body: 'Let me know either way and I will adjust before the weekend.' },
    ],
  },
  // Latakia — support, resolved.
  {
    id: 'cv-708',
    ownerId: '311',
    category: 'general_support',
    status: 'resolved',
    unreadCount: 0,
    messages: [
      {
        from: 'owner',
        at: 150,
        body: 'Two of my members show as expired although they paid in cash last week. I recorded the payments in the app.',
      },
      {
        from: 'admin',
        at: 148,
        adminName: 'Rana Suleiman',
        adminRole: 'super_admin',
        body: 'The payments were logged against the old plan, which had already ended. I moved them onto the current plan — both memberships are active again.',
      },
      { from: 'owner', at: 147, body: 'Confirmed on my side. Appreciated.' },
    ],
  },
  // Tartus — a facility the owner suspended themselves; procedural thread.
  {
    id: 'cv-709',
    ownerId: '304',
    category: 'facility_review',
    facilityId: 'f20',
    status: 'open',
    unreadCount: 1,
    messages: [
      { from: 'system', at: 46, event: 'status_changed' },
      {
        from: 'owner',
        at: 45,
        body: 'I paused Arwad View for renovations. Do I need to resubmit it for review when I reopen, or does it come back automatically?',
      },
      {
        from: 'admin',
        at: 44,
        adminName: 'Omar Khoury',
        body: 'It comes back automatically — the approval stays valid. Just switch it back on from the owner app when the work is done.',
      },
      { from: 'owner', at: 4, body: 'Perfect. We should be finished in about three weeks.' },
    ],
  },
  // ORPHAN: Hama (c5) is inactive -> super-admin only.
  {
    id: 'cv-710',
    ownerId: '306',
    category: 'general_support',
    status: 'awaiting_admin',
    unreadCount: 1,
    messages: [
      {
        from: 'owner',
        at: 70,
        body: 'My account was suspended and I have uploaded the updated tax certificate twice. Could someone take a look?',
      },
      {
        from: 'admin',
        at: 68,
        adminName: 'Rana Suleiman',
        adminRole: 'super_admin',
        body: 'I can see both uploads. They are with the verification team — I will chase it and update you here.',
      },
      { from: 'owner', at: 20, body: 'Any progress? The club has been closed for a fortnight now.' },
    ],
  },
  // ORPHAN: Idlib (c7) is inactive -> super-admin only.
  {
    id: 'cv-711',
    ownerId: '312',
    category: 'facility_review',
    facilityId: 'f12',
    status: 'awaiting_owner',
    unreadCount: 0,
    messages: [
      { from: 'system', at: 260, event: 'request_submitted' },
      { from: 'system', at: 250, event: 'review_started' },
      {
        from: 'admin',
        at: 249,
        adminName: 'Sara Haddad',
        body: 'The court photos are too dark to verify the surface. Could you send a few taken during the day?',
      },
      { from: 'system', at: 249, event: 'document_requested', detail: 'Daytime court photos' },
    ],
  },
];

const built = THREAD_SEEDS.map(buildThread);

// Start minting ids ABOVE every seeded one, so a thread added to the fixture can
// never be shadowed by a freshly created conversation.
conversationSeq = THREAD_SEEDS.reduce(
  (max, seed) => Math.max(max, Number(seed.id.replace(/\D/g, '')) || 0),
  0,
);

/** Deep copy so a mutation can never write through into the immutable seed row. */
function cloneConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    owner: { ...conversation.owner },
    regionNames: [...conversation.regionNames],
  };
}

function cloneMessage(message: ChatMessage): ChatMessage {
  return { ...message, attachments: message.attachments.map((a) => ({ ...a })) };
}

const conversations: Conversation[] = built.map((t) => cloneConversation(t.conversation));
/** conversationId -> messages, oldest first. */
const threads = new Map<string, ChatMessage[]>(
  built.map((t) => [t.conversation.id, t.messages.map(cloneMessage)]),
);

// ---------------------------------------------------------------------------
// Live transport (mock)
// ---------------------------------------------------------------------------

const listeners = new Set<(event: ChatStreamEvent) => void>();
/** Timers scheduled by the reply simulation — cleared when the last listener leaves. */
const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

function emit(event: ChatStreamEvent): void {
  for (const listener of listeners) listener(event);
}

function later(fn: () => void, ms: number): void {
  const id = setTimeout(() => {
    pendingTimers.delete(id);
    fn();
  }, ms);
  pendingTimers.add(id);
}

/**
 * Mirrors `subscribeToChat` in chat.api.ts. Without a server there is nothing to
 * stream, so the mock plays the counterpart: after the admin answers, the owner
 * "types" and then replies. That is what makes the live half of the feature —
 * the typing indicator, the arriving bubble, the rail re-ordering — actually
 * demonstrable before the backend is wired.
 */
export function subscribeToChat(handler: (event: ChatStreamEvent) => void): ChatStreamUnsubscribe {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
    if (listeners.size === 0) {
      for (const id of pendingTimers) clearTimeout(id);
      pendingTimers.clear();
    }
  };
}

/** Canned owner answers, picked round-robin so a demo conversation stays varied. */
const OWNER_REPLIES = [
  'Understood, thank you. I will take care of it today.',
  'That makes sense — I have updated it on my side.',
  'Got it. Anything else you need from me before this is approved?',
  'Thanks for the quick answer, that clears it up.',
  'Noted. I will send the remaining document this afternoon.',
];
let replyIndex = 0;

/**
 * Play the counterpart after an admin message: a typing signal, then an answer.
 * Skipped for terminal threads — a closed conversation must stay closed.
 */
function simulateOwnerReply(conversation: Conversation): void {
  if (conversation.status === 'closed' || conversation.status === 'resolved') return;
  if (listeners.size === 0) return;

  later(() => emit({ type: 'typing', conversationId: conversation.id, senderType: 'owner' }), 1400);
  later(() => {
    const thread = threads.get(conversation.id);
    const target = conversations.find((c) => c.id === conversation.id);
    if (!thread || !target) return;

    const owner = ownerById.get(target.owner.id);
    const message: ChatMessage = {
      id: `msg-${(messageSeq += 1)}`,
      conversationId: target.id,
      senderType: 'owner',
      senderId: target.owner.id,
      senderName: target.owner.name,
      senderPhotoUrl: owner?.photo ? avatar(owner.photo) : undefined,
      body: OWNER_REPLIES[replyIndex++ % OWNER_REPLIES.length],
      attachments: [],
      deliveryStatus: 'delivered',
      createdAt: new Date().toISOString(),
    };
    thread.push(message);

    target.lastMessagePreview = message.body;
    target.lastMessageAt = message.createdAt;
    target.lastMessageSender = 'owner';
    target.updatedAt = message.createdAt;
    target.status = 'awaiting_admin';
    target.unreadCount += 1;

    emit({ type: 'message', conversationId: target.id });
  }, 4200);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Find a thread the CURRENT scope is allowed to touch. Out-of-scope reads and
 * writes both fail as "not found" rather than "forbidden", so a regional admin
 * cannot probe for another region's threads by id.
 */
async function findVisible(id: string): Promise<Conversation> {
  const scope = await currentScope();
  const conversation = conversations.find((item) => item.id === id);
  // The exact phrasing matters: isNotFoundError() matches /\bnot found\.?$/i.
  if (!conversation || !isConversationVisible(conversation, scope)) {
    throw new Error('Conversation not found');
  }
  return conversation;
}

export async function getConversations(
  params: ConversationListParams,
): Promise<ConversationListResult> {
  await mockDelay();
  return filterAndPaginateConversations(conversations, params, await currentScope());
}

export async function getChatStats(): Promise<ChatStats> {
  await mockDelay();
  return computeChatStats(conversations, await currentScope());
}

export async function getConversationById(id: string): Promise<Conversation> {
  await mockDelay(250);
  const scope = await currentScope();
  return projectMembership(cloneConversation(await findVisible(id)), scope);
}

export async function getMessages(
  conversationId: string,
  opts: { before?: string; limit?: number } = {},
): Promise<MessagePage> {
  await mockDelay(300);
  await findVisible(conversationId);
  const all = threads.get(conversationId) ?? [];
  const limit = opts.limit ?? 50;
  const cutoff = opts.before ? Date.parse(opts.before) : Number.POSITIVE_INFINITY;
  const older = all.filter((message) => Date.parse(message.createdAt) < cutoff);
  const window = older.slice(Math.max(0, older.length - limit));
  return { messages: window.map(cloneMessage), hasMore: window.length < older.length };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** FR-ADM-CHAT-003 — append a TEXT message from the administration (CH3). */
export async function sendMessage(
  conversationId: string,
  input: SendMessageInput,
): Promise<ChatMessage> {
  await mockDelay(320);
  const conversation = await findVisible(conversationId);
  const body = input.body.trim();
  const now = new Date().toISOString();

  const message: ChatMessage = {
    id: `msg-${(messageSeq += 1)}`,
    conversationId,
    senderType: 'admin',
    ...currentAdmin(),
    body,
    attachments: [],
    deliveryStatus: 'sent',
    createdAt: now,
  };
  threads.get(conversationId)?.push(message);

  conversation.lastMessagePreview = body;
  conversation.lastMessageAt = now;
  conversation.lastMessageSender = 'admin';
  conversation.updatedAt = now;
  conversation.unreadCount = 0;
  // A reply revives a resolved thread and flips the ball to the owner, matching
  // how feedback treats an answer on a closed item.
  if (conversation.status !== 'closed') conversation.status = statusAfterAdminReply();

  simulateOwnerReply(conversation);
  return cloneMessage(message);
}

/** FR-ADM-CHAT-002 — opening the thread clears the administration's unread count. */
export async function markConversationRead(conversationId: string): Promise<void> {
  const conversation = await findVisible(conversationId);
  if (conversation.unreadCount === 0) return;
  conversation.unreadCount = 0;
  emit({ type: 'read', conversationId });
}

/** FR-ADM-CHAT-003 — resolve-or-create the thread for (owner, category[, facility]). */
export async function startConversation(input: StartConversationInput): Promise<Conversation> {
  await mockDelay();
  const scope = await currentScope();
  const owner = ownerById.get(input.ownerId);
  if (!owner) throw new Error('Owner not found');
  if (applyOwnerScope([toOwnerOption(owner)], scope).length === 0) {
    throw new Error('Owner not found');
  }

  const existing = conversations.find(
    (item) =>
      item.owner.id === input.ownerId &&
      item.category === input.category &&
      (input.category === 'general_support' || item.facilityId === input.facilityId),
  );
  if (existing) return projectMembership(cloneConversation(existing), scope);

  const now = new Date().toISOString();
  const name = facilityName(input.ownerId, input.facilityId);
  const conversation: Conversation = {
    id: `cv-${(conversationSeq += 1)}`,
    category: input.category,
    title: input.category === 'facility_review' ? (name ?? '') : 'General support',
    owner: counterpart(input.ownerId),
    facilityId: input.facilityId,
    facilityName: name,
    regionId: owner.regionId,
    regionNames: [...owner.regionNames],
    isOrphan: owner.regionId === null,
    status: 'open',
    team: TEAM_KEY[input.category],
    lastMessagePreview: '',
    lastMessageAt: now,
    lastMessageSender: null,
    unreadCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  conversations.unshift(conversation);
  threads.set(conversation.id, []);
  return projectMembership(cloneConversation(conversation), scope);
}

function toOwnerOption(owner: OwnerSeed): ChatOwnerOption {
  return {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    photoUrl: owner.photo ? avatar(owner.photo) : undefined,
    city: owner.city,
    regionId: owner.regionId,
    regionNames: [...owner.regionNames],
    facilities: owner.facilities.map((facility) => ({ ...facility })),
  };
}

export async function getChatOwnerOptions(): Promise<ChatOwnerOption[]> {
  await mockDelay();
  const scope = await currentScope();
  return applyOwnerScope(OWNERS.map(toOwnerOption), scope).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
