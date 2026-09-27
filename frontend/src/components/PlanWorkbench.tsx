import { useEffect, useMemo, useState, type FC } from 'react';
import { Play, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { ApprovalModal } from '../components/ApprovalModal';
import { ExportButton } from '../components/ExportButton';
import { WarningBanner } from '../components/WarningBanner';
import { api, apiErrorMessage } from '../services/api';
import type { BlockPlanSummary, Corridor, PlanDetailResponse, PlanListItem } from '../services/types';
import { exportToExcel } from '../utils/exportUtils';

interface PlanWorkbenchProps {
  horizon: 'weekly' | 'monthly';
  title: string;
  titleHi: string;
  defaultDays: number;
}

const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daySpan = (startIso: string, endIso: string) => {
  const a = new Date(String(startIso).slice(0, 10)).getTime();
  const b = new Date(String(endIso).slice(0, 10)).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
};

export const PlanWorkbench: FC<PlanWorkbenchProps> = ({
  horizon,
  title,
  titleHi,
  defaultDays,
}) => {
  const [startDate, setStartDate] = useState(isoDay());
  const [days, setDays] = useState(defaultDays);
  const [corridorId, setCorridorId] = useState('');
  const [corridors, setCorridors] = useState<Corridor[]>([]);

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [detail, setDetail] = useState<PlanDetailResponse | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [busy, setBusy] = useState(false);

  const loadPlans = () => {
    setLoading(true);
    setError('');
    api.optimize
      .plans(horizon)
      .then((res) => {
        const items = res.items ?? res.plans ?? [];
        setPlans(items);
        if (items.length > 0 && !selectedPlanId) setSelectedPlanId(items[0].plan_id);
      })
      .catch((err) => {
        setPlans([]);
        setError(apiErrorMessage(err, `No ${horizon} programmes found.`));
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadPlans, [horizon]);

  useEffect(() => {
    let cancelled = false;
    api.corridors
      .list()
      .then((res) => {
        if (!cancelled) setCorridors(res.items ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlanId) return;
    let cancelled = false;
    api.optimize
      .plan(selectedPlanId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(apiErrorMessage(err, 'Plan detail unavailable.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlanId]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const res =
        horizon === 'weekly'
          ? await api.optimize.weekly({
              start_date: startDate,
              horizon_days: days,
              corridor_id: corridorId || undefined,
            })
          : await api.optimize.monthly({
              start_date: startDate,
              horizon_days: days,
              corridor_id: corridorId || undefined,
            });
      const lineage = res.based_on
        ? ` Built on ${res.based_on} — ${res.carried_over_tasks ?? 0} task${
            (res.carried_over_tasks ?? 0) === 1 ? '' : 's'
          } carried forward.`
        : ' No previous programme for this horizon — generated from live tasks only.';
      setNotice(
        `Generated ${res.plan_id} — ${res.total_blocks} blocks, ${res.total_tasks_scheduled} tasks, impact ${res.estimated_impact}.${lineage}`,
      );
      setSelectedPlanId(res.plan_id);
      loadPlans();
    } catch (err) {
      setError(apiErrorMessage(err, 'Plan generation failed.'));
    } finally {
      setGenerating(false);
    }
  };

  const applyDecision = async (reason: string) => {
    if (!decision || !selectedPlanId) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res =
        decision === 'approve'
          ? await api.audit.approve(selectedPlanId, reason)
          : await api.audit.reject(selectedPlanId, reason);
      setNotice(
        `${decision === 'approve' ? 'Approved' : 'Rejected'} ${selectedPlanId} · audit ${res.audit_id}`,
      );
      setDecision(null);
      loadPlans();
      if (detail) setDetail(await api.optimize.plan(selectedPlanId));
    } catch (err) {
      setError(apiErrorMessage(err, 'Decision could not be recorded.'));
    } finally {
      setBusy(false);
    }
  };

  const planColumns: Column<PlanListItem & { id: string }>[] = [
    {
      key: 'plan_id',
      name: 'Plan',
      render: (r) => <span className="mono text-[11px] font-bold">{r.plan_id}</span>,
    },
    { key: 'plan_type', name: 'Type', render: (r) => <span className="stamp active">{r.plan_type}</span> },
    {
      key: 'window',
      name: 'Window',
      render: (r) => (
        <span className="mono text-[10.5px]">
          {String(r.window.start).slice(0, 10)} → {String(r.window.end).slice(0, 10)}
        </span>
      ),
    },
    { key: 'total_blocks', name: 'Blocks', align: 'right', render: (r) => <span className="num">{r.total_blocks}</span> },
    {
      key: 'total_tasks_scheduled',
      name: 'Tasks',
      align: 'right',
      render: (r) => <span className="num">{r.total_tasks_scheduled}</span>,
    },
    { key: 'estimated_impact', name: 'Impact' },
    { key: 'status', name: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'created_at',
      name: 'Created',
      render: (r) => <span className="mono text-[10.5px]">{String(r.created_at).slice(0, 16).replace('T', ' ')}</span>,
    },
  ];

  const blockColumns: Column<BlockPlanSummary & { id: string }>[] = [
    { key: 'block_id', name: 'Block', render: (r) => <span className="mono text-[11px] font-bold">{r.block_id}</span> },
    { key: 'corridor_name', name: 'Corridor', render: (r) => r.corridor_name || r.corridor_id || '—' },
    { key: 'section', name: 'Section' },
    { key: 'window', name: 'Window', render: (r) => <span className="mono text-[10.5px]">{r.window}</span> },
    { key: 'departments', name: 'Depts', render: (r) => (r.departments ?? []).join(', ') },
    { key: 'task_count', name: 'Tasks', align: 'right', render: (r) => <span className="num">{r.task_count}</span> },
    { key: 'status', name: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const planRows = useMemo(() => plans.map((p) => ({ ...p, id: p.plan_id })), [plans]);
  const blockRows = useMemo(
    () => (detail?.blocks ?? []).map((b) => ({ ...b, id: b.block_id })),
    [detail],
  );

  const windowLabel = detail
    ? `${String(detail.window.start).slice(0, 10)} → ${String(detail.window.end).slice(0, 10)} · ${daySpan(
        String(detail.window.start),
        String(detail.window.end),
      )} days`
    : '—';

  return (
    <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
      <div className="page-head">
        <div className="min-w-0">
          <h1>
            {title}{' '}
            <span className="text-ink-muted font-normal text-[15px]" lang="hi">
              / {titleHi}
            </span>
          </h1>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            {horizon === 'weekly'
              ? 'Seven-day possession programme built by task merging plus OR-Tools CP-SAT.'
              : 'Thirty-day programme used for long-lead material and crew planning.'}
          </p>
          <p className="sys-meta mt-1">POST /optimize/{horizon} · GET /optimize/plans?horizon={horizon}</p>
        </div>

        <ExportButton
          onExportExcel={() =>
            exportToExcel(
              plans.map((p) => ({
                Plan: p.plan_id,
                Type: p.plan_type,
                Start: String(p.window.start).slice(0, 10),
                End: String(p.window.end).slice(0, 10),
                Blocks: p.total_blocks,
                Tasks: p.total_tasks_scheduled,
                Impact: p.estimated_impact,
                Status: p.status,
              })),
              `${horizon}-plans`,
              `${horizon} plans`,
            )
          }
          onExportPDF={() => window.print()}
        />
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

      {/* generation form */}
      <div className="m-card p-3 mb-4">
        <h2 className="section-label mb-2">Generate a new programme</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`${horizon}-start`} className="m-field-label">
              Start date
            </label>
            <input
              id={`${horizon}-start`}
              type="date"
              className="m-field w-[160px]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`${horizon}-days`} className="m-field-label">
              Horizon (days)
            </label>
            <input
              id={`${horizon}-days`}
              type="number"
              min={1}
              max={90}
              className="m-field w-[110px]"
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
            />
          </div>
          <div>
            <label htmlFor={`${horizon}-corridor`} className="m-field-label">
              Corridor (optional)
            </label>
            <select
              id={`${horizon}-corridor`}
              className="m-field w-[220px]"
              value={corridorId}
              onChange={(e) => setCorridorId(e.target.value)}
            >
              <option value="">All corridors</option>
              {corridors.map((c) => (
                <option key={c.corridor_id} value={c.corridor_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="m-btn primary" onClick={generate} disabled={generating}>
            <Play size={13} aria-hidden="true" />
            {generating ? 'Solving…' : `Generate ${horizon} plan`}
          </button>
          <span className="sys-meta ml-auto">
            Solver may return a partial plan if it hits the time cap — the degraded flag is shown in
            the detail panel.
          </span>
        </div>
        <p className="sys-meta mt-2 border-t border-hairline pt-2">
          Builds on:{' '}
          {plans[0]
            ? `${plans[0].plan_id} · ${plans[0].total_tasks_scheduled} tasks from that programme are carried forward when still pending`
            : 'no previous programme — first run for this horizon'}
        </p>
      </div>

      {/* plan list */}
      <section className="mb-4" aria-label={`${horizon} programmes`}>
        <DataTable
          columns={planColumns}
          data={planRows}
          onRowClick={(row) => setSelectedPlanId(row.plan_id)}
          activeId={selectedPlanId || null}
          emptyMessage={loading ? 'Loading programmes…' : `No ${horizon} programmes generated yet`}
          rowKey={(r) => r.id}
          pageSize={10}
        />
      </section>

      {/* detail */}
      {detail && (
        <section className="m-card overflow-hidden" aria-label="Plan detail">
          <div className="px-4 py-2.5 border-b border-hairline-strong flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-[13.5px] flex items-center gap-2">
                <FileText size={14} aria-hidden="true" />
                {detail.plan_id}
                <StatusBadge status={detail.status} />
                {detail.degraded && <span className="stamp pending">PARTIAL</span>}
              </h2>
              <p className="sys-meta">
                {detail.plan_type} · {windowLabel} · {detail.total_blocks} blocks ·{' '}
                {detail.total_tasks_scheduled} tasks · {detail.estimated_impact}
              </p>
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                className="m-btn success"
                onClick={() => setDecision('approve')}
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                Approve plan
              </button>
              <button type="button" className="m-btn danger" onClick={() => setDecision('reject')}>
                <XCircle size={13} aria-hidden="true" />
                Reject plan
              </button>
            </div>
          </div>
          <DataTable
            columns={blockColumns}
            data={blockRows}
            emptyMessage="This plan contains no blocks"
            rowKey={(r) => r.id}
            pageSize={10}
          />
        </section>
      )}

      {decision && (
        <ApprovalModal
          isOpen
          busy={busy}
          action={decision}
          entityId={selectedPlanId}
          entityType={`${horizon} programme`}
          onClose={() => setDecision(null)}
          onConfirm={applyDecision}
        />
      )}
    </div>
  );
};
