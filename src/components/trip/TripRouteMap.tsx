'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation2, Globe, Loader2, MapPin, AlertCircle } from 'lucide-react';
import type { Route, Destination } from '@/types';

interface TripRouteMapProps {
  route: Route;
  destinations: Destination[];
  provider?: string;
}

// Runtime geocode cache to avoid re-fetching within the same session
const runtimeGeoCache = new Map<string, [number, number]>();

// Static fallback for the most common Indian/international destinations
const STATIC_GEO: Record<string, [number, number]> = {
  'kerala': [10.8505, 76.2711], 'kochi': [9.9312, 76.2673], 'alleppey': [9.4981, 76.3388],
  'varkala': [8.7378, 76.7164], 'kovalam': [8.4004, 76.9787], 'munnar': [10.0889, 77.0595],
  'goa': [15.2993, 74.1240], 'manali': [32.2432, 77.1892], 'udaipur': [24.5854, 73.7125],
  'jaipur': [26.9124, 75.7873], 'jodhpur': [26.2389, 73.0243], 'delhi': [28.6139, 77.2090],
  'mumbai': [19.0760, 72.8777], 'bangalore': [12.9716, 77.5946], 'bengaluru': [12.9716, 77.5946],
  'kolkata': [22.5726, 88.3639], 'hyderabad': [17.3850, 78.4867], 'chennai': [13.0827, 80.2707],
  'agra': [27.1767, 78.0081], 'varanasi': [25.3176, 82.9739], 'rishikesh': [30.0869, 78.2676],
  'shimla': [31.1048, 77.1734], 'darjeeling': [27.0360, 88.2627], 'ooty': [11.4102, 76.6950],
  'coorg': [12.3375, 75.8069], 'kodaikanal': [10.2381, 77.4892], 'mysore': [12.2958, 76.6394],
  'mysuru': [12.2958, 76.6394], 'pondicherry': [11.9416, 79.8083], 'puducherry': [11.9416, 79.8083],
  'madurai': [9.9252, 78.1198], 'trichy': [10.7905, 78.7047], 'coimbatore': [11.0168, 76.9558],
  'tirunelveli': [8.7139, 77.7567], 'thoothukudi': [8.7642, 78.1348], 'nagercoil': [8.1833, 77.4119],
  'kanyakumari': [8.0883, 77.5385], 'rameswaram': [9.2881, 79.3129], 'tirupati': [13.6288, 79.4192],
  'nanguneri': [8.4898, 77.6563], 'manimuthar': [8.6961, 77.5087], 'courtallam': [8.9376, 77.2720],
  'ambasamudram': [8.7021, 77.4514], 'tenkasi': [8.9596, 77.3151],
  'bali': [-8.3405, 115.0920], 'ubud': [-8.5069, 115.2625], 'seminyak': [-8.6900, 115.1566],
  'phuket': [7.8804, 98.3923], 'bangkok': [13.7563, 100.5018], 'singapore': [1.3521, 103.8198],
  'tokyo': [35.6762, 139.6503], 'paris': [48.8566, 2.3522], 'london': [51.5074, -0.1278],
  'new york': [40.7128, -74.0060], 'dubai': [25.2048, 55.2708], 'maldives': [3.2028, 73.2207],
};

async function geocodeName(name: string): Promise<[number, number] | null> {
  const key = name.toLowerCase().trim();

  // 1. Runtime cache
  if (runtimeGeoCache.has(key)) return runtimeGeoCache.get(key)!;

  // 2. Static fallback (exact + partial match)
  if (STATIC_GEO[key]) { runtimeGeoCache.set(key, STATIC_GEO[key]); return STATIC_GEO[key]; }
  for (const [k, v] of Object.entries(STATIC_GEO)) {
    if (k.includes(key) || key.includes(k)) { runtimeGeoCache.set(key, v); return v; }
  }

  // 3. Nominatim OpenStreetMap API
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'Zentrip/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      runtimeGeoCache.set(key, coords);
      return coords;
    }
  } catch {
    // Network error — fall through
  }
  return null;
}

export default function TripRouteMap({ route, destinations, provider }: TripRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
  const [geocoding, setGeocoding] = useState(true);
  const [resolvedPoints, setResolvedPoints] = useState<{ name: string; coords: [number, number] }[]>([]);
  const [geocodeError, setGeocodeError] = useState(false);

  // Step 1: Geocode all destinations/segments asynchronously
  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setGeocoding(true);
      setGeocodeError(false);

      const names = destinations.length
        ? destinations.map((d) => d.name)
        : [...new Set(route.segments.flatMap((s) => [s.from, s.to]))];

      const results = await Promise.all(names.map(async (name) => {
        const coords = await geocodeName(name);
        return coords ? { name, coords } : null;
      }));

      if (cancelled) return;

      const valid = results.filter((r): r is { name: string; coords: [number, number] } => r !== null);
      setResolvedPoints(valid);
      if (valid.length === 0 && names.length > 0) setGeocodeError(true);
      setGeocoding(false);
    }

    resolve();
    return () => { cancelled = true; };
  }, [destinations, route]);

  // Step 2: Initialize / update Leaflet map once geocoding is done
  useEffect(() => {
    if (geocoding) return;
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Destroy previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((mapRef.current as any)._leaflet_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapRef.current as any)._leaflet_id = null;
      mapRef.current.innerHTML = '';
    }

    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      // Fix Leaflet icon paths for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 18,
      }).addTo(map);

      if (resolvedPoints.length === 0) {
        // Default to India center
        map.setView([20.5937, 78.9629], 5);
        mapInstanceRef.current = map;
        return;
      }

      const latlngs = resolvedPoints.map((p) => p.coords as [number, number]);

      // Custom pin icons
      const makeIcon = (bg: string, emoji: string, size: number) =>
        L.divIcon({
          className: '',
          html: `<div style="background:${bg};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 0 10px ${bg}55;font-size:${Math.round(size * 0.44)}px;">${emoji}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

      const startIcon = makeIcon('#7CFC9A', '🛫', 32);
      const endIcon   = makeIcon('#7CFC9A', '🏁', 32);
      const midIcon   = makeIcon('#FFB454', '📍', 28);

      resolvedPoints.forEach((pt, i) => {
        const icon = i === 0 ? startIcon : i === resolvedPoints.length - 1 ? endIcon : midIcon;
        const label = i === 0 ? 'Start' : i === resolvedPoints.length - 1 ? 'End' : `Stop ${i + 1}`;
        L.marker(pt.coords, { icon })
          .addTo(map)
          .bindPopup(`<b style="color:#111">${pt.name}</b><br><small style="color:#555">${label}</small>`);
      });

      // Draw route polyline between consecutive points
      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: '#7CFC9A', weight: 3, opacity: 0.85, dashArray: '6 4' }).addTo(map);
      }

      // Fit bounds
      if (latlngs.length === 1) {
        map.setView(latlngs[0], 12);
      } else {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 13 });
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geocoding, resolvedPoints]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Route Overview</h3>
          <p className="text-[10px] text-[#82958A]">Interactive map · Click pins for details</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#82958A]">
          <Globe className="w-3 h-3" />
          {provider && provider !== 'mapbox' ? `Provider: ${provider}` : 'OpenStreetMap'}
        </div>
      </div>

      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Map Container */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10" style={{ height: 340 }}>
        {/* Loading overlay */}
        {geocoding && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0D1117]/80 gap-3">
            <Loader2 className="w-7 h-7 text-[#7CFC9A] animate-spin" />
            <span className="text-sm text-[#82958A]">Locating destinations…</span>
          </div>
        )}

        {/* Geocode error notice (non-blocking — map still loads) */}
        {!geocoding && geocodeError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Some destinations couldn't be located on the map
          </div>
        )}

        {/* Destination badges (always visible over map) */}
        {!geocoding && resolvedPoints.length > 0 && (
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[80%]">
            {resolvedPoints.map((pt, i) => (
              <div
                key={pt.name}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  background: i === 0 ? '#7CFC9A22' : i === resolvedPoints.length - 1 ? '#7CFC9A22' : '#FFB45422',
                  border: `1px solid ${i === 0 ? '#7CFC9A55' : i === resolvedPoints.length - 1 ? '#7CFC9A55' : '#FFB45455'}`,
                  color: i === 0 ? '#7CFC9A' : i === resolvedPoints.length - 1 ? '#7CFC9A' : '#A78BFA',
                }}
              >
                <MapPin className="w-2.5 h-2.5" />
                {pt.name}
              </div>
            ))}
          </div>
        )}

        <div
          ref={mapRef}
          className="w-full h-full"
          aria-label="Trip route map"
        />
      </div>

      {/* Segment Cards */}
      {route.segments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {route.segments.map((segment, index) => (
            <div
              key={`${segment.from}-${segment.to}-${index}`}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <Navigation2 className="w-4 h-4 text-[#7CFC9A]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white font-medium truncate">
                  {segment.from} → {segment.to}
                </div>
                <div className="text-[10px] text-[#82958A] truncate capitalize">
                  {segment.mode} · {segment.duration} · {segment.distance}
                  {segment.cost ? ` · ~₹${segment.cost.toLocaleString('en-IN')}` : ''}
                </div>
                {segment.notes && (
                  <div className="text-[10px] text-[#82958A] mt-0.5 truncate">{segment.notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Route summary */}
      {(route.totalDistance || route.totalDuration) && (
        <div className="flex items-center gap-4 text-[10px] text-[#82958A] flex-wrap">
          {route.totalDistance && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7CFC9A]" />
              Total distance: <span className="text-white">{route.totalDistance}</span>
            </span>
          )}
          {route.totalDuration && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB454]" />
              Total time: <span className="text-white">{route.totalDuration}</span>
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-[#82958A]">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#7CFC9A]" /><span>Start</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#FFB454]" /><span>Stops</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#7CFC9A]" /><span>End</span></div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-px border-t-2 border-dashed border-[#7CFC9A]" />
          <span>Route</span>
        </div>
      </div>
    </div>
  );
}
