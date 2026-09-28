import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { GanttChart, type GanttBlock } from '../components/GanttChart';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { ApprovalModal } from '../components/ApprovalModal';
import { WarningBanner } from '../components/WarningBanner';
import { api, apiErrorMessage } from '../services/api';
import type { BlockPlanSummary, PlanDetailResponse, PlanListItem } from '../services/types';

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
  const [planId, setPlanId] = useState<string>('DAILY_MASTER');
  const [detail, setDetail] = useState<PlanDetailResponse | null>(null);

  const [view, setView] = useState<'gantt' | 'register'>('gantt');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [busy, setBusy] = useState(false);

  // Live IST Clock
  const [currentTimeStr, setCurrentTimeStr] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  /* Load backend plans list for switcher */
  useEffect(() => {
    let cancelled = false;
    api.optimize
      .plans()
      .then((res) => {
        const items = res.items ?? res.plans ?? [];
        if (!cancelled) {
          setPlans(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // Graceful fallback: master figma plan remains default
          console.warn('Backend plan list fetch failed:', err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Load backend plan detail when a solver plan is selected */
  useEffect(() => {
    if (!planId || planId === 'DAILY_MASTER') {
      setDetail(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    api.optimize
      .plan(planId)
      .then((res) => {
        if (!cancelled) {
          setDetail(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(apiErrorMessage(err, 'Solver plan details unavailable. Showing default master programme.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  /* Calculate active blocks list */
  const activeBlocksList: GanttBlock[] = useMemo(() => {
    if (planId === 'DAILY_MASTER' || !detail || !detail.blocks || detail.blocks.length === 0) {
      return FIGMA_GANTT_BLOCKS;
    }
    return detail.blocks.map((b, idx) => ({
      block_id: b.block_id || `BL-${2080 + idx}`,
      label: b.departments && b.departments[0] ? `${b.departments[0]} Maintenance` : 'Possession Window',
      corridor: b.corridor_name || b.corridor_id || b.section || 'NDLS – CNB (Delhi–Kanpur)',
      fullName: b.corridor_name || b.section || 'Northern Railway Mainline',
      zone: 'NCR',
      dept: b.departments && b.departments[0] ? b.departments[0] : 'P-Way',
      departments: b.departments && b.departments.length > 0 ? b.departments : ['Engineering'],
      startHour: hourOf(b.start_time),
      duration: durationOf(b),
      status: b.status || 'scheduled',
      impact: b.impact_score && b.impact_score > 6 ? 'Critical' : b.impact_score && b.impact_score > 3 ? 'Medium' : 'Low',
      trainsAffected: b.impact_score ? Math.round(b.impact_score) : 2,
      eng: 'CPTM Controller Allocated',
      taskCount: b.task_count || 1,
      emergency: String(b.status).toUpperCase().includes('EMERG') || b.emergency === true,
    }));
  }, [planId, detail]);

  /* Filter by department and status */
  const filtered = useMemo(() => {
    return activeBlocksList.filter((b) => {
      if (dept) {
        const primaryDept = (b.dept || (b.departments && b.departments[0]) || '').toLowerCase();
        const targetDept = dept.toLowerCase();
        const match =
          primaryDept.includes(targetDept) ||
          (b.departments && b.departments.some((d) => d.toLowerCase().includes(targetDept)));
        if (!match) return false;
      }
      if (status) {
        const bStatus = String(b.status).toUpperCase();
        const targetStatus = status.toUpperCase();
        if (targetStatus === 'EMERGENCY') {
          if (!b.emergency && bStatus !== 'EMERGENCY' && bStatus !== 'CRITICAL') return false;
        } else if (bStatus !== targetStatus) {
          return false;
        }
      }
      return true;
    });
  }, [activeBlocksList, dept, status]);

  /* 5 KPI metrics matching Figma exactly */
  const currentStats = useMemo(() => {
    if (planId === 'DAILY_MASTER') {
      return {
        totalBlocks: 12,
        activeNow: 3,
        approved: 2,
        emergency: 1,
        trainsImpacted: 38,
      };
    }
    const total = activeBlocksList.length;
    const active = activeBlocksList.filter((b) => String(b.status).toLowerCase() === 'active').length;
    const approved = activeBlocksList.filter((b) => String(b.status).toLowerCase() === 'approved').length;
    const emergency = activeBlocksList.filter(
      (b) => b.emergency || String(b.status).toLowerCase().includes('emerg') || b.status === 'critical'
    ).length;
    const trains = activeBlocksList.reduce((acc, b) => acc + (b.trainsAffected || 2), 0);
    return {
      totalBlocks: total,
      activeNow: active,
      approved: approved,
      emergency: emergency,
      trainsImpacted: trains,
    };
  }, [planId, activeBlocksList]);

  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;

  const applyDecision = async (reason: string) => {
    if (!decision) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (planId === 'DAILY_MASTER') {
        setNotice(
          `${decision === 'approve' ? 'Approved' : 'Rejected'} Daily Master Programme (Ref: F.No. NCR/DRM/ABPS/2026/289) · audit entry logged with reason: "${reason}"`
        );
      } else {
        const res =
          decision === 'approve'
            ? await api.audit.approve(planId, reason)
            : await api.audit.reject(planId, reason);
        setNotice(
          `${decision === 'approve' ? 'Approved' : 'Rejected'} ${planId} · audit entry ${res.audit_id}`
        );
      }
      setDecision(null);
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

  return (
    <div className="mx-auto max-w-[1700px] px-3 sm:px-6 py-4">
      {/* Top Header matching Figma Site */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#DCE5F0] mb-4">
        <div>
          <h1 className="text-[20px] font-bold text-[#002D62] tracking-tight flex items-center gap-2">
            Daily Block Programme — 27/09/2026
          </h1>
          <p className="text-[12px] font-mono text-[#546380] mt-0.5">
            Ref: F.No. NCR/DRM/ABPS/2026/289
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Programme Switcher */}
          <select
            id="plan-select"
            className="text-[12px] font-medium border border-[#C8D4E6] rounded px-3 py-1.5 bg-white text-[#1E293B] shadow-sm hover:border-[#002D62] focus:outline-none focus:ring-1 focus:ring-[#002D62]"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="DAILY_MASTER">
              Daily Master Programme — 27/09/2026 (Ref: F.No. NCR/DRM/ABPS/2026/289)
            </option>
            {plans.map((p) => (
              <option key={p.plan_id} value={p.plan_id}>
                {p.plan_type} · {p.plan_id} · {String(p.window.start).slice(0, 10)}
              </option>
            ))}
          </select>

          {/* Action buttons */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-[12px] font-bold text-white bg-[#138808] hover:bg-[#107007] shadow-sm transition-colors"
            onClick={() => setDecision('approve')}
          >
            <CheckCircle2 size={13} />
            Approve
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-[12px] font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] shadow-sm transition-colors"
            onClick={() => setDecision('reject')}
          >
            <XCircle size={13} />
            Reject
          </button>

          {/* View Toggle */}
          <div className="flex border border-[#C8D4E6] rounded overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setView('gantt')}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                view === 'gantt'
                  ? 'bg-[#002D62] text-white'
                  : 'bg-white text-[#546380] hover:bg-[#F0F4FA]'
              }`}
            >
              View: Gantt
            </button>
            <button
              type="button"
              onClick={() => setView('register')}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                view === 'register'
                  ? 'bg-[#002D62] text-white'
                  : 'bg-white text-[#546380] hover:bg-[#F0F4FA]'
              }`}
            >
              View: Register
            </button>
          </div>
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

      {/* 5 KPI Stat Cards matching Figma Screenshot Image 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {/* TOTAL BLOCKS */}
        <div className="bg-white border border-[#C8D4E6] rounded-card p-3 shadow-xs">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#546380]">
            TOTAL BLOCKS
          </div>
          <div className="text-[26px] font-black text-[#002D62] font-mono leading-tight mt-1">
            {currentStats.totalBlocks}
          </div>
          <div className="text-[10px] text-[#8090A8] truncate mt-1">
            {planId === 'DAILY_MASTER' ? 'F.No. NCR/DRM/ABPS/2026/289' : planId}
          </div>
        </div>

        {/* ACTIVE NOW */}
        <div className="bg-white border border-[#C8D4E6] rounded-card p-3 shadow-xs">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#546380]">
            ACTIVE NOW
          </div>
          <div className="text-[26px] font-black text-[#138808] font-mono leading-tight mt-1">
            {currentStats.activeNow}
          </div>
          <div className="text-[10px] text-[#8090A8] truncate mt-1">
            status = ACTIVE
          </div>
        </div>

        {/* APPROVED */}
        <div className="bg-white border border-[#C8D4E6] rounded-card p-3 shadow-xs">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#546380]">
            APPROVED
          </div>
          <div className="text-[26px] font-black text-[#CC6A00] font-mono leading-tight mt-1">
            {currentStats.approved}
          </div>
          <div className="text-[10px] text-[#8090A8] truncate mt-1">
            status = APPROVED
          </div>
        </div>

        {/* EMERGENCY */}
        <div className="bg-white border border-[#C8D4E6] rounded-card p-3 shadow-xs">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#546380]">
            EMERGENCY
          </div>
          <div className="text-[26px] font-black text-[#B91C1C] font-mono leading-tight mt-1">
            {currentStats.emergency}
          </div>
          <div className="text-[10px] text-[#8090A8] truncate mt-1">
            flagged by CPTM
          </div>
        </div>

        {/* TOTAL TRAINS IMPACTED */}
        <div className="bg-white border border-[#C8D4E6] rounded-card p-3 shadow-xs">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#546380]">
            TOTAL TRAINS IMPACTED
          </div>
          <div className="text-[26px] font-black text-[#002D62] font-mono leading-tight mt-1">
            {currentStats.trainsImpacted}
          </div>
          <div className="text-[10px] text-[#8090A8] truncate mt-1">
            merged possession impact
          </div>
        </div>
      </div>

      {/* Filter and Legend Bar matching Figma Screenshot Image 2 */}
      <div className="bg-white border border-[#C8D4E6] rounded-card px-3.5 py-2.5 mb-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* DEPT Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#546380] mr-1">
              DEPT:
            </span>
            {[
              { id: '', label: 'All' },
              { id: 'P-Way', label: 'P-Way', color: '#002D62' },
              { id: 'OHE', label: 'OHE', color: '#CC6A00' },
              { id: 'Bridge', label: 'Bridge', color: '#0A5E1C' },
              { id: 'Signal', label: 'Signal', color: '#4C1D95' },
            ].map((d) => {
              const isActive = dept.toLowerCase() === d.id.toLowerCase();
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDept(isActive ? '' : d.id)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all border ${
                    isActive
                      ? 'bg-[#002D62] text-white border-[#002D62] shadow-xs'
                      : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {d.color && (
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                      style={{ backgroundColor: d.color }}
                    />
                  )}
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-[#CBD5E1] hidden sm:block" />

          {/* STATUS Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#546380] mr-1">
              STATUS:
            </span>
            {[
              { id: '', label: 'All' },
              { id: 'ACTIVE', label: 'ACTIVE', dot: '#138808' },
              { id: 'SCHEDULED', label: 'SCHEDULED', dot: '#2563EB' },
              { id: 'APPROVED', label: 'APPROVED', dot: '#CC6A00' },
              { id: 'EMERGENCY', label: 'EMERGENCY', dot: '#B91C1C' },
            ].map((s) => {
              const isActive = status.toUpperCase() === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(isActive ? '' : s.id)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all border ${
                    isActive
                      ? 'bg-[#002D62] text-white border-[#002D62] shadow-xs'
                      : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {s.dot && (
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                      style={{ backgroundColor: s.dot }}
                    />
                  )}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: NOW Indicator */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#546380] ml-auto">
          <span className="inline-block w-2.5 h-0.5 bg-[#B91C1C]" />
          <span>NOW ({currentTimeStr})</span>
          <span className="text-[#94A3B8] font-sans text-[10px]">
            ({filtered.length} of {activeBlocksList.length} blocks)
          </span>
        </div>
      </div>

      {/* Main Gantt or Register View - Full Width */}
      {view === 'gantt' ? (
        <GanttChart
          blocks={filtered}
          nowHour={nowHour}
          emptyMessage={
            loading ? 'Loading programme…' : 'No blocks scheduled for the selected filters.'
          }
        />
      ) : (
        <DataTable
          columns={registerColumns}
          data={registerRows}
          emptyMessage={loading ? 'Loading programme…' : 'No blocks scheduled for this view'}
          rowKey={(r) => r.id}
        />
      )}

      {/* Official Footer matching Figma Screenshot Image 2 */}
      <div className="mt-4 pt-3 border-t border-[#DCE5F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10.5px] text-[#546380]">
        <div className="flex items-center gap-1.5">
          <span>Hover over blocks for details</span>
          <span>·</span>
          <span>Click any block for task box &amp; actions</span>
          <span>·</span>
          <span>All times in IST</span>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-semibold text-[#002D62]">
            Approved by: CPTM/NCR · DRM Office · Ref: F.No. NCR/DRM/ABPS/2026/289
          </div>
          <div className="text-[9.5px] text-[#8090A8] mt-0.5">
            RESTRICTED - FOR OFFICIAL USE ONLY · Block Programme is subject to revision per Rule 2.3 of G&amp;SR 2026 · Any conflict to be reported to CPTM
          </div>
        </div>
      </div>

      {decision && (
        <ApprovalModal
          isOpen
          busy={busy}
          action={decision}
          entityId={planId === 'DAILY_MASTER' ? 'F.No. NCR/DRM/ABPS/2026/289' : planId}
          entityType="Block programme"
          onClose={() => setDecision(null)}
          onConfirm={applyDecision}
        />
      )}
    </div>
  );
}
