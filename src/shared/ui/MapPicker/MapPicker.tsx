import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { clsx } from '../clsx';
import { MapPinIcon, SearchIcon } from '../icons';
import { Spinner } from '../Spinner/Spinner';
import { searchPlaces, reverseGeocode, type PlaceResult } from '@shared/lib/nominatim';
import { formatLatLng } from '@shared/lib/geo';
import styles from './MapPicker.module.css';

export interface MapLatLng {
  lat: number;
  lng: number;
}

export interface MapPickerProps {
  /** The picked center, or null for "not chosen yet". */
  value: MapLatLng | null;
  /** Draw a live circle of this radius (km) around the center. 0/undefined hides it. */
  radiusKm?: number;
  onChange: (point: MapLatLng) => void;
  /** Locale for geocoding + reverse-geocoding ('ar' | 'en'). */
  lang?: string;
  className?: string;
  // Props-driven strings (the kit never calls useTranslation).
  searchPlaceholder?: string;
  myLocationLabel?: string;
  streetLabel?: string;
  satelliteLabel?: string;
  searchingLabel?: string;
  noResultsLabel?: string;
  geolocationError?: string;
  hint?: string;
}

// Whole-country fallback view when nothing is picked yet (center of Syria).
const SYRIA_CENTER: L.LatLngTuple = [34.8, 38.9];
const SYRIA_ZOOM = 6;
const PICKED_ZOOM = 13;

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

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
 * A free, professional map location picker (Leaflet + OpenStreetMap tiles, with
 * an Esri satellite layer). Click to drop the pin, drag it to fine-tune, search
 * a place, or jump to the browser's location — every interaction reports back a
 * lat/lng. A live circle previews the region radius. No API key, no billing.
 */
export function MapPicker({
  value,
  radiusKm = 0,
  onChange,
  lang = 'en',
  className,
  searchPlaceholder,
  myLocationLabel,
  streetLabel,
  satelliteLabel,
  searchingLabel,
  noResultsLabel,
  geolocationError,
  hint,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  // True once a center exists — used to auto-frame the first value (e.g. when
  // editing loads a region, or the very first pick) without hijacking later moves.
  const hadValueRef = useRef(false);
  // Latest onChange without re-initialising the map when the parent re-renders.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [layer, setLayer] = useState<'street' | 'satellite'>('street');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(-1);
  const [address, setAddress] = useState<string | null>(null);
  const [geoError, setGeoError] = useState(false);

  // Depend on the primitive lat/lng (not the object identity) so effects don't
  // re-run — and re-hit Nominatim — on every parent re-render.
  const lat = value ? value.lat : null;
  const lng = value ? value.lng : null;

  // --- Map lifecycle (init once) --------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true });
    map.setView(value ? [value.lat, value.lng] : SYRIA_CENTER, value ? PICKED_ZOOM : SYRIA_ZOOM);
    // Leaflet's zoom control is physically positioned, but the "my location"
    // button uses logical inset (flips in RTL). Flip the zoom corner too so they
    // never collide — opposite bottom corners in both LTR and RTL.
    const zoomCorner = document.documentElement.dir === 'rtl' ? 'bottomleft' : 'bottomright';
    L.control.zoom({ position: zoomCorner }).addTo(map);

    streetLayerRef.current = L.tileLayer(OSM_URL, {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    satelliteLayerRef.current = L.tileLayer(SATELLITE_URL, {
      maxZoom: 19,
      attribution: 'Imagery © Esri',
    });

    map.on('click', (event: L.LeafletMouseEvent) => {
      onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;

    // Leaflet renders grey/half tiles if it initialised while its container was
    // hidden or mid-animation (e.g. inside a modal). Recompute size once ready
    // and on every container resize.
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
      circleRef.current = null;
    };
    // Init once — subsequent value/radius changes flow through the sync effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Marker + circle follow the controlled value (no flyTo — avoids loops) -
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (lat === null || lng === null) {
      markerRef.current?.remove();
      markerRef.current = null;
      circleRef.current?.remove();
      circleRef.current = null;
      hadValueRef.current = false;
      setAddress(null);
      return;
    }

    const latlng: L.LatLngExpression = [lat, lng];

    // First center to appear (edit-open or first pick): frame it so the whole
    // circle is visible. Later moves just reposition the marker in place.
    if (!hadValueRef.current) {
      hadValueRef.current = true;
      map.setView(latlng, Math.max(map.getZoom(), 11));
    }
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      const marker = L.marker(latlng, { icon: pinIcon(), draggable: true });
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onChangeRef.current({ lat: position.lat, lng: position.lng });
      });
      marker.addTo(map);
      markerRef.current = marker;
    }

    if (radiusKm > 0) {
      const radiusM = radiusKm * 1000;
      if (circleRef.current) {
        circleRef.current.setLatLng(latlng).setRadius(radiusM);
      } else {
        circleRef.current = L.circle(latlng, {
          radius: radiusM,
          className: styles.circle,
          interactive: false,
        }).addTo(map);
      }
    } else {
      circleRef.current?.remove();
      circleRef.current = null;
    }
  }, [lat, lng, radiusKm]);

  // Any successful pick (click / drag / search / my-location) clears a stale
  // geolocation error so the caption shows the point the user actually chose.
  useEffect(() => {
    if (lat !== null && lng !== null) setGeoError(false);
  }, [lat, lng]);

  // --- Reverse-geocode the picked point into an address caption -------------
  useEffect(() => {
    if (lat === null || lng === null) return;
    const controller = new AbortController();
    setAddress(null);
    reverseGeocode(lat, lng, lang, controller.signal)
      .then((label) => setAddress(label))
      .catch(() => {
        /* aborted or offline — the coordinate caption still shows */
      });
    return () => controller.abort();
  }, [lat, lng, lang]);

  // --- Debounced place search -----------------------------------------------
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchPlaces(trimmed, lang, controller.signal)
        .then((places) => {
          setResults(places);
          setActive(places.length > 0 ? 0 : -1);
        })
        .catch((error) => {
          if (!(error instanceof DOMException && error.name === 'AbortError')) setResults([]);
        })
        .finally(() => {
          // Don't clear the spinner for a request we aborted — a newer search
          // is already in flight and owns the spinner state.
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, lang]);

  const goTo = (lat: number, lng: number, label?: string) => {
    mapRef.current?.flyTo([lat, lng], PICKED_ZOOM, { duration: 0.6 });
    onChangeRef.current({ lat, lng });
    if (label) setAddress(label);
    setResults(null);
    setQuery('');
    setActive(-1);
  };

  const selectResult = (place: PlaceResult) => goTo(place.lat, place.lng, place.label);

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!results || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = results[active] ?? results[0];
      if (chosen) selectResult(chosen);
    } else if (event.key === 'Escape') {
      setResults(null);
    }
  };

  const useMyLocation = () => {
    setGeoError(false);
    if (!('geolocation' in navigator)) {
      setGeoError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => goTo(position.coords.latitude, position.coords.longitude),
      () => setGeoError(true),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const switchLayer = (next: 'street' | 'satellite') => {
    const map = mapRef.current;
    if (!map || next === layer) return;
    const add = next === 'street' ? streetLayerRef.current : satelliteLayerRef.current;
    const remove = next === 'street' ? satelliteLayerRef.current : streetLayerRef.current;
    if (remove && map.hasLayer(remove)) map.removeLayer(remove);
    if (add && !map.hasLayer(add)) add.addTo(map);
    setLayer(next);
  };

  return (
    <div className={clsx(styles.wrap, className)}>
      <div className={styles.stage}>
        <div ref={containerRef} className={styles.map} data-testid="map-canvas" />

        <div className={styles.controls}>
          <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            {searching ? <Spinner size="sm" label={searchingLabel} /> : <SearchIcon />}
          </span>
          <input
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            data-testid="map-search"
          />
          {results && (
            <ul className={styles.results} role="listbox">
              {results.length === 0 ? (
                <li className={styles.noResults}>{noResultsLabel}</li>
              ) : (
                results.map((place, index) => (
                  <li key={`${place.lat},${place.lng}`} role="option" aria-selected={index === active}>
                    <button
                      type="button"
                      className={clsx(styles.result, index === active && styles.resultActive)}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => selectResult(place)}
                    >
                      <MapPinIcon className={styles.resultIcon} />
                      <span className={styles.resultLabel}>{place.label}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className={styles.layerToggle} role="group">
          <button
            type="button"
            className={clsx(styles.layerBtn, layer === 'street' && styles.layerActive)}
            onClick={() => switchLayer('street')}
            aria-pressed={layer === 'street'}
          >
            {streetLabel}
          </button>
          <button
            type="button"
            className={clsx(styles.layerBtn, layer === 'satellite' && styles.layerActive)}
            onClick={() => switchLayer('satellite')}
            aria-pressed={layer === 'satellite'}
          >
            {satelliteLabel}
          </button>
        </div>
        </div>

        <button type="button" className={styles.myLocation} onClick={useMyLocation}>
          <MapPinIcon />
          <span>{myLocationLabel}</span>
        </button>
      </div>

      <div className={styles.caption}>
        {geoError ? (
          <span className={styles.captionError} role="alert">
            {geolocationError}
          </span>
        ) : value ? (
          <span className={styles.captionText}>
            <MapPinIcon className={styles.captionIcon} />
            {address ? `${address} · ` : ''}
            <span className={styles.coords} dir="ltr">
              {formatLatLng(value.lat, value.lng)}
            </span>
          </span>
        ) : (
          <span className={styles.captionHint}>{hint}</span>
        )}
      </div>
    </div>
  );
}
