import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { clsx } from '../clsx';
import styles from './CoverageMap.module.css';

/** A visual pin tone (kept UI-generic so @ui never imports a feature's status type). */
export type CoverageTone = 'active' | 'pending' | 'danger' | 'neutral';

export interface CoverageCircle {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface CoveragePin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tone: CoverageTone;
  /** Optional popup subtitle (e.g. the localized status label). */
  label?: string;
}

export interface CoverageLegendItem {
  tone: CoverageTone;
  label: string;
}

export interface CoverageMapProps {
  /** One coverage circle per area; the map fits bounds over ALL of them. */
  circles: CoverageCircle[];
  pins: CoveragePin[];
  /** Legend rows (shown when there are pins); omit to hide the legend. */
  legend?: CoverageLegendItem[];
  /** Caption shown in the legend row when there are no pins to plot. */
  emptyLabel?: string;
  className?: string;
  testId?: string;
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
// A whole-of-Syria default view for when there are no circles to frame.
const DEFAULT_CENTER: L.LatLngExpression = [34.8, 38.9];
const DEFAULT_ZOOM = 6;

function toneClass(tone: CoverageTone): string {
  switch (tone) {
    case 'active':
      return styles.pinActive;
    case 'pending':
      return styles.pinPending;
    case 'danger':
      return styles.pinDanger;
    default:
      return styles.pinNeutral;
  }
}

function centerPinIcon(): L.DivIcon {
  return L.divIcon({
    className: styles.pin,
    html:
      '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">' +
      '<path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7Z" ' +
      'fill="currentColor" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>' +
      '<circle cx="12" cy="9" r="2.6" fill="rgba(0,0,0,0.45)"/></svg>',
    iconSize: [34, 34],
    iconAnchor: [17, 32],
  });
}

/** Map-independent bounds enclosing every circle (union of per-circle boxes). */
function boundsForCircles(circles: CoverageCircle[]): L.LatLngBounds | null {
  let bounds: L.LatLngBounds | null = null;
  for (const circle of circles) {
    const box = L.latLng(circle.lat, circle.lng).toBounds(Math.max(circle.radiusKm, 0.1) * 2000);
    bounds = bounds ? bounds.extend(box) : box;
  }
  return bounds;
}

/**
 * A read-only coverage map: draws one radius circle + mint center pin per area
 * and one tone-colored dot per facility pin, framing all circles. Mirrors the
 * MapPicker raw-Leaflet lifecycle (init once, ResizeObserver + invalidateSize,
 * fit-once-with-height, map.remove() cleanup). Colors live in the css module
 * (tokens) — never raw hex in JS.
 */
export function CoverageMap({
  circles,
  pins,
  legend,
  emptyLabel,
  className,
  testId = 'coverage-map-canvas',
}: CoverageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleLayerRef = useRef<L.LayerGroup | null>(null);
  const pinLayerRef = useRef<L.LayerGroup | null>(null);
  const circlesRef = useRef<CoverageCircle[]>(circles);
  const needsFitRef = useRef(true);

  // --- Map lifecycle (init once) --------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    const map = L.map(container, { zoomControl: false, attributionControl: true });
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);

    circleLayerRef.current = L.layerGroup().addTo(map);
    pinLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    needsFitRef.current = true;

    const fit = () => {
      const bounds = boundsForCircles(circlesRef.current);
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
        return true;
      }
      return false;
    };

    // Leaflet computes a wrong zoom if it fits while the container has no real
    // height yet (a fresh page/tab). Recompute size, then frame the circles ONCE
    // the container actually has a height — via whichever of the timer /
    // ResizeObserver fires first.
    const invalidate = () => {
      map.invalidateSize();
      if (needsFitRef.current && container.clientHeight > 0 && fit()) {
        needsFitRef.current = false;
      }
    };
    const timer = window.setTimeout(invalidate, 200);
    const observer = new ResizeObserver(invalidate);
    observer.observe(container);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      circleLayerRef.current = null;
      pinLayerRef.current = null;
    };
    // Init once — circle/pin updates flow through the sync effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Redraw the circles + center pins, then refit -------------------------
  useEffect(() => {
    circlesRef.current = circles;
    const map = mapRef.current;
    const layer = circleLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const circle of circles) {
      L.circle([circle.lat, circle.lng], {
        radius: Math.max(circle.radiusKm, 0) * 1000,
        className: styles.circle,
        interactive: false,
      }).addTo(layer);
      L.marker([circle.lat, circle.lng], {
        icon: centerPinIcon(),
        interactive: false,
        keyboard: false,
      }).addTo(layer);
    }
    needsFitRef.current = true;
    if ((containerRef.current?.clientHeight ?? 0) > 0) {
      const bounds = boundsForCircles(circles);
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
        needsFitRef.current = false;
      }
    }
  }, [circles]);

  // --- Redraw the facility dots when the list changes -----------------------
  useEffect(() => {
    const layer = pinLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const pin of pins) {
      const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: 7,
        className: toneClass(pin.tone),
      });
      const popup = pin.label
        ? `<strong>${escapeHtml(pin.name)}</strong><br/>${escapeHtml(pin.label)}`
        : `<strong>${escapeHtml(pin.name)}</strong>`;
      marker.bindPopup(popup).addTo(layer);
    }
  }, [pins]);

  return (
    <div className={clsx(styles.wrap, className)}>
      <div ref={containerRef} className={styles.map} data-testid={testId} />
      {/* Show the caption row only when it has content: the empty-state caption
          when there are no pins, or the status legend when a caller supplies one.
          Omitting `legend` while pins exist renders no empty strip. */}
      {((pins.length === 0 && emptyLabel) || (pins.length > 0 && legend && legend.length > 0)) && (
        <div className={styles.legend}>
          {pins.length === 0 ? (
            <span className={styles.legendEmpty}>{emptyLabel}</span>
          ) : (
            legend?.map((item) => (
              <span key={`${item.tone}-${item.label}`} className={styles.legendItem}>
                <span className={clsx(styles.legendDot, toneClass(item.tone))} aria-hidden="true" />
                {item.label}
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Popups are set via bindPopup(html); escape user-supplied text to avoid
// injecting markup through a facility name.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
