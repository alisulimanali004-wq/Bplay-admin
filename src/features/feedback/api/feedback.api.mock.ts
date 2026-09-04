import { mockDelay } from '@shared/lib/mock';
import { useAuthStore } from '@shared/stores/authStore';
import { getScopeRegions } from '@features/region-management/api';
import {
  computeFeedbackStats,
  filterAndPaginateFeedback,
  isFeedbackVisible,
  projectMembership,
  type FeedbackScope,
} from './feedback.filter';
import { statusAfterReopen, statusAfterReply } from './feedback.types';
import type {
  Feedback,
  FeedbackListParams,
  FeedbackListResult,
  FeedbackStats,
  ReplyFeedbackInput,
} from './feedback.types';

/**
 * In-memory inbox: replying, closing and reopening really mutate it, so a refetch
 * reflects the change. State lives for the session and resets on reload.
 *
 * The senders are the players seeded in player-management, with their region
 * resolved the way the backend will have to resolve it:
 *   c1 Damascus · c2 Aleppo · c3 Homs · c4 Latakia · c6 Tartus.
 * Daraa has no region record, and Hama (c5) / Idlib (c7) are inactive, so those
 * senders are ORPHANS — visible to a super-admin only. That is not padding: it is
 * the case a regional-scope bug leaks, so it has to exist in the fixture.
 *
 * The content is deliberately ORDINARY. Hostile payloads (script tags in a body,
 * `javascript:` attachment URLs) belong in a test, not in the data a stakeholder
 * opens — the defences live in the code that renders them: sender text is a JSX
 * text node, and every attachment URL passes `safeHttpUrl()` before it can reach
 * an `src`/`href`.
 */

let replySeq = 500;

/**
 * The scope is read outside React, exactly like apiClient reads the token. The
 * live region set is re-read every time so deactivating a region revokes access
 * on the next request instead of on the next deploy.
 */
async function currentScope(): Promise<FeedbackScope> {
  const { role, user } = useAuthStore.getState();
  const regions = await getScopeRegions();
  return {
    role,
    assignedRegionIds: user?.assignedRegionIds,
    activeRegionIds: new Set(regions.filter((region) => region.isActive).map((region) => region.id)),
  };
}

const SEEDS: Feedback[] = [
  {
    id: 'fb-1001',
    sender: {
      id: 'pl-1',
      type: 'player',
      name: 'Yara Ibrahim',
      email: 'yara.ibrahim@bplay.app',
      photoUrl: 'https://i.pravatar.cc/512?img=20',
      city: 'Damascus',
    },
    kind: 'complaint',
    body: 'I booked a padel court at Qasioun Heights for 7pm and the lights were off when I arrived. The staff said the timer was set wrong. I had to leave after 20 minutes and nobody offered a refund.',
    attachments: [
      {
        id: 'at-1',
        name: 'court-lights.jpg',
        url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900',
        kind: 'image',
      },
    ],
    status: 'new',
    regionId: 'c1',
    regionNames: ['Damascus'],
    isOrphan: false,
    replies: [],
    replyCount: 0,
    createdAt: '2026-07-27T18:42:00.000Z',
    updatedAt: '2026-07-27T18:42:00.000Z',
  },
  {
    id: 'fb-1002',
    sender: {
      id: 'ow-3',
      type: 'owner',
      name: 'Rami Haddad',
      email: 'rami.haddad@bplay.app',
      city: 'Aleppo',
    },
    kind: 'suggestion',
    body: 'Could you add a way to block a whole day from the owner calendar? During Ramadan we close in the afternoon and right now I have to cancel each slot one by one.',
    attachments: [],
    status: 'replied',
    regionId: 'c2',
    regionNames: ['Aleppo'],
    isOrphan: false,
    replies: [
      {
        id: 'rp-1',
        body: 'Thanks Rami — a full-day closure is on the roadmap for the next owner release. In the meantime you can set the working hours to closed for that date from Manage facility → Working hours.',
        authorId: 'ad-2',
        authorName: 'Omar Khoury',
        authorRole: 'admin',
        createdAt: '2026-07-26T09:15:00.000Z',
      },
    ],
    replyCount: 1,
    createdAt: '2026-07-25T11:05:00.000Z',
    updatedAt: '2026-07-26T09:15:00.000Z',
  },
  {
    id: 'fb-1003',
    sender: {
      id: 'pl-4',
      type: 'player',
      name: 'Omar Nasr',
      email: 'omar.nasr@bplay.app',
      photoUrl: 'https://i.pravatar.cc/512?img=51',
      city: 'Homs',
    },
    kind: 'note',
    body: 'The new booking screen is much faster than before. Just wanted to say thanks.',
    attachments: [],
    status: 'closed',
    regionId: 'c3',
    regionNames: ['Homs'],
    isOrphan: false,
    replies: [
      {
        id: 'rp-2',
        body: 'Much appreciated, Omar — passed it on to the team.',
        authorId: 'ad-1',
        authorName: 'Sara Haddad',
        authorRole: 'admin',
        createdAt: '2026-07-20T13:00:00.000Z',
      },
    ],
    replyCount: 1,
    createdAt: '2026-07-19T20:30:00.000Z',
    updatedAt: '2026-07-21T08:10:00.000Z',
    closedAt: '2026-07-21T08:10:00.000Z',
    closedByName: 'Sara Haddad',
  },
  {
    id: 'fb-1004',
    sender: {
      id: 'pl-5',
      type: 'player',
      name: 'Sara Deeb',
      email: 'sara.deeb@bplay.app',
      photoUrl: 'https://i.pravatar.cc/512?img=47',
      city: 'Latakia',
    },
    kind: 'complaint',
    body: 'I was charged twice for the same monthly subscription at Aqua Fitness Club. The invoice screen shows both payments. Please refund one of them.',
    attachments: [
      {
        id: 'at-2',
        name: 'invoice-july.pdf',
        url: 'https://example.com/uploads/invoice-july.pdf',
        kind: 'pdf',
      },
      {
        id: 'at-3',
        name: 'bank-sms.jpg',
        url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900',
        kind: 'image',
      },
    ],
    status: 'new',
    regionId: 'c4',
    regionNames: ['Latakia'],
    isOrphan: false,
    replies: [],
    replyCount: 0,
    createdAt: '2026-07-28T07:12:00.000Z',
    updatedAt: '2026-07-28T07:12:00.000Z',
  },
  {
    id: 'fb-1005',
    sender: {
      id: 'ow-7',
      type: 'owner',
      name: 'Nadia Sabbagh',
      email: 'nadia.sabbagh@bplay.app',
      city: 'Damascus',
    },
    kind: 'complaint',
    body: 'A player left a review about a facility that is not mine. I replied asking them to check, but the review is still on my page. Can you look into it?',
    attachments: [],
    status: 'new',
    regionId: 'c1',
    regionNames: ['Damascus'],
    isOrphan: false,
    replies: [],
    replyCount: 0,
    createdAt: '2026-07-28T15:55:00.000Z',
    updatedAt: '2026-07-28T15:55:00.000Z',
  },
  {
    id: 'fb-1006',
    sender: {
      id: 'pl-15',
      type: 'player',
      name: 'Lina Kassem',
      email: 'lina.kassem@bplay.app',
      photoUrl: 'https://i.pravatar.cc/512?img=25',
      city: 'Tartus',
    },
    kind: 'suggestion',
    body: 'Please let us filter courts by whether they are covered. In winter it is the only thing that matters and I keep booking the wrong one.',
    attachments: [],
    status: 'replied',
    regionId: 'c6',
    regionNames: ['Tartus'],
    isOrphan: false,
    replies: [
      {
        id: 'rp-3',
        body: 'Good idea — a covered/uncovered filter is being added to the search screen. Thanks for writing in.',
        authorId: 'ad-5',
        authorName: 'Rana Suleiman',
        authorRole: 'super_admin',
        createdAt: '2026-07-24T10:40:00.000Z',
      },
    ],
    replyCount: 1,
    createdAt: '2026-07-23T17:20:00.000Z',
    updatedAt: '2026-07-24T10:40:00.000Z',
  },
  {
    // ORPHAN: Daraa has no region record at all -> super-admin only.
    id: 'fb-1007',
    sender: {
      id: 'pl-11',
      type: 'player',
      name: 'Rima Saab',
      email: 'rima.saab@bplay.app',
      photoUrl: 'https://i.pravatar.cc/512?img=9',
      city: 'Daraa',
    },
    kind: 'note',
    body: 'There are no facilities near me in Daraa. Are you planning to add any this year?',
    attachments: [],
    status: 'new',
    regionId: null,
    regionNames: [],
    isOrphan: true,
    replies: [],
    replyCount: 0,
    createdAt: '2026-07-26T12:00:00.000Z',
    updatedAt: '2026-07-26T12:00:00.000Z',
  },
  {
    // ORPHAN: Hama (c5) exists but is inactive, so it scopes nothing.
    id: 'fb-1008',
    sender: {
      id: 'pl-9',
      type: 'player',
      name: 'Maya Suleiman',
      email: 'maya.suleiman@bplay.app',
      photoUrl: 'https://i.pravatar.cc/512?img=45',
      city: 'Hama',
    },
    kind: 'complaint',
    body: 'My account was blocked and I do not know why. I would like to understand what happened.',
    attachments: [],
    status: 'closed',
    regionId: null,
    regionNames: [],
    isOrphan: true,
    replies: [],
    replyCount: 0,
    createdAt: '2026-07-15T09:00:00.000Z',
    updatedAt: '2026-07-16T11:30:00.000Z',
    closedAt: '2026-07-16T11:30:00.000Z',
    closedByName: 'Rana Suleiman',
  },
  {
    id: 'fb-1009',
    sender: {
      id: 'pl-2',
      type: 'player',
      name: 'Kareem Saleh',
      email: 'kareem.saleh@bplay.app',
      photoUrl: 'https://i.pravatar.cc/512?img=12',
      city: 'Aleppo',
    },
    kind: 'note',
    body: 'When I open a pitch from search, the map does not centre on it — I have to zoom out every time to find where it actually is in Aleppo.',
    attachments: [],
    status: 'new',
    regionId: 'c2',
    regionNames: ['Aleppo'],
    isOrphan: false,
    replies: [],
    replyCount: 0,
    createdAt: '2026-07-29T08:05:00.000Z',
    updatedAt: '2026-07-29T08:05:00.000Z',
  },
  {
    id: 'fb-1010',
    sender: {
      id: 'ow-11',
      type: 'owner',
      name: 'Fadi Barakat',
      email: 'fadi.barakat.o@bplay.app',
      city: 'Homs',
    },
    kind: 'suggestion',
    body: 'It would help a lot to export the members list to Excel from the owner app, the way the dashboard does.',
    attachments: [],
    status: 'replied',
    regionId: 'c3',
    regionNames: ['Homs'],
    isOrphan: false,
    replies: [
      {
        id: 'rp-4',
        body: 'Noted — export is planned for the owner app. For now the web dashboard export covers the same columns.',
        authorId: 'ad-1',
        authorName: 'Sara Haddad',
        authorRole: 'admin',
        createdAt: '2026-07-22T14:05:00.000Z',
      },
      {
        id: 'rp-5',
        body: 'Update: it is scheduled for the next release. Thanks for the nudge.',
        authorId: 'ad-1',
        authorName: 'Sara Haddad',
        authorRole: 'admin',
        createdAt: '2026-07-27T09:30:00.000Z',
      },
    ],
    replyCount: 2,
    createdAt: '2026-07-21T16:45:00.000Z',
    updatedAt: '2026-07-27T09:30:00.000Z',
  },
  {
    id: 'fb-1011',
    sender: {
      id: 'pl-13',
      type: 'player',
      name: 'Dina Rahal',
      email: 'dina.rahal@bplay.app',
      photoUrl: 'https://i.pravatar.cc/512?img=44',
      city: 'Latakia',
    },
    kind: 'note',
    body: 'The Arabic translation on the booking summary screen says "الحجز" twice. Small thing but it looks odd.',
    attachments: [],
    status: 'new',
    regionId: 'c4',
    regionNames: ['Latakia'],
    isOrphan: false,
    replies: [],
    replyCount: 0,
    createdAt: '2026-07-29T19:10:00.000Z',
    updatedAt: '2026-07-29T19:10:00.000Z',
  },
  {
    id: 'fb-1012',
    sender: {
      id: 'pl-7',
      type: 'player',
      name: 'Nour Aziz',
      email: 'nour.aziz@bplay.app',
      photoUrl: 'https://i.pravatar.cc/512?img=5',
      city: 'Damascus',
    },
    kind: 'complaint',
    body: 'I keep getting notifications for a club I unsubscribed from months ago. Turning notifications off in settings does not stop them.',
    attachments: [],
    status: 'replied',
    regionId: 'c1',
    regionNames: ['Damascus'],
    isOrphan: false,
    replies: [
      {
        id: 'rp-6',
        body: 'Sorry about that — we found a stale subscription record on our side and cleared it. You should not receive those any more.',
        authorId: 'ad-2',
        authorName: 'Omar Khoury',
        authorRole: 'admin',
        createdAt: '2026-07-18T12:20:00.000Z',
      },
    ],
    replyCount: 1,
    createdAt: '2026-07-17T21:00:00.000Z',
    updatedAt: '2026-07-18T12:20:00.000Z',
  },
  // The `technical` kind: an owner-filed bug report carrying the app version and
  // OS the mobile app attached at submit time. It exists so the device-context
  // row on the detail page has data behind it without having to file one first.
  {
    id: 'fb-1013',
    sender: {
      id: 'ow-2',
      type: 'owner',
      name: 'Lina Nasser',
      email: 'lina.nasser@bplay.app',
      city: 'Latakia',
    },
    kind: 'technical',
    body: 'The bookings calendar goes blank when I switch facilities twice in a row. I have to close the app and open it again to get it back.',
    attachments: [],
    status: 'new',
    regionId: 'c4',
    regionNames: ['Latakia'],
    isOrphan: false,
    replies: [],
    replyCount: 0,
    deviceContext: {
      appVersion: '1.0.0',
      platform: 'android',
      osVersion: 'Android 14 (build UP1A.231005.007)',
    },
    createdAt: '2026-07-28T08:15:00.000Z',
    updatedAt: '2026-07-28T08:15:00.000Z',
  },
];

/** Deep copy so a mutation can never write through into the immutable seed row. */
function clone(feedback: Feedback): Feedback {
  return {
    ...feedback,
    sender: { ...feedback.sender },
    attachments: feedback.attachments.map((item) => ({ ...item })),
    regionNames: [...feedback.regionNames],
    replies: feedback.replies.map((reply) => ({ ...reply })),
    // Nested object: the shallow spread above would share the seed's reference.
    deviceContext: feedback.deviceContext ? { ...feedback.deviceContext } : undefined,
  };
}

const db: Feedback[] = SEEDS.map(clone);

/**
 * Find an item the CURRENT scope is allowed to touch. Out-of-scope reads and
 * writes both fail as "not found" rather than "forbidden", so a regional admin
 * cannot probe for the existence of another region's feedback by id.
 */
async function findVisible(id: string): Promise<Feedback> {
  const scope = await currentScope();
  const feedback = db.find((item) => item.id === id);
  // The exact phrasing matters: isNotFoundError() matches /\bnot found\.?$/i.
  if (!feedback || !isFeedbackVisible(feedback, scope)) throw new Error('Feedback not found');
  return feedback;
}

/** The signed-in admin, as the author of a reply. */
function currentAuthor(): Pick<Feedback['replies'][number], 'authorId' | 'authorName' | 'authorRole'> {
  const { role, user } = useAuthStore.getState();
  return {
    authorId: user?.email ?? 'admin',
    authorName: user?.name ?? user?.email?.split('@')[0] ?? 'Admin',
    authorRole: role ?? 'admin',
  };
}

export async function getFeedbackList(params: FeedbackListParams): Promise<FeedbackListResult> {
  await mockDelay();
  return filterAndPaginateFeedback(db, params, await currentScope());
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  await mockDelay();
  return computeFeedbackStats(db, await currentScope());
}

export async function getFeedbackById(id: string): Promise<Feedback> {
  await mockDelay();
  const scope = await currentScope();
  return projectMembership(clone(await findVisible(id)), scope);
}

/**
 * FR-ADM-FEED-003 — append an answer. Replies accumulate (never overwrite), the
 * item moves to "replied", and a closed item is reopened by the reply.
 * The sender is notified by the backend; see the contract note in feedback.api.ts.
 */
export async function replyToFeedback(id: string, input: ReplyFeedbackInput): Promise<Feedback> {
  await mockDelay();
  const feedback = await findVisible(id);
  const now = new Date().toISOString();
  feedback.replies.push({
    id: `rp-${(replySeq += 1)}`,
    body: input.body.trim(),
    ...currentAuthor(),
    createdAt: now,
  });
  feedback.replyCount = feedback.replies.length;
  feedback.status = statusAfterReply();
  feedback.closedAt = undefined;
  feedback.closedByName = undefined;
  feedback.updatedAt = now;
  return clone(feedback);
}

/** FR-ADM-FEED-004 — close, manually. */
export async function closeFeedback(id: string): Promise<Feedback> {
  await mockDelay();
  const feedback = await findVisible(id);
  const now = new Date().toISOString();
  feedback.status = 'closed';
  feedback.closedAt = now;
  feedback.closedByName = currentAuthor().authorName;
  feedback.updatedAt = now;
  return clone(feedback);
}

/** FR-ADM-FEED-004 — reopen: back to "replied" if it was ever answered, else "new". */
export async function reopenFeedback(id: string): Promise<Feedback> {
  await mockDelay();
  const feedback = await findVisible(id);
  const now = new Date().toISOString();
  feedback.status = statusAfterReopen(feedback);
  feedback.closedAt = undefined;
  feedback.closedByName = undefined;
  feedback.updatedAt = now;
  return clone(feedback);
}
