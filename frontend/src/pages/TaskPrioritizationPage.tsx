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
        const rows = (res.items ?? []).map((t) => ({ ...t, id: t.task_id }));
        setTasks(rows);
        setTotal(res.total ?? rows.length);
      })
      .catch((err) => {
        setTasks([]);
        setError(apiErrorMessage(err, 'Could not load the task register.'));
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
