import { useEffect, useMemo, useState } from 'react';
import { Play, Scale } from 'lucide-react';
import { WarningBanner } from '../components/WarningBanner';
import { DataTable, type Column } from '../components/DataTable';
import { api, apiErrorMessage } from '../services/api';
import type { PlanListItem, SimulationResult } from '../services/types';

const fmt = (v: unknown, suffix = '') => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return `${Number.isInteger(v) ? v : v.toFixed(1)}${suffix}`;
  return String(v);
};

interface ComparisonRow {
  id: string;
  metric: string;
  withAi: string;
  withoutAi: string;
}

export default function ImpactSimulationPage() {
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [planId, setPlanId] = useState('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.optimize
      .plans()
      .then((res) => {
        const items = res.items ?? res.plans ?? [];
        if (cancelled) return;
        setPlans(items);
        if (items.length > 0) setPlanId(items[0].plan_id);
        else setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(apiErrorMessage(err, 'No plans available to simulate.'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* stored result for the selected plan, when the backend has one */
  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api.simulate
      .results(planId)
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const run = async () => {
    if (!planId) return;
    setRunning(true);
    setError('');
    setNotice('');
    try {
      const res = await api.simulate.run(planId);
      setResult(res);
      setNotice(`Simulation completed for ${res.plan_id}.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Simulation failed.'));
    } finally {
      setRunning(false);
    }
  };

  const comparison: ComparisonRow[] = useMemo(() => {
    if (!result) return [];
    const keys = Array.from(
      new Set([...Object.keys(result.with_ai ?? {}), ...Object.keys(result.without_ai ?? {})]),
    );
    return keys.map((k) => ({
      id: k,
      metric: k.replace(/_/g, ' '),
      withAi: fmt(result.with_ai?.[k]),
      withoutAi: fmt(result.without_ai?.[k]),
    }));
  }, [result]);

  const comparisonColumns: Column<ComparisonRow>[] = [
    { key: 'metric', name: 'Metric' },
    { key: 'withAi', name: 'With AI planning', align: 'right' },
    { key: 'withoutAi', name: 'Without AI (manual)', align: 'right' },
    {
      key: 'id',
      name: 'Delta',
      align: 'right',
      render: (r) => {
        const a = Number(String(r.withAi).replace(/[^\d.-]/g, ''));
        const b = Number(String(r.withoutAi).replace(/[^\d.-]/g, ''));
        if (Number.isNaN(a) || Number.isNaN(b)) return <span className="sys-meta">—</span>;
        const delta = a - b;
        const cls = delta < 0 ? 'stamp approved' : delta > 0 ? 'stamp pending' : 'stamp neutral';
        return <span className={cls}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}</span>;
      },
    },
  ];

  const details = result?.details ?? null;
  const detailRows: ComparisonRow[] = useMemo(() => {
    if (!details || typeof details !== 'object') return [];
    return Object.entries(details).map(([k, v]) => ({
      id: k,
      metric: k.replace(/_/g, ' '),
      withAi: fmt(v),
      withoutAi: '',
    }));
  }, [details]);

  const detailColumns: Column<ComparisonRow>[] = [
    { key: 'metric', name: 'Detail' },
    { key: 'withAi', name: 'Value', align: 'right' },
  ];

  const headline = [
    { label: 'Trains affected', value: fmt(result?.trains_affected), meta: 'services touched by the plan' },
    { label: 'Avg delay (min)', value: fmt(result?.avg_delay_minutes), meta: 'mean added delay per service' },
    {
      label: 'Freight throughput',
      value: fmt(result?.freight_throughput_impact_pct, '%'),
      meta: 'impact on freight volume',
    },
    {
      label: 'Corridor capacity',
      value: fmt(result?.corridor_capacity_pct, '%'),
      meta: 'remaining capacity after the plan',
    },
  ];

  return (
    <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
      <div className="page-head">
        <div className="min-w-0">
          <h1>
            Impact Simulation{' '}
            <span className="text-ink-muted font-normal text-[15px]" lang="hi">
              / प्रभाव अनुकरण
            </span>
          </h1>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            Runs the impact simulator over a generated programme and compares AI scheduling against
            the manual baseline.
          </p>
          <p className="sys-meta mt-1">POST /simulate · GET /simulate/results/{'{plan_id}'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="sim-plan" className="m-field-label mb-0 self-end pb-1.5">
            Programme
          </label>
          <select
            id="sim-plan"
            className="m-field w-[260px] self-end"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            {plans.length === 0 && <option value="">No plans generated</option>}
            {plans.map((p) => (
              <option key={p.plan_id} value={p.plan_id}>
                {p.plan_type} · {p.plan_id}
              </option>
            ))}
          </select>
          <button type="button" className="m-btn primary" onClick={run} disabled={!planId || running}>
            <Play size={13} aria-hidden="true" />
            {running ? 'Simulating…' : 'Run simulation'}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-3">
          <WarningBanner type="success" message={notice} />
        </div>
      )}
      {error && (
        <div className="mb-3">
          <WarningBanner type="error" message={error} />
        </div>
      )}

      {!result && !loading && (
        <div className="m-card px-4 py-8 text-center">
          <p className="section-label mb-1">No simulation on file</p>
          <p className="sys-meta">
            Select a programme and press “Run simulation”. Results are stored against the plan id.
          </p>
        </div>
      )}
      {loading && !result && (
        <div className="m-card px-4 py-8 text-center">
          <p className="sys-meta">Loading stored simulation…</p>
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {headline.map((h) => (
              <section key={h.label} className="m-card p-3.5">
                <h2 className="section-label">{h.label}</h2>
                <div className="mono text-[26px] font-bold leading-none mt-1.5">{h.value}</div>
                <p className="sys-meta mt-1.5">{h.meta}</p>
              </section>
            ))}
          </div>

          <section className="m-card p-3.5 mb-4" aria-label="Plan summary">
            <div className="flex flex-wrap items-center gap-3">
              <span className="section-label">Plan under test</span>
              <span className="mono text-[12px] font-bold">{result.plan_id}</span>
              {result.scenario_name && <span className="stamp active">{result.scenario_name}</span>}
              <span className="sys-meta ml-auto">
                Model v2.1 · synthetic-labelled training data — figures are indicative, not a
                guarantee.
              </span>
            </div>
          </section>

          <section className="mb-4" aria-label="AI versus manual comparison">
            <div className="m-card px-4 py-2.5 mb-3 flex items-center gap-2">
              <Scale size={14} aria-hidden="true" />
              <h2 className="text-[13.5px]">With AI vs without AI</h2>
              <span className="sys-meta ml-auto">source: response.with_ai / response.without_ai</span>
            </div>
            <DataTable
              columns={comparisonColumns}
              data={comparison}
              emptyMessage="The simulator returned no comparison metrics for this plan"
              rowKey={(r) => r.id}
              pageSize={20}
            />
          </section>

          {detailRows.length > 0 && (
            <section aria-label="Simulation detail">
              <div className="m-card px-4 py-2.5 mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-[13.5px]">Simulation detail</h2>
                <span className="sys-meta">source: response.details</span>
              </div>
              <DataTable
                columns={detailColumns}
                data={detailRows}
                emptyMessage="No detail object returned"
                rowKey={(r) => r.id}
                pageSize={20}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
