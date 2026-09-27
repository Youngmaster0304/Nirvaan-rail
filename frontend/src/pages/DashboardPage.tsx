import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, CalendarClock, AlertTriangle, Clock, Gauge, TrendingUp, Sparkles } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { DataTable, type Column } from '../components/DataTable';
import { WarningBanner } from '../components/WarningBanner';
import { AuditLogEntry } from '../components/AuditLogEntry';
import { StatusBadge } from '../components/StatusBadge';
import { AiRecommendations } from '../components/AiRecommendations';
import { api, apiErrorMessage } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { AuditEntry, CorridorKPI, PlanListItem, TaskItem } from '../services/types';

const pct = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : `${Math.round(v)}%`);

const istStamp = () =>
  `${new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })} IST`;

/** Day-over-day delta from a daily average series (asc). Empty when <2 days. */
const deltaProps = (series: number[], suffix: string) => {
  if (series.length < 2) return {};
  const delta = Math.round(series[series.length - 1] - series[series.length - 2]);
  if (Number.isNaN(delta)) return {};
  return {
    trend: (delta > 1 ? 'up' : delta < -1 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
    trendValue: `${delta > 0 ? '+' : ''}${delta} vs ${suffix}`,
  };
};

/** Register status from composite score — same bands as the reference register. */
const corridorStatus = (score: number) =>
  score >= 85
    ? { label: 'HEALTHY', cls: 'stamp approved' }
    : score >= 70
      ? { label: 'FAIR', cls: 'stamp pending' }
      : score >= 60
        ? { label: 'DEGRADED', cls: 'stamp medium' }
        : { label: 'CRITICAL', cls: 'stamp critical' };

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Alert {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [pending, setPending] = useState<TaskItem[]>([]);
  const [pendingTotal, setPendingTotal] = useState<number | null>(null);
  const [criticalTotal, setCriticalTotal] = useState<number | null>(null);
  const [kpis, setKpis] = useState<CorridorKPI[]>([]);
  const [kpiHistory, setKpiHistory] = useState<CorridorKPI[]>([]);
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [todayBlocks, setTodayBlocks] = useState<number | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisNotice, setAnalysisNotice] = useState('');
  const [syncedAt, setSyncedAt] = useState('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* ---- data load (also reused after Run AI Analysis) ------------------ */
  const load = useCallback(() => {
    setLoading(true);
    setError('');

    Promise.all([
      api.tasks.list({ status: 'PENDING', page_size: 100 }),
      api.tasks.list({ severity: 'Critical', status: 'PENDING', page_size: 1 }),
      api.corridors.kpis(),
      api.corridors.kpis(14),
      api.optimize.plans(),
      api.audit.list({ page: 1, page_size: 6 }),
      api.health.get(),
    ])
      .then(([pendingRes, criticalRes, kpiRes, histRes, planRes, auditRes, health]) => {
        if (!mounted.current) return;
        setPending(pendingRes.items ?? []);
        setPendingTotal(pendingRes.total ?? 0);
        setCriticalTotal(criticalRes.total ?? 0);
        setKpis(kpiRes.items ?? []);
        setKpiHistory(histRes.items ?? []);
        setPlans(planRes.items ?? planRes.plans ?? []);
        setActivity(auditRes.items ?? auditRes.entries ?? []);
        setApiOk(health.status === 'ok' || health.status === 'healthy');
        setSyncedAt(istStamp());
      })
      .catch((err) => {
        if (!mounted.current) return;
        setApiOk(false);
        setError(apiErrorMessage(err, 'The console could not reach the planning API.'));
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, []);

  useEffect(load, [load]);

  /* ---- Run AI Analysis (R4): score every pending task, refresh board -- */
  const runAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    setAnalysisNotice('');
    try {
      const res = await api.prioritize.run();
      setAnalysisNotice(
        `AI analysis complete — ${res.total_count} tasks scored · model ${res.model_version} · ${res.timestamp}`,
      );
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'AI analysis could not be run.'));
    } finally {
      setAnalyzing(false);
    }
  };

  /* ---- blocks scheduled for today ------------------------------------ */
  const covering = useMemo(() => {
    const key = todayKey();
    return plans.filter((p) => {
      const start = String(p.window?.start ?? '').slice(0, 10);
      const end = String(p.window?.end ?? '').slice(0, 10);
      return start <= key && key <= end;
    });
  }, [plans]);

  useEffect(() => {
    let cancelled = false;
    if (covering.length === 0) {
      setTodayBlocks(0);
      return;
    }
    api.optimize
      .plan(covering[0].plan_id)
      .then((detail) => {
        if (cancelled) return;
        const key = todayKey();
        setTodayBlocks(
          (detail.blocks ?? []).filter((b) => String(b.start_time ?? '').slice(0, 10) === key).length,
        );
      })
      .catch(() => {
        if (!cancelled) setTodayBlocks(null);
      });
    return () => {
      cancelled = true;
    };
  }, [covering, plans.length]);

  /* ---- derived KPIs --------------------------------------------------- */
  const overdueKnown = pending.some((t) => typeof t.days_overdue === 'number');
  const overdueCount = overdueKnown
    ? pending.filter((t) => (t.days_overdue ?? 0) > 0).length
    : null;

  const healthIndex = kpis.length
    ? Math.round(kpis.reduce((sum, k) => sum + (k.composite_score ?? 0), 0) / kpis.length)
    : null;
  const productivity = kpis.length
    ? Math.round(kpis.reduce((sum, k) => sum + (k.block_productivity ?? 0), 0) / kpis.length)
    : null;

  const compositeSpark = useMemo(() => {
    const byDate = new Map<string, number[]>();
    for (const k of kpiHistory) {
      const key = String(k.date ?? '').slice(0, 10);
      if (!key) continue;
      const list = byDate.get(key) ?? [];
      list.push(k.composite_score ?? 0);
      byDate.set(key, list);
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, vals]) => Math.round(vals.reduce((s, v) => s + v, 0) / vals.length));
  }, [kpiHistory]);

  const productivitySpark = useMemo(() => {
    const byDate = new Map<string, number[]>();
    for (const k of kpiHistory) {
      const key = String(k.date ?? '').slice(0, 10);
      if (!key) continue;
      const list = byDate.get(key) ?? [];
      list.push(k.block_productivity ?? 0);
      byDate.set(key, list);
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, vals]) => Math.round(vals.reduce((s, v) => s + v, 0) / vals.length));
  }, [kpiHistory]);

  /* ---- stats strip (all derived from rows already loaded) ------------- */
  const awaitingApproval = plans.filter(
    (p) => !String(p.status ?? '').toUpperCase().includes('APPROVED'),
  ).length;
  const productivity14dMean = productivitySpark.length
    ? Math.round(productivitySpark.reduce((s, v) => s + v, 0) / productivitySpark.length)
    : null;
  const efficiencyDelta =
    productivity14dMean !== null && productivity !== null ? productivity - productivity14dMean : null;

  /* ---- alerts --------------------------------------------------------- */
  const alerts: Alert[] = useMemo(() => {
    const out: Alert[] = [];
    if (apiOk === false) {
      out.push({ type: 'error', message: 'Planning API unreachable — figures below may be stale.' });
    }
    if (criticalTotal && criticalTotal > 0) {
      out.push({
        type: 'error',
        message: `${criticalTotal} critical defect${criticalTotal === 1 ? '' : 's'} pending in the register — immediate attention required.`,
      });
    }
    const weak = kpis.filter((k) => (k.composite_score ?? 100) < 60);
    if (weak.length > 0) {
      out.push({
        type: 'warning',
        message: `${weak.length} corridor${weak.length === 1 ? '' : 's'} below the 60% composite threshold: ${weak.map((k) => k.name).join(', ')}.`,
      });
    }
    const awaiting = plans.filter(
      (p) => !String(p.status ?? '').toUpperCase().includes('APPROVED'),
    );
    if (awaiting.length > 0) {
      out.push({
        type: 'warning',
        message: `${awaiting.length} generated plan${awaiting.length === 1 ? '' : 's'} awaiting dispatcher approval.`,
      });
    }
    if (out.length === 0) {
      out.push({ type: 'success', message: 'No active alerts. All corridors within threshold.' });
    }
    return out;
  }, [apiOk, criticalTotal, kpis, plans]);

  /* ---- corridor table -------------------------------------------------- */
  type CorridorRow = CorridorKPI & { id: string; status: string };
  const corridorColumns: Column<CorridorRow>[] = useMemo(
    () => [
      { key: 'name', name: 'Corridor / गलियारा', sortable: true },
      {
        key: 'punctuality',
        name: 'Punctuality',
        align: 'right',
        render: (r) => <span className="num">{pct(r.punctuality)}</span>,
      },
      {
        key: 'block_reliability',
        name: 'Block Reliability',
        align: 'right',
        render: (r) => <span className="num">{pct(r.block_reliability)}</span>,
      },
      {
        key: 'block_productivity',
        name: 'Block Productivity',
        align: 'right',
        render: (r) => <span className="num">{pct(r.block_productivity)}</span>,
      },
      {
        key: 'asset_failure_rate',
        name: 'Asset Failure Rate',
        align: 'right',
        render: (r) => {
          const v = r.asset_failure_rate ?? 0;
          return <span className="num">{pct(v <= 1.0001 ? v * 100 : v)}</span>;
        },
      },
      {
        key: 'composite_score',
        name: 'Composite Score',
        sortable: true,
        align: 'right',
        render: (r) => {
          const val = r.composite_score ?? 0;
          const cls =
            val < 50 ? 'stamp critical' : val <= 75 ? 'stamp pending' : 'stamp approved';
          return <span className={cls}>{Math.round(val)}%</span>;
        },
      },
      {
        key: 'status',
        name: 'Status',
        render: (r) => <span className={corridorStatus(r.composite_score ?? 0).cls}>{r.status}</span>,
      },
    ],
    [],
  );

  const corridorRows = useMemo(
    () =>
      kpis.map((k) => ({
        ...k,
        id: k.corridor_id,
        status: corridorStatus(k.composite_score ?? 0).label,
      })),
    [kpis],
  );

  /* ---- actions --------------------------------------------------------- */
  const generateWeekly = async () => {
    setGenerating(true);
    setError('');
    try {
      await api.optimize.weekly();
      navigate('/weekly');
    } catch (err) {
      setError(apiErrorMessage(err, 'Weekly plan generation failed.'));
    } finally {
      setGenerating(false);
    }
  };

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
      <div className="page-head">
        <div className="min-w-0">
          <h1>Operations Overview</h1>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            AI-Powered Automatic Block Planning System
          </p>
          <p className="sys-meta mt-1">
            {user?.division ? `${user.division} Division` : 'Division'} · {user?.zone ?? 'Zone'} ·{' '}
            {dateLabel}
            {syncedAt && <> · DATA SYNCED {syncedAt}</>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={apiOk === null ? 'stamp neutral' : apiOk ? 'stamp approved' : 'stamp critical'}>
            {apiOk === null ? 'CHECKING API' : apiOk ? 'ALL SYSTEMS OPERATIONAL' : 'API OFFLINE'}
          </span>
          <button type="button" className="m-btn" onClick={runAnalysis} disabled={analyzing || loading}>
            <Sparkles size={13} aria-hidden="true" />
            {analyzing ? 'Analysing…' : 'Run AI Analysis'}
          </button>
          <button type="button" className="m-btn" onClick={generateWeekly} disabled={generating}>
            <CalendarClock size={13} aria-hidden="true" />
            {generating ? 'Generating…' : 'Generate Weekly Plan'}
          </button>
          <button type="button" className="m-btn" onClick={() => navigate('/monthly')}>
            View Monthly Plan
          </button>
          <button type="button" className="m-btn primary" onClick={() => navigate('/tasks')}>
            View Pending Tasks
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3">
          <WarningBanner type="error" message={error} />
        </div>
      )}

      {analysisNotice && (
        <div className="mb-3">
          <WarningBanner type="success" message={analysisNotice} />
        </div>
      )}

      {/* 5 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
        <KPICard
          label="Total Pending Tasks"
          labelHi="कुल लंबित कार्य"
          value={loading ? '…' : (pendingTotal ?? '—')}
          icon={<CheckSquare size={14} />}
          source="/tasks?status=PENDING"
        />
        <KPICard
          label="Overdue Tasks"
          labelHi="अतिदेय कार्य"
          value={loading ? '…' : overdueCount === null ? '—' : overdueCount}
          icon={<Clock size={14} />}
          source={overdueKnown ? 'days_overdue > 0' : 'days_overdue not in /tasks payload'}
        />
        <KPICard
          label="Today's Blocks"
          labelHi="आज के ब्लॉक"
          value={loading ? '…' : todayBlocks === null ? '—' : todayBlocks}
          icon={<CalendarClock size={14} />}
          source="/optimize/plans · today"
        />
        <KPICard
          label="Corridor Health Index"
          labelHi="गलियारा स्वास्थ्य सूचकांक"
          value={loading ? '…' : healthIndex === null ? '—' : `${healthIndex}%`}
          unit={healthIndex === null ? undefined : 'avg'}
          {...deltaProps(compositeSpark, 'prev day')}
          spark={compositeSpark}
          icon={<TrendingUp size={14} />}
          source="mean composite /corridors/kpis"
        />
        <KPICard
          label="Block Productivity"
          labelHi="ब्लॉक उत्पादकता"
          value={loading ? '…' : productivity === null ? '—' : `${productivity}%`}
          {...deltaProps(productivitySpark, 'prev day')}
          spark={productivitySpark}
          icon={<Gauge size={14} />}
          source="mean productivity /corridors/kpis"
        />
      </div>

      {/* Corridor health */}
      <section className="mb-4" aria-labelledby="corridor-health-title">
        <div className="m-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-hairline-strong flex items-center justify-between gap-3">
            <div>
              <h2 id="corridor-health-title" className="text-[13.5px]">
                Corridor Health
              </h2>
              <span className="sys-meta">Corridor Track Condition Register · /corridors/kpis</span>
            </div>
            <button type="button" className="m-btn sm" onClick={() => navigate('/corridor-map')}>
              Open map
            </button>
          </div>
          <DataTable
            columns={corridorColumns}
            data={corridorRows}
            emptyMessage={loading ? 'Loading corridor KPIs…' : 'No corridor KPI rows returned'}
          />
        </div>
      </section>

      {/* AI recommendations — derived live from tasks / KPIs / plans */}
      <AiRecommendations onDecision={load} />

      {/* Live dispatch summary — every figure below derived from rows above */}
      <section className="m-card mb-4 overflow-hidden" aria-labelledby="dispatch-summary-title">
        <div className="px-4 py-2.5 border-b border-hairline-strong">
          <h2 id="dispatch-summary-title" className="text-[13.5px]">
            Live Dispatch Summary
          </h2>
          <span className="sys-meta">/optimize/plans · /corridors/kpis · /tasks</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-hairline">
          <div className="px-4 py-3">
            <div className="section-label">Pending Approvals</div>
            <div className="mono text-[22px] font-bold leading-none mt-1.5 tabular-nums text-ink">
              {loading ? '…' : awaitingApproval}
            </div>
            <div className="sys-meta mt-1">plans awaiting dispatcher decision</div>
          </div>
          <div className="px-4 py-3">
            <div className="section-label">Maintenance Efficiency</div>
            <div className="mono text-[22px] font-bold leading-none mt-1.5 tabular-nums text-ink">
              {loading || productivity === null ? '…' : `${productivity}%`}
            </div>
            <div className="sys-meta mt-1">
              {efficiencyDelta === null
                ? 'mean block productivity · /corridors/kpis'
                : `${efficiencyDelta > 0 ? '+' : ''}${efficiencyDelta} vs 14-day mean`}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="section-label">Open Critical Defects</div>
            <div className="mono text-[22px] font-bold leading-none mt-1.5 tabular-nums text-ink">
              {loading || criticalTotal === null ? '…' : criticalTotal}
            </div>
            <div className="sys-meta mt-1">severity=Critical · status=PENDING</div>
          </div>
        </div>
      </section>

      {/* Activity + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="m-card flex flex-col h-[380px]" aria-labelledby="activity-title">
          <div className="px-4 py-2.5 border-b border-hairline-strong flex items-center justify-between">
            <div>
              <h2 id="activity-title" className="text-[13.5px]">
                Recent Activity
              </h2>
              <span className="sys-meta">append-only audit trail · /audit</span>
            </div>
            <button type="button" className="m-btn sm" onClick={() => navigate('/audit')}>
              Full trail
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="px-4 py-6 text-[11.5px] text-ink-muted">
                {loading ? 'Loading audit entries…' : 'No audit entries recorded yet.'}
              </p>
            ) : (
              activity.map((entry) => <AuditLogEntry key={entry.audit_id} entry={entry} />)
            )}
          </div>
        </section>

        <section className="m-card flex flex-col h-[380px]" aria-labelledby="alerts-title">
          <div className="px-4 py-2.5 border-b border-hairline-strong">
            <h2 id="alerts-title" className="text-[13.5px]">
              System Alerts
            </h2>
            <span className="sys-meta">derived from live counts · /tasks · /corridors · /optimize</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {loading ? (
              <p className="text-[11.5px] text-ink-muted">Evaluating current conditions…</p>
            ) : (
              alerts.map((a, i) => <WarningBanner key={i} type={a.type} message={a.message} />)
            )}
            {!loading && criticalTotal !== null && criticalTotal > 0 && (
              <button type="button" className="m-btn" onClick={() => navigate('/tasks')}>
                <AlertTriangle size={13} aria-hidden="true" />
                Review critical tasks
              </button>
            )}
            {!loading && activity[0] && (
              <div className="mt-auto pt-2 border-t border-hairline">
                <span className="section-label">Last recorded action</span>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <StatusBadge status={activity[0].action} />
                  <span className="text-[11.5px]">{activity[0].user_name}</span>
                  <span className="sys-meta ml-auto">{activity[0].timestamp}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
