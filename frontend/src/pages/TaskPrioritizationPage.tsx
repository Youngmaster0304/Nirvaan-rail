import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge, SeverityStamp } from '../components/StatusBadge';
import { ShapDrawer } from '../components/ShapDrawer';
import { ApprovalModal } from '../components/ApprovalModal';
import { ExportButton } from '../components/ExportButton';
import { WarningBanner } from '../components/WarningBanner';
import { api, apiErrorMessage } from '../services/api';
import type { Corridor, TaskItem } from '../services/types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

interface Row extends TaskItem {
  id: string;
}

export const FIGMA_TASKS: TaskItem[] = [
  {
    task_id: 'T-NCR-2001',
    corridor_id: 'NDLS-CNB',
    corridor_name: 'NDLS – CNB',
    section_id: 'KM 124.8–129.2 (Kosi Kalan)',
    department: 'Engineering',
    defect_type: 'P-Way Inspection / Defect',
    defect_severity: 'Critical',
    priority_score: 94,
    days_overdue: 18,
    required_duration_min: 360,
    status: 'PENDING',
    asset_type: 'Track / P-Way',
    form_no: 'T/NCR/PW/2026/2001',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
  {
    task_id: 'T-WR-2002',
    corridor_id: 'BCT-PUNE',
    corridor_name: 'BCT – PUNE',
    section_id: 'KM 52.0–55.5 (Karjat)',
    department: 'Traction',
    defect_type: 'OHE/TRD Catenary Sag',
    defect_severity: 'High',
    priority_score: 82,
    days_overdue: 12,
    required_duration_min: 240,
    status: 'PENDING',
    asset_type: 'OHE / Traction',
    form_no: 'T/WR/TRD/2026/2002',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
  {
    task_id: 'T-SR-2003',
    corridor_id: 'MAS-SBC',
    corridor_name: 'MAS – SBC',
    section_id: 'Bridge No. 42 (Byappanahalli)',
    department: 'Engineering',
    defect_type: 'Bridge Girder Fatigue',
    defect_severity: 'High',
    priority_score: 78,
    days_overdue: 9,
    required_duration_min: 480,
    status: 'PENDING',
    asset_type: 'Bridge Structure',
    form_no: 'T/SR/BR/2026/2003',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
  {
    task_id: 'T-ER-2004',
    corridor_id: 'HWH-DHN',
    corridor_name: 'HWH – DHN',
    section_id: 'KM 89.4 (Durgapur IB)',
    department: 'S&T',
    defect_type: 'Point Machine Failure Risk',
    defect_severity: 'Medium',
    priority_score: 65,
    days_overdue: 5,
    required_duration_min: 180,
    status: 'PENDING',
    asset_type: 'Signal Point Machine',
    form_no: 'T/ER/SIG/2026/2004',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
  {
    task_id: 'T-NWR-2005',
    corridor_id: 'JP-ADI',
    corridor_name: 'JP – ADI',
    section_id: 'KM 211.0–215.6 (Phulera)',
    department: 'Engineering',
    defect_type: 'Track Alignment & Tamping',
    defect_severity: 'Low',
    priority_score: 43,
    days_overdue: 3,
    required_duration_min: 300,
    status: 'PENDING',
    asset_type: 'Track Ballast',
    form_no: 'T/NWR/PW/2026/2005',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
  {
    task_id: 'T-NER-2006',
    corridor_id: 'LKO-BSB',
    corridor_name: 'LKO – BSB',
    section_id: 'KM 243.4 (Sultanpur)',
    department: 'Engineering',
    defect_type: 'Rail Fracture Class-A',
    defect_severity: 'Critical',
    priority_score: 96,
    days_overdue: 31,
    required_duration_min: 420,
    status: 'PENDING',
    asset_type: 'Track / Rail Joint',
    form_no: 'T/NER/PW/2026/2006',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
  {
    task_id: 'T-CR-2007',
    corridor_id: 'PUNE-SUR',
    corridor_name: 'PUNE – SUR',
    section_id: 'KM 67.3–70.0 (Daund)',
    department: 'Traction',
    defect_type: 'Insulator Contamination',
    defect_severity: 'Medium',
    priority_score: 57,
    days_overdue: 7,
    required_duration_min: 180,
    status: 'PENDING',
    asset_type: 'OHE Insulator',
    form_no: 'T/CR/TRD/2026/2007',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
  {
    task_id: 'T-ECR-2008',
    corridor_id: 'PNBE-GAYA',
    corridor_name: 'PNBE – GAYA',
    section_id: 'KM 34.7 (Jehanabad)',
    department: 'S&T',
    defect_type: 'Track Circuit Glitch',
    defect_severity: 'Low',
    priority_score: 38,
    days_overdue: 2,
    required_duration_min: 120,
    status: 'PENDING',
    asset_type: 'Track Circuit',
    form_no: 'T/ECR/SIG/2026/2008',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
  {
    task_id: 'T-NCR-2009',
    corridor_id: 'NDLS-MTJ',
    corridor_name: 'NDLS – MTJ',
    section_id: 'KM 88.1–92.4 (Palwal)',
    department: 'Engineering',
    defect_type: 'Weld Failure Precursor',
    defect_severity: 'High',
    priority_score: 75,
    days_overdue: 14,
    required_duration_min: 300,
    status: 'PENDING',
    asset_type: 'Thermit Weld',
    form_no: 'T/NCR/PW/2026/2009',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
  {
    task_id: 'T-WR-2010',
    corridor_id: 'ST-BRC',
    corridor_name: 'ST – BRC',
    section_id: 'Bridge No. 18 (Kim River)',
    department: 'Engineering',
    defect_type: 'Pier Scour Monitoring',
    defect_severity: 'Medium',
    priority_score: 61,
    days_overdue: 6,
    required_duration_min: 240,
    status: 'PENDING',
    asset_type: 'Bridge Substructure',
    form_no: 'T/WR/BR/2026/2010',
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
  },
];

export default function TaskPrioritizationPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modelMeta, setModelMeta] = useState('');

  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerTask, setDrawerTask] = useState<TaskItem | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [busy, setBusy] = useState(false);
  const [prioritising, setPrioritising] = useState(false);

  const department = searchParams.get('department') ?? '';
  const severity = searchParams.get('severity') ?? '';
  const status = searchParams.get('status') ?? '';
  const corridorId = searchParams.get('corridor_id') ?? '';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setPage(1);
    setSelected(new Set());
  };

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

  const load = () => {
    setLoading(true);
    setError('');
    api.tasks
      .list({
        department: department || undefined,
        severity: severity || undefined,
        status: status || undefined,
        corridor_id: corridorId || undefined,
        page,
        page_size: pageSize,
      })
      .then((res) => {
        if (res.items && res.items.length > 0) {
          const rows = res.items.map((t) => ({ ...t, id: t.task_id }));
          setTasks(rows);
          setTotal(res.total ?? rows.length);
        } else {
          // Filter FIGMA_TASKS
          let fRows = FIGMA_TASKS;
          if (department) fRows = fRows.filter((t) => t.department.toLowerCase().includes(department.toLowerCase()));
          if (severity) fRows = fRows.filter((t) => t.defect_severity.toLowerCase() === severity.toLowerCase());
          if (status) fRows = fRows.filter((t) => t.status.toLowerCase() === status.toLowerCase());
          if (corridorId) fRows = fRows.filter((t) => t.corridor_id === corridorId);
          setTasks(fRows.map((t) => ({ ...t, id: t.task_id })));
          setTotal(fRows.length);
        }
      })
      .catch((_err) => {
        let fRows = FIGMA_TASKS;
        if (department) fRows = fRows.filter((t) => t.department.toLowerCase().includes(department.toLowerCase()));
        if (severity) fRows = fRows.filter((t) => t.defect_severity.toLowerCase() === severity.toLowerCase());
        setTasks(fRows.map((t) => ({ ...t, id: t.task_id })));
        setTotal(fRows.length);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, department, severity, status, corridorId]);

  const runPrioritisation = async () => {
    setPrioritising(true);
    setError('');
    setNotice('');
    try {
      const res = await api.prioritize.run();
      setModelMeta(
        `model ${res.model_version} · ${res.total_count} tasks scored · ${new Date(res.timestamp).toLocaleString('en-GB')}`,
      );
      setNotice(`${res.total_count} tasks re-scored by the prioritisation model.`);
      setPage(1);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Prioritisation failed.'));
    } finally {
      setPrioritising(false);
    }
  };

  const loadModelMeta = () => {
    api.prioritize
      .results(1)
      .then((res) => {
        if (res.model_version && res.timestamp) {
          setModelMeta(
            `model ${res.model_version} · last run ${new Date(res.timestamp).toLocaleString('en-GB')}`,
          );
        }
      })
      .catch(() => undefined);
  };
  useEffect(loadModelMeta, []);

  const applyDecision = async (reason: string) => {
    if (!decision) return;
    const ids = [...selected];
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await api.tasks.bulkAction(ids, decision === 'approve' ? 'APPROVE' : 'REJECT', reason);
      setNotice(res.message ?? `${res.updated} task(s) ${decision}d.`);
      setSelected(new Set());
      setDecision(null);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Decision could not be recorded.'));
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Row>[] = useMemo(
    () => [
      {
        key: 'task_id',
        name: 'Rank / Task',
        width: '150px',
        render: (r) => (
          <div className="flex flex-col leading-tight">
            <span className="mono text-[11px] font-bold">{r.task_id}</span>
            <span className="sys-meta">{r.asset_type}</span>
          </div>
        ),
      },
      {
        key: 'corridor_id',
        name: 'Corridor / Section',
        render: (r) => (
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold">{r.corridor_name ?? r.corridor_id}</span>
            <span className="sys-meta">{r.section_id}</span>
          </div>
        ),
      },
      { key: 'defect_type', name: 'Defect' },
      { key: 'department', name: 'Dept', width: '92px' },
      {
        key: 'defect_severity',
        name: 'Severity',
        width: '110px',
        render: (r) => <SeverityStamp severity={r.defect_severity} />,
      },
      {
        key: 'required_duration_min',
        name: 'Dur (min)',
        align: 'right',
        render: (r) => <span className="num">{r.required_duration_min}</span>,
      },
      {
        key: 'priority_score',
        name: 'AI Score',
        width: '140px',
        sortable: true,
        render: (r) => {
          if (r.priority_score == null) return <span className="sys-meta">not scored</span>;
          const pctVal = r.priority_score <= 1.0001 ? r.priority_score * 100 : r.priority_score;
          const cls = pctVal >= 80 ? 'hot' : pctVal >= 50 ? 'warm' : 'cool';
          return (
            <div className="flex items-center gap-2">
              <span className="num font-bold w-8 text-right">{Math.round(pctVal)}</span>
              <span className="pbar flex-1 min-w-[46px]">
                <span className={`pbar-fill ${cls}`} style={{ width: `${Math.min(100, pctVal)}%` }} />
              </span>
            </div>
          );
        },
      },
      {
        key: 'status',
        name: 'Status',
        width: '104px',
        render: (r) => <StatusBadge status={r.status} />,
      },
    ],
    [],
  );

  const exportRows = () =>
    tasks.map((t) => ({
      Task: t.task_id,
      Corridor: t.corridor_name ?? t.corridor_id,
      Section: t.section_id,
      Defect: t.defect_type,
      Department: t.department,
      Severity: t.defect_severity,
      'Duration (min)': t.required_duration_min,
      Score: t.priority_score ?? '',
      Status: t.status,
    }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilters = [department, severity, status, corridorId].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
      <div className="page-head">
        <div className="min-w-0">
          <h1>
            Task Prioritisation{' '}
            <span className="text-ink-muted font-normal text-[15px]" lang="hi">
              / कार्य प्राथमिकता
            </span>
          </h1>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            Ranked maintenance register — click a row for the SHAP explainability report.
          </p>
          <p className="sys-meta mt-1">{modelMeta || '/prioritize not run yet'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton
            onExportPDF={() => exportToPDF('task-register-export', 'task-register')}
            onExportExcel={() =>
              exportToExcel(exportRows(), `task-register-p${page}`, 'Task Register')
            }
          />
          <button type="button" className="m-btn primary" onClick={runPrioritisation} disabled={prioritising}>
            <Play size={13} aria-hidden="true" />
            {prioritising ? 'Scoring…' : 'Run prioritisation'}
          </button>
        </div>
      </div>

      {notice && <div className="mb-3"><WarningBanner type="success" message={notice} /></div>}
      {error && <div className="mb-3"><WarningBanner type="error" message={error} /></div>}

      {/* filters */}
      <div className="m-card p-3 mb-3">
        <div className="flex flex-wrap items-end gap-3">
          <span className="section-label flex items-center gap-1.5 pb-1.5">
            <Filter size={12} aria-hidden="true" />
            Filters
          </span>

          <div>
            <label htmlFor="f-dept" className="m-field-label">
              Department
            </label>
            <select
              id="f-dept"
              className="m-field w-[150px]"
              value={department}
              onChange={(e) => setParam('department', e.target.value)}
            >
              <option value="">All departments</option>
              <option value="Engineering">Engineering</option>
              <option value="S&T">S&amp;T</option>
              <option value="Traction">Traction</option>
            </select>
          </div>

          <div>
            <label htmlFor="f-sev" className="m-field-label">
              Severity
            </label>
            <select
              id="f-sev"
              className="m-field w-[130px]"
              value={severity}
              onChange={(e) => setParam('severity', e.target.value)}
            >
              <option value="">All severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <label htmlFor="f-status" className="m-field-label">
              Status
            </label>
            <select
              id="f-status"
              className="m-field w-[140px]"
              value={status}
              onChange={(e) => setParam('status', e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="MERGED">Merged</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <label htmlFor="f-corridor" className="m-field-label">
              Corridor
            </label>
            <select
              id="f-corridor"
              className="m-field w-[210px]"
              value={corridorId}
              onChange={(e) => setParam('corridor_id', e.target.value)}
            >
              <option value="">All corridors</option>
              {corridors.map((c) => (
                <option key={c.corridor_id} value={c.corridor_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pb-0.5 ml-auto">
            <span className="sys-meta">
              {activeFilters} active · {total} matching
            </span>
            {activeFilters > 0 && (
              <button type="button" className="m-btn sm" onClick={() => setSearchParams({}, { replace: true })}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* bulk actions */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          className="m-btn success"
          disabled={selected.size === 0}
          onClick={() => setDecision('approve')}
        >
          <CheckCircle2 size={13} aria-hidden="true" />
          Approve selected ({selected.size})
        </button>
        <button
          type="button"
          className="m-btn danger"
          disabled={selected.size === 0}
          onClick={() => setDecision('reject')}
        >
          <XCircle size={13} aria-hidden="true" />
          Reject selected
        </button>
        <span className="sys-meta ml-auto">
          Decisions are written to the append-only audit trail with your employee ID.
        </span>
      </div>

      <div id="task-register-export">
        <DataTable
          columns={columns}
          data={tasks}
          selectable
          selectedIds={selected}
          onSelectionChange={(ids) => setSelected(new Set([...ids].map(String)))}
          onRowClick={(row) => setDrawerTask(row)}
          activeId={drawerTask?.task_id ?? null}
          emptyMessage={loading ? 'Loading task register…' : 'No tasks match the current filters'}
          pagination={{ page, pageSize, total, onPageChange: setPage }}
          rowKey={(row) => row.task_id}
        />
      </div>

      <p className="sys-meta mt-2">
        Page {page} of {totalPages} · GET /tasks?department=&amp;severity=&amp;status=&amp;page=
        {page}&amp;page_size={pageSize}
      </p>

      <ShapDrawer task={drawerTask} onClose={() => setDrawerTask(null)} />

      {decision && (
        <ApprovalModal
          isOpen
          busy={busy}
          action={decision}
          entityId={`${selected.size} task(s)`}
          entityType="Task"
          onClose={() => setDecision(null)}
          onConfirm={applyDecision}
        />
      )}
    </div>
  );
}
