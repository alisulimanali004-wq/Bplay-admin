import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import { useAuthStore } from '@shared/stores/authStore';
import { getScopeRegions } from '@features/region-management/api';
import {
  filterAndPaginateFeedback,
  isFeedbackVisible,
  type FeedbackScope,
} from './feedback.filter';
import { toFeedback } from './feedback.types';
import type {
  Feedback,
  FeedbackDto,
  FeedbackListParams,
  FeedbackListResult,
  FeedbackStats,
  ReplyFeedbackInput,
} from './feedback.types';

/**
 * FEEDBACK — the live source (SRS module 10).
 *
 * ── BACKEND CONTRACT ──────────────────────────────────────────────────────────
 * Nothing feedback-related exists in bplay-backend yet: there is no table, no
 * module and no route. These are the endpoints this slice is written against.
 *
 *   GET    /admin/feedback              list      → { items | feedback: FeedbackDto[] }
 *   GET    /admin/feedback/stats        counters  → FeedbackStats over the CALLER'S scope
 *   GET    /admin/feedback/{id}         detail    → FeedbackDto incl. `replies`
 *   POST   /admin/feedback/{id}/replies reply     → the updated FeedbackDto
 *   PATCH  /admin/feedback/{id}/status  {status}  → the updated FeedbackDto
 *
 * The sender side (players + owners in the app) still has to be built too: there
 * is no submit endpoint, and `NotificationType` in the mobile app has no value
 * for "an admin answered your feedback" — FR-ADM-FEED-003 needs one added, with
 * a deep-link subject so the tap opens the item.
 *
 * ── SECURITY OBLIGATIONS ON THE BACKEND ───────────────────────────────────────
 * The scope filter in feedback.filter.ts runs in the browser and is defence in
 * depth ONLY. The server must, from the caller's JWT and never from a request
 * parameter:
 *   1. restrict the list to the caller's regions (a regional admin must not
 *      receive out-of-region rows at all — today's other slices fetch everything
 *      and filter client-side, which leaks the whole platform to the browser);
 *   2. return 404 — not 403 — for an out-of-scope id, so ids cannot be probed;
 *   3. re-check scope on every write (reply / close / reopen);
 *   4. rate-limit the public submit endpoint and cap attachment count and size;
 *   5. serve attachments from a separate origin with an authorization check —
 *      an uploaded file must never be able to read this dashboard's session;
 *   6. write an audit row per reply and per status change (SRS §2ب, module 04).
 */

const PATH = '/admin/feedback';

/**
 * The scope is read outside React, exactly like apiClient reads the token. The
 * live region set is re-read every time so deactivating or deleting a region
 * revokes access on the next request.
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

/** Refuse an out-of-scope row as "not found", so an id is never confirmed. */
function assertVisible(feedback: Feedback, scope: FeedbackScope): Feedback {
  if (!isFeedbackVisible(feedback, scope)) throw new Error('Feedback not found');
  return feedback;
}

/** Bounded working set for client-side filtering — an explicit, visible cap. */
const WORKING_SET = 2000;
/**
 * PAGINATION: client-side, and applied exactly ONCE.
 *
 * The local pipeline still applies the region scope after the fetch, and either can drop rows —
 * so paginating on the server first would return "page 2 of N" and then filter
 * it down, leaving the count, the page boundaries and the rows disagreeing.
 *
 * The bug this replaces was paginating TWICE: page/pageSize were forwarded to
 * the server AND the returned page was sliced again locally, so page 2 asked
 * the server for rows 6-10 and then sliced that 5-element array from index 5 —
 * a blank table.
 *
 * Page params are therefore stripped from the request and a bounded working set
 * is fetched instead.
 */
export async function getFeedbackList(params: FeedbackListParams): Promise<FeedbackListResult> {
  const { page: _p, pageSize: _ps, ...serverParams } = params;
  const [res, scope] = await Promise.all([
    apiClient.get(PATH, { params: { ...serverParams, pageSize: WORKING_SET } }),
    currentScope(),
  ]);
  const all = unwrapList<FeedbackDto>(res.data, ['feedback', 'items']).map(toFeedback);
  return filterAndPaginateFeedback(all, params, scope);
}

/**
 * `/stats` returns the counters ALREADY scoped to the caller — it is an object,
 * not a list, and the server's numbers are authoritative.
 */
export async function getFeedbackStats(): Promise<FeedbackStats> {
  const res = await apiClient.get(`${PATH}/stats`);
  const dto = unwrap<Partial<FeedbackStats>>(res.data);
  return {
    total: dto.total ?? 0,
    new: dto.new ?? 0,
    replied: dto.replied ?? 0,
    closed: dto.closed ?? 0,
  };
}

export async function getFeedbackById(id: string): Promise<Feedback> {
  const [res, scope] = await Promise.all([apiClient.get(`${PATH}/${id}`), currentScope()]);
  // Belt and braces: if the server ever returns an out-of-scope row, refuse it here too.
  return assertVisible(toFeedback(unwrap<FeedbackDto>(res.data)), scope);
}

export async function replyToFeedback(id: string, input: ReplyFeedbackInput): Promise<Feedback> {
  const [res, scope] = await Promise.all([
    apiClient.post(`${PATH}/${id}/replies`, { body: input.body }),
    currentScope(),
  ]);
  return assertVisible(toFeedback(unwrap<FeedbackDto>(res.data)), scope);
}

export async function closeFeedback(id: string): Promise<Feedback> {
  const [res, scope] = await Promise.all([
    apiClient.patch(`${PATH}/${id}/status`, { status: 'closed' }),
    currentScope(),
  ]);
  return assertVisible(toFeedback(unwrap<FeedbackDto>(res.data)), scope);
}

/**
 * Reopen. The resulting status ("new" vs "replied") is decided by the SERVER from
 * the item's own reply history — the client must not dictate it.
 */
export async function reopenFeedback(id: string): Promise<Feedback> {
  const [res, scope] = await Promise.all([
    apiClient.patch(`${PATH}/${id}/status`, { status: 'reopen' }),
    currentScope(),
  ]);
  return assertVisible(toFeedback(unwrap<FeedbackDto>(res.data)), scope);
}
