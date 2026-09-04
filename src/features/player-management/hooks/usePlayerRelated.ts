import { useQuery } from '@tanstack/react-query';
import { playerKeys } from '../api/player.keys';
import {
  getPlayerRatings,
  getPlayerReports,
  getPlayerRooms,
  getPlayerSubscription,
} from '../api';

/**
 * The related collections shown on the player detail-page tabs. Bookings and
 * club memberships are owned by their own oversight features now — the
 * PlayerBookingsCard / PlayerMembershipsCard consume those feature APIs directly.
 */

export function usePlayerSubscription(id: string) {
  return useQuery({ queryKey: playerKeys.subscription(id), queryFn: () => getPlayerSubscription(id) });
}

export function usePlayerRooms(id: string) {
  return useQuery({ queryKey: playerKeys.rooms(id), queryFn: () => getPlayerRooms(id) });
}

export function usePlayerRatings(id: string) {
  return useQuery({ queryKey: playerKeys.ratings(id), queryFn: () => getPlayerRatings(id) });
}

export function usePlayerReports(id: string) {
  return useQuery({ queryKey: playerKeys.reports(id), queryFn: () => getPlayerReports(id) });
}
