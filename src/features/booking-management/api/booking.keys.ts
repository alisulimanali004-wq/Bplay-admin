import type { BookingListParams } from './booking.types';

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (params: BookingListParams) => [...bookingKeys.lists(), params] as const,
  stats: () => [...bookingKeys.all, 'stats'] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};
