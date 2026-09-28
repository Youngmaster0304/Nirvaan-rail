import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { GanttChart, type GanttBlock } from '../components/GanttChart';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { ApprovalModal } from '../components/ApprovalModal';
import { WarningBanner } from '../components/WarningBanner';
import { api, apiErrorMessage } from '../services/api';
import type { BlockPlanSummary, PlanDetailResponse, PlanListItem } from '../services/types';

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hourOf = (iso?: string | null) => {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getHours() + d.getMinutes() / 60;
};

const durationOf = (block: BlockPlanSummary) => {
  if (!block.start_time || !block.end_time) return 2;
  const ms = new Date(block.end_time).getTime() - new Date(block.start_time).getTime();
  return Math.max(0.5, ms / 3_600_000);
};

const fmtHour = (h: number) => {
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

export const FIGMA_GANTT_BLOCKS: GanttBlock[] = [
  {
    block_id: 'BL-2081',
    label: 'P-Way Inspection',
    corridor: 'NDLS – CNB (Delhi–Kanpur)',
    fullName: 'Delhi – Kanpur',
    zone: 'NCR',
    dept: 'P-Way',
    departments: ['Engineering', 'P-Way'],
    startHour: 6,
    duration: 3,
    status: 'active',
    impact: 'Medium',
    trainsAffected: 4,
    eng: 'JE/PW/NDLS',
    taskCount: 4,
  },
  {
    block_id: 'BL-2082',
    label: 'OHE Maintenance',
    corridor: 'NDLS – CNB (Delhi–Kanpur)',
    fullName: 'Delhi – Kanpur',
    zone: 'NCR',
    dept: 'OHE',
    departments: ['Traction', 'OHE'],
    startHour: 14,
    duration: 3.5,
    status: 'scheduled',
    impact: 'Low',
    trainsAffected: 2,
    eng: 'SSE/TRD/CNB',
    taskCount: 2,
  },
  {
    block_id: 'BL-2083',
    label: 'Bridge Inspection',
    corridor: 'BCT – PUNE (Mumbai–Pune)',
    fullName: 'Mumbai – Pune',
    zone: 'WR',
    dept: 'Bridge',
    departments: ['Engineering', 'Bridge'],
    startHour: 2,
    duration: 3,
    status: 'active',
    impact: 'Low',
    trainsAffected: 1,
    eng: 'AEN/BR/BCT',
    taskCount: 1,
  },
  {
    block_id: 'BL-2084',
    label: 'Signal Testing',
    corridor: 'BCT – PUNE (Mumbai–Pune)',
    fullName: 'Mumbai – Pune',
    zone: 'WR',
    dept: 'Signal',
    departments: ['S&T', 'Signal'],
    startHour: 11,
    duration: 2,
    status: 'scheduled',
    impact: 'Low',
    trainsAffected: 2,
    eng: 'JE/SIG/PUNE',
    taskCount: 2,
  },
  {
    block_id: 'BL-2090',
    label: 'Track Tamping',
    corridor: 'BCT – PUNE (Mumbai–Pune)',
    fullName: 'Mumbai – Pune',
    zone: 'WR',
    dept: 'P-Way',
    departments: ['Engineering'],
    startHour: 20,
    duration: 3,
    status: 'scheduled',
    impact: 'Low',
    trainsAffected: 1,
    eng: 'SSE/PW/LNL',
    taskCount: 1,
  },
  {
    block_id: 'BL-2085',
    label: 'Rail Grinding',
    corridor: 'MAS – SBC (Chennai–Bengaluru)',
    fullName: 'Chennai – Bengaluru',
    zone: 'SR',
    dept: 'P-Way',
    departments: ['Engineering'],
    startHour: 8,
    duration: 4,
    status: 'active',
    impact: 'High',
    trainsAffected: 6,
    eng: 'SSE/PW/JTJ',
    taskCount: 3,
  },
  {
    block_id: 'BL-2086',
    label: 'OHE Wire Repl.',
    corridor: 'HWH – DHN (Kolkata–Dhanbad)',
    fullName: 'Kolkata – Dhanbad',
    zone: 'ER',
    dept: 'OHE',
    departments: ['Traction'],
    startHour: 16,
    duration: 6,
    status: 'scheduled',
    impact: 'High',
    trainsAffected: 5,
    eng: 'SSE/TRD/ASN',
    taskCount: 3,
  },
  {
    block_id: 'BL-2087',
    label: 'Track Tamping',
    corridor: 'JP – ADI (Jaipur–Ahmedabad)',
    fullName: 'Jaipur – Ahmedabad',
    zone: 'NWR',
    dept: 'P-Way',
    departments: ['Engineering'],
    startHour: 3,
    duration: 3.5,
    status: 'approved',
    impact: 'Low',
    trainsAffected: 1,
    eng: 'JE/PW/FL',
    taskCount: 1,
  },
  {
    block_id: 'BL-2088',
    label: 'Signal Maint.',
    corridor: 'JP – ADI (Jaipur–Ahmedabad)',
    fullName: 'Jaipur – Ahmedabad',
    zone: 'NWR',
    dept: 'Signal',
    departments: ['S&T'],
    startHour: 19,
    duration: 2,
    status: 'scheduled',
    impact: 'Low',
    trainsAffected: 2,
    eng: 'JE/SIG/ADI',
    taskCount: 2,
  },
  {
    block_id: 'BL-2089',
    label: 'EMERGENCY: Fracture Repair',
    corridor: 'LKO – BSB (Lucknow–Varanasi)',
    fullName: 'Lucknow – Varanasi',
    zone: 'NER',
    dept: 'P-Way',
    departments: ['Engineering'],
    startHour: 7,
    duration: 7,
    status: 'critical',
    impact: 'Critical',
    trainsAffected: 9,
    eng: 'AEN/3/NER — URGENT',
    taskCount: 5,
    emergency: true,
  },
  {
    block_id: 'BL-2091',
    label: 'Track Renewal',
    corridor: 'NDLS – MTJ (Delhi–Mathura)',
    fullName: 'Delhi – Mathura',
    zone: 'NCR',
    dept: 'P-Way',
    departments: ['Engineering'],
    startHour: 1,
    duration: 3,
    status: 'approved',
    impact: 'Medium',
    trainsAffected: 3,
    eng: 'SSE/PW/MTJ',
    taskCount: 2,
  },
  {
    block_id: 'BL-2092',
    label: 'Weld Inspection',
    corridor: 'NDLS – MTJ (Delhi–Mathura)',
    fullName: 'Delhi – Mathura',
    zone: 'NCR',
    dept: 'P-Way',
    departments: ['Engineering'],
    startHour: 18,
    duration: 2.5,
    status: 'scheduled',
    impact: 'Low',
    trainsAffected: 2,
    eng: 'JE/PW/AGC',
    taskCount: 1,
  },
];

export default function BlockPlanningPage() {
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [planId, setPlanId] = useState('');
  const [detail, setDetail] = useState<PlanDetailResponse | null>(null);

  const [day, setDay] = useState(isoDay(new Date()));
  const [view, setView] = useState<'gantt' | 'register'>('gantt');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [busy, setBusy] = useState(false);

  /* plans */
  useEffect(() => {
    let cancelled = false;
    api.optimize
      .plans()
      .then((res) => {
        const items = res.items ?? res.plans ?? [];
        if (cancelled) return;
        setPlans(items);
        const today = isoDay(new Date());
        const covering =
          items.find(
            (p) => String(p.window.start).slice(0, 10) <= today && today <= String(p.window.end).slice(0, 10),
          ) ?? items[0];
        if (covering) setPlanId(covering.plan_id);
        else setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(apiErrorMessage(err, 'No block programmes have been generated yet.'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* plan detail */
  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api.optimize
      .plan(planId)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
        const start = String(res.window.start).slice(0, 10);
        const end = String(res.window.end).slice(0, 10);
        const today = isoDay(new Date());
        setDay(today >= start && today <= end ? today : start);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(apiErrorMessage(err, 'Plan detail unavailable.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const selectedPlan = plans.find((p) => p.plan_id === planId) ?? null;
  const awaitingApproval = plans.filter(
    (p) => !String(p.status ?? '').toUpperCase().includes('APPROVED'),
  ).length;

  const dayBlocks = useMemo(() => {
    if (!detail || !detail.blocks || detail.blocks.length === 0) return [];
    return detail.blocks.filter((b) => String(b.start_time ?? '').slice(0, 10) === day);
  }, [detail, day]);

  const rawGanttList: GanttBlock[] = useMemo(() => {
    if (dayBlocks.length > 0) {
      return dayBlocks.map((b) => ({
        block_id: b.block_id,
        label: (b.departments && b.departments[0]) ? `${b.departments[0]} Maintenance` : 'Possession Window',
        corridor: b.corridor_name || b.corridor_id || b.section,
        startHour: hourOf(b.start_time),
        duration: durationOf(b),
        departments: b.departments ?? [],
        dept: b.departments && b.departments[0] ? b.departments[0] : 'Engineering',
        status: b.status,
        taskCount: b.task_count,
        impact: b.impact_score && b.impact_score > 6 ? 'Critical' : b.impact_score && b.impact_score > 3 ? 'Medium' : 'Low',
        trainsAffected: b.impact_score ? Math.round(b.impact_score) : 2,
        eng: 'CPTM Controller Allocated',
        emergency: String(b.status).toUpperCase().includes('EMERG') || b.emergency === true,
      }));
    }
    return FIGMA_GANTT_BLOCKS;
  }, [dayBlocks]);

  const filtered = useMemo(
    () =>
      rawGanttList.filter((b) => {
        if (dept && !b.departments.some((d) => d.toLowerCase().includes(dept.toLowerCase()))) return false;
        if (status && String(b.status).toUpperCase() !== status.toUpperCase()) return false;
        return true;
      }),
    [rawGanttList, dept, status],
  );

  const ganttBlocks: GanttBlock[] = filtered;

  const isToday = day === isoDay(new Date());
  const nowHour = isToday ? new Date().getHours() + new Date().getMinutes() / 60 : undefined;

  const applyDecision = async (reason: string) => {
    if (!decision || !planId) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res =
        decision === 'approve'
          ? await api.audit.approve(planId, reason)
          : await api.audit.reject(planId, reason);
      setNotice(
        `${decision === 'approve' ? 'Approved' : 'Rejected'} ${planId} · audit entry ${res.audit_id}`,
      );
      setDecision(null);
      const refreshed = await api.optimize.plans();
      setPlans(refreshed.items ?? refreshed.plans ?? []);
      if (detail) setDetail(await api.optimize.plan(planId));
    } catch (err) {
      setError(apiErrorMessage(err, 'Decision could not be recorded.'));
    } finally {
      setBusy(false);
    }
  };

  const registerColumns: Column<BlockPlanSummary & { id: string }>[] = [
    {
      key: 'block_id',
      name: 'Block',
      render: (r) => <span className="mono text-[11px] font-bold">{r.block_id}</span>,
    },
    { key: 'corridor_name', name: 'Corridor', render: (r) => r.corridor_name || r.corridor_id || '—' },
    { key: 'section', name: 'Section' },
    { key: 'window', name: 'Window', render: (r) => <span className="mono text-[10.5px]">{r.window}</span> },
    { key: 'departments', name: 'Depts', render: (r) => (r.departments ?? []).join(', ') },
    { key: 'task_count', name: 'Tasks', align: 'right', render: (r) => <span className="num">{r.task_count}</span> },
    {
      key: 'impact_score',
      name: 'Impact',
      align: 'right',
      render: (r) => <span className="num">{(r.impact_score ?? 0).toFixed(1)}</span>,
    },
    { key: 'status', name: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const registerRows: (BlockPlanSummary & { id: string })[] = filtered.map((b) => ({
    ...b,
    id: b.block_id,
    block_id: b.block_id,
    section: b.fullName || b.corridor,
    window: `${fmtHour(b.startHour)} – ${fmtHour(b.startHour + b.duration)} (${b.duration.toFixed(1)}h)`,
    departments: b.departments ?? [b.dept || 'Engineering'],
    task_count: b.taskCount ?? 2,
    status: b.status,
    corridor_id: b.corridor,
    corridor_name: b.fullName || b.corridor,
    impact_score: b.trainsAffected ?? 2,
    trains_affected: b.trainsAffected ?? 2,
    emergency: b.emergency ?? false,
  }));

  const dayOptions = useMemo(() => {
    if (!detail) return [] as string[];
    const start = new Date(detail.window.start);
    const end = new Date(detail.window.end);
    const out: string[] = [];
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) out.push(isoDay(new Date(t)));
    return out;
  }, [detail]);

  const statBox = (label: string, value: string | number, meta?: string) => (
    <div className="border border-hairline bg-white rounded-chip px-2.5 py-2">
      <div className="section-label">{label}</div>
      <div className="mono text-[18px] font-bold text-ink leading-tight mt-0.5">{value}</div>
      {meta && <div className="sys-meta truncate">{meta}</div>}
    </div>
  );

  return (
    <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
      <div className="page-head">
        <div className="min-w-0">
          <h1>
            Block Programme{' '}
            <span className="text-ink-muted font-normal text-[15px]" lang="hi">
              / ब्लॉक कार्यक्रम
            </span>
          </h1>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            Possession-free windows by corridor, generated by the CP-SAT planner.
          </p>
          <p className="sys-meta mt-1">
            {planId ? `plan ${planId}` : 'no plan selected'}
            {detail ? ` · ${detail.window.days}d window · ${detail.estimated_impact}` : ''}
            {detail?.degraded ? ' · partial plan (solver time cap reached)' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="plan-select" className="m-field-label mb-0 self-end pb-1.5">
            Programme
          </label>
          <select
            id="plan-select"
            className="m-field w-[250px]"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            {plans.length === 0 && <option value="">No plans generated</option>}
            {plans.map((p) => (
              <option key={p.plan_id} value={p.plan_id}>
                {p.plan_type} · {p.plan_id} · {String(p.window.start).slice(0, 10)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="m-btn success"
            disabled={!planId}
            onClick={() => setDecision('approve')}
          >
            <CheckCircle2 size={13} aria-hidden="true" />
            Approve
          </button>
          <button
            type="button"
            className="m-btn danger"
            disabled={!planId}
            onClick={() => setDecision('reject')}
          >
            <XCircle size={13} aria-hidden="true" />
            Reject
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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_270px] gap-4">
        <div className="min-w-0">
          <div className="m-card p-2.5 mb-3 flex flex-wrap items-end gap-3">
            <div className="flex border border-hairline-strong rounded-chip overflow-hidden">
              {(['gantt', 'register'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={
                    view === v
                      ? 'px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide bg-navy text-white'
                      : 'px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide bg-white text-ink-muted hover:bg-tints-600'
                  }
                >
                  {v === 'gantt' ? 'View: Gantt' : 'View: Register'}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="g-day" className="m-field-label">
                Programme day
              </label>
              <input
                id="g-day"
                type="date"
                className="m-field w-[160px]"
                value={day}
                min={dayOptions[0]}
                max={dayOptions[dayOptions.length - 1]}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="g-dept" className="m-field-label">
                Dept
              </label>
              <select id="g-dept" className="m-field w-[140px]" value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="">All departments</option>
                <option value="Engineering">Engineering</option>
                <option value="S&T">S&amp;T</option>
                <option value="Traction">Traction</option>
              </select>
            </div>

            <div>
              <label htmlFor="g-status" className="m-field-label">
                Status
              </label>
              <select
                id="g-status"
                className="m-field w-[140px]"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ACTIVE">Active</option>
                <option value="APPROVED">Approved</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>

            <span className="sys-meta ml-auto">
              {filtered.length} of {dayBlocks.length} blocks on {day}
            </span>
          </div>

          {view === 'gantt' ? (
            <GanttChart
              blocks={ganttBlocks}
              nowHour={nowHour}
              emptyMessage={
                loading ? 'Loading programme…' : `No blocks scheduled on ${day} for the current filters.`
              }
            />
          ) : (
            <DataTable
              columns={registerColumns}
              data={registerRows}
              emptyMessage={loading ? 'Loading programme…' : 'No blocks scheduled on this day'}
              rowKey={(r) => r.id}
            />
          )}

          <div className="flex flex-wrap gap-3 mt-3">
            <span className="flex items-center gap-1.5 sys-meta">
              <span className="dept-eng w-4 h-2.5 rounded-[2px]" />
              Engineering
            </span>
            <span className="flex items-center gap-1.5 sys-meta">
              <span className="dept-snt w-4 h-2.5 rounded-[2px]" />
              S&amp;T
            </span>
            <span className="flex items-center gap-1.5 sys-meta">
              <span className="dept-trd w-4 h-2.5 rounded-[2px]" />
              Traction
            </span>
            <span className="flex items-center gap-1.5 sys-meta ml-auto">
              <RefreshCw size={11} aria-hidden="true" />
              24-hour local-time axis
            </span>
          </div>
        </div>

        <aside className="flex flex-col gap-3" aria-label="Programme statistics">
          <div className="m-card p-3">
            <h2 className="section-label mb-2">Programme totals</h2>
            <div className="flex flex-col gap-2">
              {statBox('Total blocks', detail?.total_blocks ?? (loading ? '…' : 0), planId || '—')}
              {statBox(
                'Tasks scheduled',
                detail?.total_tasks_scheduled ?? (loading ? '…' : 0),
                'merged into possession windows',
              )}
              {statBox('Blocks this day', dayBlocks.length, day)}
            </div>
          </div>

          <div className="m-card p-3">
            <h2 className="section-label mb-2">Block status</h2>
            <div className="flex flex-col gap-2">
              {statBox(
                'Active now',
                detail
                  ? detail.blocks.filter((b) => String(b.status).toUpperCase() === 'ACTIVE').length
                  : '—',
                'status = ACTIVE',
              )}
              {statBox(
                'Approved',
                detail
                  ? detail.blocks.filter((b) => String(b.status).toUpperCase() === 'APPROVED').length
                  : '—',
                'status = APPROVED',
              )}
              {statBox(
                'Emergency',
                detail
                  ? detail.blocks.filter((b) => String(b.status).toUpperCase().includes('EMERG')).length
                  : '—',
                'flagged by the planner',
              )}
            </div>
          </div>

          <div className="m-card p-3">
            <h2 className="section-label mb-2">Approval queue</h2>
            <div className="flex flex-col gap-2">
              {statBox('Pending approvals', awaitingApproval, 'plans not yet approved')}
              {statBox(
                'Plan status',
                selectedPlan?.status ?? '—',
                selectedPlan ? `created ${String(selectedPlan.created_at).slice(0, 10)}` : 'select a plan',
              )}
            </div>
            <p className="sys-meta mt-2 leading-relaxed">
              Approval and rejection are written to the append-only audit trail with your employee ID
              via POST /approve and /reject.
            </p>
          </div>
        </aside>
      </div>

      {decision && (
        <ApprovalModal
          isOpen
          busy={busy}
          action={decision}
          entityId={planId}
          entityType="Block programme"
          onClose={() => setDecision(null)}
          onConfirm={applyDecision}
        />
      )}
    </div>
  );
}
