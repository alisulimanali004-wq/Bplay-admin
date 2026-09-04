import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { clsx } from '../clsx';
import styles from './MapView.module.css';

export interface MapViewProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function pinIcon(): L.DivIcon {
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

/**
 * A free, READ-ONLY Leaflet map (OpenStreetMap tiles, no API key) centred on a
 * single coordinate with a fixed marker — the viewer counterpart to MapPicker.
 * Scroll-zoom is off (won't hijack page scroll); zoom buttons + drag stay on.
 */
export function MapView({ lat, lng, zoom = 14, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Leaflet THROWS on a non-finite coordinate ("Invalid LatLng object: (NaN,
  // NaN)"), and a throw inside this effect takes down the whole page, not just
  // the map. Callers should not render a map for a record with no location —
  // but a missing coordinate is ordinary data, not a programming error, so the
  // component refuses to render rather than letting one null field break a page.
  const valid = Number.isFinite(lat) && Number.isFinite(lng);

  // Init once.
  useEffect(() => {
    if (!valid) return;
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
    });
    map.setView([lat, lng], zoom);
    const zoomCorner = document.documentElement.dir === 'rtl' ? 'bottomleft' : 'bottomright';
    L.control.zoom({ position: zoomCorner }).addTo(map);
    L.tileLayer(OSM_URL, { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    markerRef.current = L.marker([lat, lng], {
      icon: pinIcon(),
      interactive: false,
      keyboard: false,
    }).addTo(map);
    mapRef.current = map;

    // Leaflet renders grey tiles if it initialised while hidden (e.g. inside an
    // inactive tab). Recompute size once ready and on every container resize.
    const invalidate = () => map.invalidateSize();
    const raf = window.setTimeout(invalidate, 200);
    const observer = new ResizeObserver(invalidate);
    observer.observe(containerRef.current);

    return () => {
      window.clearTimeout(raf);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid]);

  // Follow coordinate changes.
  useEffect(() => {
    if (!valid) return;
    mapRef.current?.setView([lat, lng], zoom);
    markerRef.current?.setLatLng([lat, lng]);
  }, [lat, lng, zoom, valid]);

  if (!valid) return null;

  return <div ref={containerRef} className={clsx(styles.map, className)} data-testid="map-view" />;
}
