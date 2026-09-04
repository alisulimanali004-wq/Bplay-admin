import { create } from 'zustand';
import type { RangeKey, RegionScope } from '../api/dashboard.types';

interface DashboardFilterState {
  range: RangeKey;
  regionId: RegionScope;
  setRange: (range: RangeKey) => void;
  setRegion: (regionId: RegionScope) => void;
  reset: () => void;
}

/**
 * UI-only filter state for the dashboard (which range + region scope drive every
 * widget). Read via selectors, e.g. `useDashboardStore((s) => s.range)`.
 */
export const useDashboardStore = create<DashboardFilterState>((set) => ({
  range: '30d',
  regionId: 'all',
  setRange: (range) => set({ range }),
  setRegion: (regionId) => set({ regionId }),
  reset: () => set({ range: '30d', regionId: 'all' }),
}));
