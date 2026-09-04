import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import { getFacilities } from '@features/facility-management/api';
import {
  buildBookingListResult,
  buildFacilityScopeIndex,
  type FacilityScopeIndex,
} from './booking.filter';
import {
  toBooking,
  BOOKING_SPORT_WIRE_NAME,
  type Booking,
  type BookingDto,
  type BookingListParams,
  type BookingListResult,
  type BookingStats,
} from './booking.types';

const BASE = '/admin/bookings';

/**
 * The scope oracle: the caller's already-scoped facility list, indexed. Bookings
 * are then filtered/projected against it client-side (mirrors facility-management).
 */
async function scopeIndex(): Promise<FacilityScopeIndex> {
  const { items } = await getFacilities({ page: 1, pageSize: 1000 });
  return buildFacilityScopeIndex(items);
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
/**
 * The querystring the server will actually accept.
 *
 * Blank and 'all' values are OMITTED, never sent. Spreading the UI's filter
 * state straight onto the request broke this list five different ways, and the
 * two failure modes are worth telling apart:
 *
 *   400, so the whole list dies —
 *     q=''            declared minLength 1
 *     status='all'    not in the enum
 *     paymentStatus   not in the enum
 *     source='all'    not in the enum
 *     facilityId='all' declared format uuid
 *
 *   200 with the WRONG answer, which is worse because it reads as real data —
 *     sport='all'     matched literally against the sport name, so the server
 *                     returned 0 of 19 bookings and the page looked empty
 *                     rather than broken.
 *
 * `dateRange` is a UI-only preset resolved client-side and is never sent.
 * `regionId` is also resolved client-side via the facility scope index.
 */
function toQuery(params: BookingListParams): Record<string, string | number> {
  const query: Record<string, string | number> = { pageSize: WORKING_SET };

  const q = params.q?.trim();
  if (q) query.q = q;
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.paymentStatus && params.paymentStatus !== 'all') {
    query.paymentStatus = params.paymentStatus;
  }
  if (params.facilityId && params.facilityId !== 'all') query.facilityId = params.facilityId;
  // The server compares `s.name = $1` — exact and case-sensitive against the
  // DISPLAY name in the `sports` table. Sending the dashboard's slug matched
  // nothing, so picking any sport emptied the table. Translate back to the
  // stored name on the way out.
  if (params.sport && params.sport !== 'all') {
    query.sport = BOOKING_SPORT_WIRE_NAME[params.sport] ?? params.sport;
  }
  if (params.source && params.source !== 'all') query.source = params.source;
  if (params.playerId) query.playerId = params.playerId;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;

  return query;
}

export async function getBookings(params: BookingListParams): Promise<BookingListResult> {
  const [res, idx] = await Promise.all([
    apiClient.get(BASE, { params: toQuery(params) }),
    scopeIndex(),
  ]);
  const all = unwrapList<BookingDto>(res.data, ['bookings']).map(toBooking);
  return buildBookingListResult(all, params, idx);
}

export async function getBookingById(id: string): Promise<Booking> {
  const [res, idx] = await Promise.all([apiClient.get(`${BASE}/${id}`), scopeIndex()]);
  const booking = toBooking(unwrap<BookingDto>(res.data));
  // Re-check scope on the single fetch too: a booking at a facility outside the
  // admin's visible set must 404, not leak (mirrors membership/facility api).
  if (!idx.visibleIds.has(booking.facilityId)) throw new Error('Booking not found');
  return booking;
}

/** Raw KPI payload from `/bookings/stats` (server-computed, region-scoped). */
interface BookingStatsDto {
  total?: number;
  under_review?: number;
  confirmed?: number;
  completed?: number;
  attention?: number;
  revenue_syp?: number;
}

/**
 * KPI figures from the server, which applies the SAME region scope as the list —
 * verified against live data: a Riyadh-only admin gets 9 bookings and a stats
 * total of 9, while a super_admin gets 19 and 19.
 *
 * This used to fetch 1000 bookings and count them in the browser. That was
 * redundant work with a silent ceiling: past 1000 rows the KPI row would simply
 * have understated every figure, with nothing to indicate it.
 */
export async function getBookingStats(): Promise<BookingStats> {
  const res = await apiClient.get(`${BASE}/stats`);
  const dto = unwrap<BookingStatsDto>(res.data);
  return {
    total: dto.total ?? 0,
    underReview: dto.under_review ?? 0,
    confirmed: dto.confirmed ?? 0,
    completed: dto.completed ?? 0,
    attention: dto.attention ?? 0,
    revenueSyp: dto.revenue_syp ?? 0,
  };
}
