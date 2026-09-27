import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../lib/utils';
import 'leaflet/dist/leaflet.css';

export interface MapStation {
  id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
  zone?: string;
}

export interface MapEdge {
  source: string;
  target: string;
  name?: string;
  distance_km?: number;
}

export interface MapCorridor {
  id: string;
  name: string;
  stations: MapStation[];
  edges: MapEdge[];
  health?: 'green' | 'amber' | 'red';
}

interface CorridorMapProps {
  corridors: MapCorridor[];
  selectedCorridorId?: string | null;
  onCorridorSelect?: (id: string) => void;
  height?: number;
}

const LINK_CLASS: Record<string, string> = {
  green: 'map-link-green',
  amber: 'map-link-amber',
  red: 'map-link-red',
};

/** Offline-safe markers: pure HTML divIcons, no CDN marker PNGs. */
function stationIcon(label: string) {
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<span class="map-marker-wrap">
      <span class="map-dot"></span>
      <span class="map-label">${label}</span>
    </span>`,
  });
}

function FlyTo({ position, token }: { position: [number, number] | null; token: string }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 7, { duration: 0.6 });
    // token changes even when position is identical, forcing a re-fly on re-select
  }, [token, position, map]);
  return null;
}

const INDIA_CENTER: [number, number] = [22.5937, 78.9629];

export const CorridorMap: React.FC<CorridorMapProps> = ({
  corridors,
  selectedCorridorId,
  onCorridorSelect,
  height = 520,
}) => {
  const selected = useMemo(
    () => corridors.find((c) => c.id === selectedCorridorId) ?? corridors[0] ?? null,
    [corridors, selectedCorridorId],
  );

  const positions = useMemo(() => {
    if (!selected) return null;
    const nodes = selected.stations.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon));
    if (nodes.length === 0) return null;
    const lats = nodes.map((n) => n.lat);
    const lngs = nodes.map((n) => n.lon);
    const center: [number, number] = [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ];
    const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
    const zoom = span > 20 ? 5 : span > 8 ? 6 : span > 3 ? 7 : 8;
    return { center, zoom };
  }, [selected]);

  const byCode = useMemo(() => {
    const map = new Map<string, MapStation>();
    for (const c of corridors) for (const s of c.stations) map.set(s.code, s);
    return map;
  }, [corridors]);

  return (
    <div className="relative w-full rounded-card overflow-hidden border border-hairline-strong bg-tints-700" style={{ height }}>
      <MapContainer
        center={positions?.center ?? INDIA_CENTER}
        zoom={positions?.zoom ?? 5}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo position={positions?.center ?? null} token={`${selected?.id ?? 'none'}-${corridors.length}`} />

        {corridors.map((corridor) => {
          const isSelected = selected?.id === corridor.id;
          const linkClass = LINK_CLASS[corridor.health ?? 'green'] ?? LINK_CLASS.green;
          const lines: [number, number][][] = [];

          for (const edge of corridor.edges) {
            const a = byCode.get(edge.source);
            const b = byCode.get(edge.target);
            if (a && b && Number.isFinite(a.lat) && Number.isFinite(b.lat)) {
              lines.push([
                [a.lat, a.lon],
                [b.lat, b.lon],
              ]);
            }
          }

          return (
            <React.Fragment key={corridor.id}>
              {lines.map((pts, i) => (
                <Polyline
                  key={`${corridor.id}-${i}`}
                  positions={pts}
                  className={linkClass}
                  weight={isSelected ? 5 : 3}
                  opacity={isSelected ? 1 : 0.55}
                  eventHandlers={{ click: () => onCorridorSelect?.(corridor.id) }}
                />
              ))}
              {corridor.stations.map((station) =>
                Number.isFinite(station.lat) && Number.isFinite(station.lon) ? (
                  <Marker
                    key={`${corridor.id}-${station.code}`}
                    position={[station.lat, station.lon]}
                    icon={stationIcon(station.code)}
                    eventHandlers={{ click: () => onCorridorSelect?.(corridor.id) }}
                  >
                    <Popup>
                      <div style={{ fontFamily: "'Noto Sans', sans-serif", fontSize: 12 }}>
                        <strong className="text-navy">
                          {station.name} ({station.code})
                        </strong>
                        <div>Zone: {station.zone || '—'}</div>
                      </div>
                    </Popup>
                  </Marker>
                ) : null,
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 border border-hairline-strong rounded-chip px-2.5 py-1.5">
        <div className="section-label mb-1">Corridor condition</div>
        {(['green', 'amber', 'red'] as const).map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px] text-ink mb-0.5">
            <span
              className={cn(
                'w-4 h-[3px] rounded-sm',
                key === 'green' && 'bg-rail-green',
                key === 'amber' && 'bg-saffron',
                key === 'red' && 'bg-rail-red',
              )}
            />
            {key === 'green' ? 'All clear' : key === 'amber' ? '1–2 overdue' : '3+ overdue'}
          </div>
        ))}
      </div>
    </div>
  );
};
