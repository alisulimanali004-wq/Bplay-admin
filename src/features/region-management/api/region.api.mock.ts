import { mockDelay } from '@shared/lib/mock';
import { filterAndPaginateRegions } from './region.filter';
import type { ScopeNeighbourhood } from './region.api';
import type {
  Region,
  RegionListParams,
  RegionListResult,
  RegionStats,
  CreateRegionInput,
  UpdateRegionInput,
} from './region.types';

// In-memory mutable db: mutations persist for the session and a refetch sees them.
// New ids are r{seq}; the seeded cities keep ids c1..c6 (auth demo seeds depend on
// c1/c2, and the facility scope reads these circles).
let seq = 500;

interface RegionSeed {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  isActive: boolean;
  /** Assigned admins — id/name pairs MUST match admin-management seeds. */
  admins: Array<{ id: string; name: string }>;
  /** Seeded already soft-deleted (populates the "show deleted" view). */
  isDeleted?: boolean;
}

// Admin seed pairs (see admin.api.mock.ts): 100 Sara Haddad, 101 Omar Khoury,
// 102 Lina Nasser, 103 Karim Aziz, …
const SEEDS: RegionSeed[] = [
  {
    id: 'c1',
    name: 'Damascus',
    centerLat: 33.5138,
    centerLng: 36.2765,
    radiusKm: 25,
    isActive: true,
    admins: [{ id: '100', name: 'Sara Haddad' }],
  },
  {
    id: 'c2',
    name: 'Aleppo',
    centerLat: 36.2021,
    centerLng: 37.1343,
    radiusKm: 25,
    isActive: true,
    admins: [{ id: '101', name: 'Omar Khoury' }],
  },
  {
    id: 'c3',
    name: 'Homs',
    centerLat: 34.7324,
    centerLng: 36.7137,
    radiusKm: 20,
    isActive: true,
    admins: [],
  },
  {
    id: 'c4',
    name: 'Latakia',
    centerLat: 35.5307,
    centerLng: 35.7822,
    radiusKm: 18,
    isActive: true,
    admins: [{ id: '102', name: 'Lina Nasser' }],
  },
  {
    id: 'c5',
    name: 'Hama',
    centerLat: 35.1318,
    centerLng: 36.7578,
    radiusKm: 18,
    isActive: false,
    admins: [],
  },
  {
    id: 'c6',
    name: 'Tartus',
    centerLat: 34.889,
    centerLng: 35.8866,
    radiusKm: 15,
    isActive: true,
    admins: [],
  },
  {
    id: 'c7',
    name: 'Idlib',
    centerLat: 35.9333,
    centerLng: 36.6333,
    radiusKm: 15,
    isActive: false,
    admins: [],
    isDeleted: true,
  },
];

let dateCounter = 0;
function seedDate(): string {
  dateCounter += 1;
  return new Date(2025, 0, dateCounter).toISOString();
}

const db: Region[] = SEEDS.map<Region>((seed) => ({
  id: seed.id,
  name: seed.name,
  centerLat: seed.centerLat,
  centerLng: seed.centerLng,
  radiusKm: seed.radiusKm,
  isActive: seed.isActive,
  status: seed.isActive ? 'active' : 'inactive',
  isDeleted: seed.isDeleted ?? false,
  assignedAdminIds: seed.admins.map((admin) => admin.id),
  assignedAdminNames: seed.admins.map((admin) => admin.name),
  createdAt: seedDate(),
}));

export async function getRegions(params: RegionListParams): Promise<RegionListResult> {
  await mockDelay();
  return filterAndPaginateRegions([...db], params);
}

/** Find a single region by id INCLUDING soft-deleted ones (the detail page can show a deleted region). */
export async function getRegionById(id: string): Promise<Region> {
  await mockDelay();
  const region = db.find((item) => item.id === id);
  if (!region) throw new Error('Region not found');
  return { ...region };
}

/** Platform-wide region counts for the list KPI row (live regions only). */
export async function getRegionStats(): Promise<RegionStats> {
  await mockDelay(200);
  const live = db.filter((region) => !region.isDeleted);
  return {
    total: live.length,
    active: live.filter((region) => region.isActive).length,
    unassigned: live.filter((region) => region.assignedAdminIds.length === 0).length,
  };
}

/** Live regions only (deleted ones never scope facilities); callers filter isActive. */
export async function getScopeRegions(): Promise<Region[]> {
  await mockDelay();
  return db.filter((region) => !region.isDeleted).map((region) => ({ ...region }));
}

/**
 * Mirrors the real `getScopeTree`. Neighbourhoods were never mocked (the
 * screens that manage them only run against a real API), so the list is empty
 * and the grouped dropdown degrades to cities — which is what the demo build
 * showed before neighbourhoods existed.
 */
export async function getScopeTree(): Promise<{
  regions: Region[];
  neighbourhoods: ScopeNeighbourhood[];
}> {
  return { regions: await getScopeRegions(), neighbourhoods: [] };
}

export async function createRegion(input: CreateRegionInput): Promise<Region> {
  await mockDelay();
  const region: Region = {
    id: `r${(seq += 1)}`,
    name: input.name,
    centerLat: input.centerLat,
    centerLng: input.centerLng,
    radiusKm: input.radiusKm,
    isActive: true,
    status: 'active',
    isDeleted: false,
    assignedAdminIds: [],
    assignedAdminNames: [],
    createdAt: new Date().toISOString(),
  };
  db.unshift(region);
  return region;
}

export async function updateRegion(id: string, input: UpdateRegionInput): Promise<Region> {
  await mockDelay();
  const region = db.find((item) => item.id === id);
  if (!region) throw new Error('Region not found');
  region.name = input.name;
  region.centerLat = input.centerLat;
  region.centerLng = input.centerLng;
  region.radiusKm = input.radiusKm;
  return region;
}

export async function toggleRegionActive(id: string, isActive: boolean): Promise<void> {
  await mockDelay();
  const region = db.find((item) => item.id === id);
  if (region) {
    region.isActive = isActive;
    region.status = isActive ? 'active' : 'inactive';
  }
}

/** Replace the whole admin assignment (many-to-many). Empty arrays = unassign all. */
export async function assignAdmins(
  id: string,
  adminIds: string[],
  adminNames: string[],
): Promise<void> {
  await mockDelay();
  const region = db.find((item) => item.id === id);
  if (region) {
    region.assignedAdminIds = [...adminIds];
    region.assignedAdminNames = [...adminNames];
  }
}

/** Soft delete — the region is hidden and drops out of facility scope, but kept for restore. */
export async function deleteRegion(id: string): Promise<void> {
  await mockDelay();
  const region = db.find((item) => item.id === id);
  if (region) region.isDeleted = true;
}

/** Restore a soft-deleted region back into the live list. */
export async function restoreRegion(id: string): Promise<void> {
  await mockDelay();
  const region = db.find((item) => item.id === id);
  if (region) region.isDeleted = false;
}
