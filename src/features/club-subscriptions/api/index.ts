import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './membership.api';
import * as mock from './membership.api.mock';

const impl = USE_MOCKS ? mock : real;

export type {
  Membership,
  MembershipListItem,
  MembershipListParams,
  MembershipListResult,
  MembershipStats,
  MembershipStatus,
  MembershipSortBy,
  MemberSegment,
  PlanType,
  BillingCycle,
  PlanSnapshot,
  MembershipPayment,
  MembershipCheckIn,
  PaymentStatus,
  PaymentMethod,
  CheckInMethod,
} from './membership.types';

export {
  membershipStatusBadgeVariant,
  memberSegmentBadgeVariant,
  computeMemberSegments,
  MEMBERSHIP_STATUSES,
  MEMBER_SEGMENTS,
  PLAN_TYPES,
  PLAN_CATALOG,
} from './membership.types';

export const getMemberships = impl.getMemberships;
export const getMembershipById = impl.getMembershipById;
export const getMembershipStats = impl.getMembershipStats;
