import { apiClient } from '@lib/apiClient';
import { unwrap, unwrapList } from '@shared/types/api';
import { filterAndPaginatePlayers } from './player.filter';
import {
  toPlayer,
  type CreatedPlayer,
  type CreatedPlayerDto,
  type CreatePlayerInput,
  type Player,
  type PlayerAction,
  type PlayerDto,
  type PlayerListParams,
  type PlayerListResult,
  type PlayerRating,
  type PlayerRatingReceived,
  type PlayerRatingsResult,
  type PlayerReport,
  type PlayerRoom,
  type PlayerStats,
  type PlayerSubscription,
  type ReportAction,
} from './player.types';

/**
 * The players routes are mounted at the module ROOT, not under a `/players`
 * segment: the list is `GET /admin/players-management` and one player is
 * `GET /admin/players-management/{id}`.
 *
 * This client used to append `/players` to all of them. Every request 404'd
 * except the list, which was worse — `/players` matched the `/:id` route and
 * came back 400 "must match format uuid", so the whole slice failed while
 * looking like a validation problem rather than a wrong URL.
 */
const PLAYERS_PATH = '/admin/players-management';

/** Bounded working set for client-side filtering — an explicit, visible cap. */
const WORKING_SET = 2000;
/**
 * PAGINATION: client-side, and applied exactly ONCE.
 *
 * The local pipeline still filters and sorts after the fetch, and either can drop rows —
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
export async function getPlayers(params: PlayerListParams): Promise<PlayerListResult> {
  // Blank and 'all' filters are OMITTED, not sent empty. The querystring
  // declares `q` with minLength 1, so an empty search box sent `q=` and the
  // whole request 400'd — the KPI row rendered while the table underneath it
  // showed "Something went wrong", on first load, with no search typed.
  // `city` and `sport` are matched with ILIKE against a name, so the literal
  // string 'all' would match nothing rather than meaning "no filter".
  const query: Record<string, string | number> = { pageSize: WORKING_SET };

  const q = params.q?.trim();
  if (q) query.q = q;
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.accountType && params.accountType !== 'all') query.accountType = params.accountType;
  if (params.city && params.city !== 'all') query.city = params.city;
  if (params.sport && params.sport !== 'all') query.sport = params.sport;
  if (params.joined && params.joined !== 'all') query.joined = params.joined;

  const res = await apiClient.get(PLAYERS_PATH, { params: query });
  const all = unwrapList<PlayerDto>(res.data, ['players']).map(toPlayer);
  return filterAndPaginatePlayers(all, params);
}

export async function getPlayerById(id: string): Promise<Player> {
  const res = await apiClient.get(`${PLAYERS_PATH}/${id}`);
  return toPlayer(unwrap<PlayerDto>(res.data));
}

/** Raw KPI payload from `/stats` (server-computed, region-scoped). */
interface PlayerStatsDto {
  total?: number;
  active?: number;
  suspended?: number;
  blocked?: number;
}

/**
 * KPIs come from the server, which applies the SAME region scope as the list —
 * so the counters and the rows beneath them cannot disagree.
 *
 * This used to fetch 1000 players and count them in the browser, which was
 * wrong twice over: it silently capped at whatever the page returned, and it
 * re-derived buckets the backend already resolves by precedence.
 */
export async function getPlayerStats(): Promise<PlayerStats> {
  const res = await apiClient.get(`${PLAYERS_PATH}/stats`);
  const dto = unwrap<PlayerStatsDto>(res.data);
  return {
    total: dto.total ?? 0,
    active: dto.active ?? 0,
    suspended: dto.suspended ?? 0,
    blocked: dto.blocked ?? 0,
  };
}

export async function getPlayerSubscription(id: string): Promise<PlayerSubscription> {
  const res = await apiClient.get(`${PLAYERS_PATH}/${id}/subscription`);
  return unwrap<PlayerSubscription>(res.data);
}

export async function getPlayerRooms(id: string): Promise<PlayerRoom[]> {
  const res = await apiClient.get(`${PLAYERS_PATH}/${id}/rooms`);
  return unwrapList<PlayerRoom>(res.data, ['rooms']);
}

/**
 * Both directions of a player's ratings.
 *
 * `ratings` on the wire is what the player GAVE (the key kept its original name
 * so nothing else broke); `received` is how the player is rated by others.
 * Previously only the given side was fetched, so an admin judging a report could
 * see the player's opinion of everyone else but not anyone's opinion of them.
 */
export async function getPlayerRatings(id: string): Promise<PlayerRatingsResult> {
  const res = await apiClient.get(`${PLAYERS_PATH}/${id}/ratings`);
  const data = unwrap<{
    ratings?: PlayerRating[];
    received?: PlayerRatingReceived[];
    averageReceived?: number | null;
    receivedCount?: number;
  }>(res.data);
  const received = data?.received ?? [];
  return {
    given: data?.ratings ?? [],
    received,
    averageReceived: data?.averageReceived ?? null,
    receivedCount: data?.receivedCount ?? received.length,
  };
}

export async function getPlayerReports(id: string): Promise<PlayerReport[]> {
  const res = await apiClient.get(`${PLAYERS_PATH}/${id}/reports`);
  return unwrapList<PlayerReport>(res.data, ['reports']);
}

export async function updatePlayerStatus(
  id: string,
  action: PlayerAction,
  reason?: string,
): Promise<void> {
  await apiClient.patch(`${PLAYERS_PATH}/${id}/status`, { action, reason });
}

export async function setPlayerRatingHidden(
  playerId: string,
  ratingId: string,
  hidden: boolean,
): Promise<void> {
  await apiClient.patch(`${PLAYERS_PATH}/${playerId}/ratings/${ratingId}`, { hidden });
}

export async function resolvePlayerReport(
  playerId: string,
  reportId: string,
  action: ReportAction,
  note?: string,
): Promise<void> {
  await apiClient.patch(`${PLAYERS_PATH}/${playerId}/reports/${reportId}`, { action, note });
}

export async function liftBookingSuspension(playerId: string): Promise<void> {
  await apiClient.patch(`${PLAYERS_PATH}/${playerId}/lift-suspension`, {});
}

/**
 * Create a player account with a one-time temporary password.
 *
 * Two details the wire contract forces:
 *
 * 1. The body rejects unknown keys, so ONLY the six declared fields go out.
 *    `dateOfBirth` is omitted entirely when blank rather than sent as `''`,
 *    which would fail the server's `format: 'date'` check.
 * 2. The response carries BOTH `id` (the players row) and `userId` (the users
 *    row), and they are different. Every other player route — detail, status,
 *    ratings — keys on `id`, so that is what this returns for navigation.
 *    Using `userId` yields a 404.
 */
export async function createPlayer(input: CreatePlayerInput): Promise<CreatedPlayer> {
  const dateOfBirth = input.dateOfBirth?.trim();
  const res = await apiClient.post(PLAYERS_PATH, {
    fullName: input.fullName.trim(),
    username: input.username.trim(),
    email: input.email.trim(),
    phone: `963${input.phone}`,
    gender: input.gender,
    ...(dateOfBirth ? { dateOfBirth } : {}),
  });

  const data = unwrap<CreatedPlayerDto>(res.data);
  return {
    id: String(data.id ?? ''),
    userId: String(data.userId ?? ''),
    username: data.username ?? '',
    email: data.email ?? '',
    tempPassword: data.temporaryPassword ?? '',
  };
}
