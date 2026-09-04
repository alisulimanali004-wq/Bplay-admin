/**
 * The single scope + filter + sort + paginate pipeline shared by the real and
 * mock membership sources.
 *
 * Membership visibility is DERIVED from facility (club) visibility: a super-admin
 * or region-scoped admin sees exactly the clubs the facility-management scope
 * exposes, so the memberships they may oversee are those on a visible club. We
 * therefore never recompute geo membership here — we project the already-scoped
 * FacilityListItem set into a lightweight index (visible ids + region names +
 * orphan flags) and key every membership off its clubId.
 */

import { filterPaginate } from '@shared/lib/paginate';
import { resolveDateRange } from '@ui';
import type { FacilityListItem } from '@features/facility-management/api';
import {
  toMembershipListItem,
  type Membership,
  type MembershipListItem,
  type MembershipListParams,
  type MembershipListResult,
  type MembershipStats,
} from './membership.types';

/** The clubs the signed-in admin may oversee, projected from the facility scope. */
export interface FacilityScopeIndex {
  visibleIds: Set<string>;
  regionNamesById: Map<string, string[]>;
  isOrphanById: Map<string, boolean>;
}

export function buildFacilityScopeIndex(items: FacilityListItem[]): FacilityScopeIndex {
  const visibleIds = new Set<string>();
  const regionNamesById = new Map<string, string[]>();
  const isOrphanById = new Map<string, boolean>();
  for (const item of items) {
    visibleIds.add(item.id);
    regionNamesById.set(item.id, item.regionNames);
    isOrphanById.set(item.id, item.isOrphan);
  }
  return { visibleIds, regionNamesById, isOrphanById };
}

/** Project every visible-club membership to a flat list item (segments + region membership). */
function scopedItems(
  all: Membership[],
  idx: FacilityScopeIndex,
  nowMs: number,
): MembershipListItem[] {
  return all
    .filter((m) => idx.visibleIds.has(m.clubId))
    .map((m) =>
      toMembershipListItem(
        m,
        idx.regionNamesById.get(m.clubId) ?? [],
        idx.isOrphanById.get(m.clubId) ?? false,
        nowMs,
      ),
    );
}

function compareBy(
  a: MembershipListItem,
  b: MembershipListItem,
  sortBy: MembershipListParams['sortBy'],
): number {
  switch (sortBy) {
    case 'priceSyp':
      return a.priceSyp - b.priceSyp;
    case 'endDate':
      return Date.parse(a.endDate) - Date.parse(b.endDate);
    case 'createdAt':
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    case 'startDate':
    default:
      return Date.parse(a.startDate) - Date.parse(b.startDate);
  }
}

export function buildMembershipListResult(
  all: Membership[],
  params: MembershipListParams,
  idx: FacilityScopeIndex,
  nowMs: number,
): MembershipListResult {
  let items = scopedItems(all, idx, nowMs);

  const playerId = params.playerId;
  if (playerId) {
    items = items.filter((item) => item.playerId === playerId);
  }
  const q = params.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (item) =>
        item.playerName.toLowerCase().includes(q) ||
        item.clubName.toLowerCase().includes(q) ||
        item.planName.toLowerCase().includes(q),
    );
  }
  const status = params.status;
  if (status && status !== 'all') {
    items = items.filter((item) => item.status === status);
  }
  const clubId = params.clubId;
  if (clubId && clubId !== 'all') {
    items = items.filter((item) => item.clubId === clubId);
  }
  const planName = params.planName;
  if (planName && planName !== 'all') {
    items = items.filter((item) => item.planName === planName);
  }
  const segment = params.segment;
  if (segment && segment !== 'all') {
    items = items.filter((item) => item.segments.includes(segment));
  }
  const regionId = params.regionId;
  if (regionId && regionId !== 'all') {
    items =
      regionId === 'orphans'
        ? items.filter((item) => item.isOrphan)
        : items.filter((item) => item.regionNames.includes(regionId));
  }
  const dateRange = params.dateRange;
  if (dateRange && dateRange.preset !== 'all') {
    const { fromMs, toMs } = resolveDateRange(dateRange, nowMs);
    items = items.filter((item) => {
      const started = Date.parse(item.startDate);
      if (fromMs !== null && started < fromMs) return false;
      if (toMs !== null && started > toMs) return false;
      return true;
    });
  }

  if (params.sortBy) {
    const dir = params.sortDir === 'asc' ? 1 : -1;
    items = [...items].sort((a, b) => compareBy(a, b, params.sortBy) * dir);
  }

  return filterPaginate(items, params);
}

/** Scope-aware KPI aggregate over the visible membership set (ignores param filters). */
export function computeMembershipStats(
  all: Membership[],
  idx: FacilityScopeIndex,
  nowMs: number,
): MembershipStats {
  const scoped = all.filter((m) => idx.visibleIds.has(m.clubId));
  const items = scopedItems(all, idx, nowMs);
  const revenueSyp = scoped.reduce(
    (sum, m) =>
      sum +
      m.payments
        .filter((payment) => payment.status === 'paid')
        .reduce((paymentSum, payment) => paymentSum + payment.amountSyp, 0),
    0,
  );
  return {
    total: items.length,
    active: items.filter((item) => item.status === 'active').length,
    pendingActivation: items.filter((item) => item.status === 'pending_activation').length,
    paused: items.filter((item) => item.status === 'paused').length,
    expired: items.filter((item) => item.status === 'expired').length,
    cancelled: items.filter((item) => item.status === 'cancelled').length,
    nearExpiry: items.filter((item) => item.segments.includes('near_expiry')).length,
    churnRisk: items.filter((item) => item.segments.includes('churn_risk')).length,
    revenueSyp,
  };
}
