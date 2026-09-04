import { filterPaginate } from '@shared/lib/paginate';
import { playerState, type Player, type PlayerListParams, type PlayerListResult } from './player.types';

/**
 * Shared search + filters + pagination (used by both the real and mock sources):
 * text search, a single account-state filter, paid/free membership, governorate,
 * sport played, and a registration-date recency window.
 */
export function filterAndPaginatePlayers(all: Player[], params: PlayerListParams): PlayerListResult {
  let items = all;

  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (player) =>
        player.name.toLowerCase().includes(q) ||
        player.email.toLowerCase().includes(q) ||
        player.phone.toLowerCase().includes(q) ||
        player.city.toLowerCase().includes(q),
    );
  }

  if (params.status && params.status !== 'all') {
    items = items.filter((player) => playerState(player) === params.status);
  }

  if (params.accountType && params.accountType !== 'all') {
    items = items.filter((player) => player.accountType === params.accountType);
  }

  if (params.city && params.city !== 'all') {
    items = items.filter((player) => player.city === params.city);
  }

  if (params.sport && params.sport !== 'all') {
    items = items.filter((player) => player.sports.some((entry) => entry.sport === params.sport));
  }

  // Registration recency — players who joined within the selected window.
  if (params.joined && params.joined !== 'all') {
    const cutoff = new Date();
    if (params.joined === '7d') cutoff.setDate(cutoff.getDate() - 7);
    else if (params.joined === '30d') cutoff.setDate(cutoff.getDate() - 30);
    else if (params.joined === '90d') cutoff.setDate(cutoff.getDate() - 90);
    else cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffTime = cutoff.getTime();
    items = items.filter((player) => new Date(player.createdAt).getTime() >= cutoffTime);
  }

  return filterPaginate(items, params);
}
