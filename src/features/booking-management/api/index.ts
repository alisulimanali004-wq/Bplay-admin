import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './booking.api';
import * as mock from './booking.api.mock';

const impl = USE_MOCKS ? mock : real;

export type {
  Booking,
  BookingListItem,
  BookingListParams,
  BookingListResult,
  BookingStats,
  BookingStatus,
  PaymentStatus,
  BookingSource,
  BookingSport,
  BookingFacilityKind,
} from './booking.types';
export {
  bookingStatusBadgeVariant,
  paymentStatusBadgeVariant,
  bookingSourceBadgeVariant,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  BOOKING_SOURCES,
  BOOKING_SPORTS,
} from './booking.types';

export const getBookings = impl.getBookings;
export const getBookingById = impl.getBookingById;
export const getBookingStats = impl.getBookingStats;
