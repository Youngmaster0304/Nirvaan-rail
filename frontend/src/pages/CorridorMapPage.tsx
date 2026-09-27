import { useEffect, useMemo, useState } from 'react';
import { MapPin, Layers } from 'lucide-react';
import { CorridorMap, type MapCorridor, type MapEdge, type MapStation } from '../components/CorridorMap';
import { DataTable, type Column } from '../components/DataTable';
import { WarningBanner } from '../components/WarningBanner';
import { api, apiErrorMessage } from '../services/api';
import type { Corridor, CorridorKPI } from '../services/types';

const asStation = (node: Record<string, unknown>): MapStation | null => {
  const lat = Number(node.lat);
  const lon = Number(node.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    id: String(node.id ?? node.code ?? ''),
    code: String(node.code ?? node.id ?? ''),
    name: String(node.name ?? node.code ?? ''),
    lat,
    lon,
    zone: node.zone ? String(node.zone) : undefined,
  };
};

const asEdge = (edge: Record<string, unknown>): MapEdge => ({
  source: String(edge.source ?? edge.from_code ?? ''),
  target: String(edge.target ?? edge.to_code ?? ''),
  name: edge.name ? String(edge.name) : undefined,
  distance_km: typeof edge.distance_km === 'number' ? edge.distance_km : undefined,
});

export default function CorridorMapPage() {
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [kpis, setKpis] = useState<CorridorKPI[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [mapCorridors, setMapCorridors] = useState<MapCorridor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.corridors.list(), api.corridors.kpis()])
      .then(([corridorRes, kpiRes]) => {
        if (cancelled) return;
        const items = corridorRes.items ?? [];
        setCorridors(items);
        setKpis(kpiRes.items ?? []);
        if (items.length > 0) setSelectedId(items[0].corridor_id);
        else setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(apiErrorMessage(err, 'Corridor master data unavailable.'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* topology for every corridor — the map needs lat/lon, one request each */
  useEffect(() => {
    if (corridors.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setGeoError('');

    Promise.allSettled(
      corridors.map(async (c) => {
        const topology = await api.corridors.topology(c.corridor_id);
        return {
          id: c.corridor_id,
          name: c.name,
          stations: (topology.nodes ?? []).map(asStation).filter((s): s is MapStation => s !== null),
          edges: (topology.edges ?? []).map(asEdge),
        } satisfies MapCorridor;
      }),
    ).then((results) => {
      if (cancelled) return;
      const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      const failed = results.filter((r) => r.status === 'rejected').length;
      setMapCorridors(ok);
      if (ok.length === 0) {
        setGeoError(
          'Station coordinates are unavailable for every corridor, so the map cannot be drawn. The register below still works.',
        );
      } else if (failed > 0) {
        setGeoError(`${failed} corridor topology request(s) failed and are missing from the map.`);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [corridors]);

  const kpiByCorridor = useMemo(() => {
    const map = new Map<string, CorridorKPI>();
    for (const k of kpis) map.set(k.corridor_id, k);
    return map;
  }, [kpis]);

  const healthOf = (corridorId: string): 'green' | 'amber' | 'red' => {
    const score = kpiByCorridor.get(corridorId)?.composite_score;
    if (score == null) return 'amber';
    return score >= 75 ? 'green' : score >= 60 ? 'amber' : 'red';
  };

  const withHealth: MapCorridor[] = useMemo(
    () => mapCorridors.map((c) => ({ ...c, health: healthOf(c.id) })),
    [mapCorridors, kpiByCorridor],
  );

  type Row = Corridor & { id: string };
  const columns: Column<Row>[] = [
    { key: 'name', name: 'Corridor / गलियारा', sortable: true },
    { key: 'zone', name: 'Zone', render: (r) => r.zone || '—' },
    {
      key: 'from_station_name',
      name: 'From',
      render: (r) => r.from_station_name || '—',
    },
    { key: 'to_station_name', name: 'To', render: (r) => r.to_station_name || '—' },
    {
      key: 'total_sections',
      name: 'Sections',
      align: 'right',
      render: (r) => <span className="num">{r.total_sections ?? r.sections?.length ?? 0}</span>,
    },
    {
      key: 'corridor_id',
      name: 'Composite',
      align: 'right',
      render: (r) => {
        const score = kpiByCorridor.get(r.corridor_id)?.composite_score;
        if (score == null) return <span className="sys-meta">no KPI</span>;
        const cls = score < 50 ? 'stamp critical' : score <= 75 ? 'stamp pending' : 'stamp approved';
        return <span className={cls}>{Math.round(score)}%</span>;
      },
    },
    {
      key: 'sections',
      name: 'Stations on map',
      align: 'right',
      render: (r) => (
        <span className="num">
          {mapCorridors.find((c) => c.id === r.corridor_id)?.stations.length ?? 0}
        </span>
      ),
    },
  ];

  const rows: Row[] = corridors.map((c) => ({ ...c, id: c.corridor_id }));

  const selectedKpi = kpiByCorridor.get(selectedId) ?? null;

  return (
    <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
      <div className="page-head">
        <div className="min-w-0">
          <h1>
            Corridor Map{' '}
            <span className="text-ink-muted font-normal text-[15px]" lang="hi">
              / गलियारा मानचित्र
            </span>
          </h1>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            Station graph drawn from /corridors and /corridors/{'{id}'}/topology.
          </p>
          <p className="sys-meta mt-1">
            {corridors.length} corridors · {mapCorridors.reduce((n, c) => n + c.stations.length, 0)}{' '}
            stations geocoded · tiles © OpenStreetMap contributors
          </p>
        </div>

        <label htmlFor="corridor-pick" className="m-field-label mb-0 self-end pb-1.5">
          Focus corridor
        </label>
        <select
          id="corridor-pick"
          className="m-field w-[260px] self-end"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {corridors.length === 0 && <option value="">No corridors</option>}
          {corridors.map((c) => (
            <option key={c.corridor_id} value={c.corridor_id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-3">
          <WarningBanner type="error" message={error} />
        </div>
      )}
      {geoError && (
        <div className="mb-3">
          <WarningBanner type="warning" message={geoError} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 mb-4">
        <div className="m-card overflow-hidden p-0">
          <div className="px-4 py-2.5 border-b border-hairline-strong flex items-center gap-2">
            <MapPin size={14} aria-hidden="true" />
            <h2 className="text-[13.5px]">Network view</h2>
            <span className="sys-meta ml-auto">
              {loading ? 'loading topology…' : 'divIcon markers — no external marker assets'}
            </span>
          </div>
          <div className="p-3">
            <CorridorMap
              corridors={withHealth}
              selectedCorridorId={selectedId}
              onCorridorSelect={setSelectedId}
              height={460}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-3" aria-label="Corridor KPI">
          <div className="m-card p-3">
            <h2 className="section-label mb-2 flex items-center gap-1.5">
              <Layers size={12} aria-hidden="true" />
              Selected corridor
            </h2>
            <div className="text-[14px] font-bold text-ink leading-tight">
              {corridors.find((c) => c.corridor_id === selectedId)?.name ?? '—'}
            </div>
            <dl className="kv-grid mt-2">
              <dt>Zone</dt>
              <dd>{corridors.find((c) => c.corridor_id === selectedId)?.zone || '—'}</dd>
              <dt>Sections</dt>
              <dd>
                {corridors.find((c) => c.corridor_id === selectedId)?.total_sections ?? 0}
              </dd>
              <dt>Punctuality</dt>
              <dd>{selectedKpi ? `${Math.round(selectedKpi.punctuality)}%` : '—'}</dd>
              <dt>Reliability</dt>
              <dd>{selectedKpi ? `${Math.round(selectedKpi.block_reliability)}%` : '—'}</dd>
              <dt>Productivity</dt>
              <dd>{selectedKpi ? `${Math.round(selectedKpi.block_productivity)}%` : '—'}</dd>
              <dt>Composite</dt>
              <dd>{selectedKpi ? `${Math.round(selectedKpi.composite_score)}%` : '—'}</dd>
              <dt>KPI date</dt>
              <dd>{selectedKpi?.date ? String(selectedKpi.date).slice(0, 10) : '—'}</dd>
            </dl>
          </div>

          <div className="m-card p-3">
            <h2 className="section-label mb-2">Condition key</h2>
            {[
              { cls: 'bg-rail-green', label: 'Composite ≥ 75% — all clear' },
              { cls: 'bg-saffron', label: 'Composite 60–74% — watch' },
              { cls: 'bg-rail-red', label: 'Composite < 60% — degraded' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2 mb-1.5 text-[11px] text-ink">
                <span className={`w-5 h-[3px] rounded-sm ${row.cls}`} />
                {row.label}
              </div>
            ))}
            <p className="sys-meta mt-2 leading-relaxed">
              Leaflet + OpenStreetMap raster tiles. If tiles cannot be fetched the network still
              renders as an empty canvas — the register below carries the data.
            </p>
          </div>
        </aside>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        onRowClick={(row) => setSelectedId(row.corridor_id)}
        activeId={selectedId || null}
        emptyMessage={loading ? 'Loading corridors…' : 'No corridors returned'}
        rowKey={(r) => r.id}
      />
    </div>
  );
}
