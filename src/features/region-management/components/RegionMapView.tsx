import { useMemo } from 'react';
import { CoverageMap, type CoverageLegendItem } from '@ui';
import {
  facilityStatusTone,
  FACILITY_LEGEND_STATUSES,
  type FacilityStatus,
} from '@features/facility-management/api';

export interface RegionMapFacility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: FacilityStatus;
}

export interface RegionMapViewProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  facilities: RegionMapFacility[];
  /** Localized label per facility status (used in the pin popup + legend). */
  statusLabels: Record<FacilityStatus, string>;
  /** Shown as the legend caption when there are no facilities to plot. */
  emptyLabel?: string;
  className?: string;
}

/**
 * A single-region coverage map — a thin wrapper over the shared @ui CoverageMap
 * that frames one region circle and plots its facilities. Kept as a named
 * component (with its testid) so RegionDetailPage stays unchanged.
 */
export function RegionMapView({
  center,
  radiusKm,
  facilities,
  statusLabels,
  emptyLabel,
  className,
}: RegionMapViewProps) {
  const circles = useMemo(
    () => [{ id: 'region', lat: center.lat, lng: center.lng, radiusKm }],
    [center.lat, center.lng, radiusKm],
  );

  const pins = useMemo(
    () =>
      facilities.map((facility) => ({
        id: facility.id,
        name: facility.name,
        lat: facility.lat,
        lng: facility.lng,
        tone: facilityStatusTone(facility.status),
        label: statusLabels[facility.status] ?? facility.status,
      })),
    [facilities, statusLabels],
  );

  const legend = useMemo<CoverageLegendItem[]>(
    () =>
      FACILITY_LEGEND_STATUSES.map((status) => ({
        tone: facilityStatusTone(status),
        label: statusLabels[status] ?? status,
      })),
    [statusLabels],
  );

  return (
    <CoverageMap
      circles={circles}
      pins={pins}
      legend={legend}
      emptyLabel={emptyLabel}
      className={className}
      testId="region-map-canvas"
    />
  );
}
