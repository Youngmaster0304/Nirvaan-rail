import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { ExportButton } from '../components/ExportButton';
import { WarningBanner } from '../components/WarningBanner';
import { stampVariant } from '../components/StatusBadge';
import { api, apiErrorMessage } from '../services/api';
import type { AuditEntry } from '../services/types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

type Row = AuditEntry & { id: string };

const detailText = (details: unknown): string => {
  if (details == null) return '—';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
};

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.audit
      .list({
        page,
        page_size: pageSize,
        action: action || undefined,
        entity_type: entityType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      .then((res) => {
        if (cancelled) return;
        const items = (res.items ?? res.entries ?? []).map((e) => ({ ...e, id: e.audit_id }));
        setEntries(items);
        setTotal(res.total ?? items.length);
      })
      .catch((err) => {
        if (cancelled) return;
        setEntries([]);
        setError(apiErrorMessage(err, 'Audit trail unavailable.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, action, entityType, dateFrom, dateTo]);

  const resetFilters = () => {
    setAction('');
    setEntityType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const columns: Column<Row>[] = useMemo(
    () => [
      {
        key: 'timestamp',
        name: 'Timestamp',
        width: '158px',
        render: (r) => (
          <span className="mono text-[10.5px]">{String(r.timestamp).replace('T', ' ').slice(0, 19)}</span>
        ),
      },
      {
        key: 'action',
        name: 'Action',
        width: '150px',
        render: (r) => <span className={`stamp ${stampVariant(r.action)} max-w-[140px] truncate`}>{r.action}</span>,
      },
      {
        key: 'user_name',
        name: 'User',
        render: (r) => (
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold">{r.user_name || '—'}</span>
            <span className="sys-meta">{r.user_id}</span>
          </div>
        ),
      },
      {
        key: 'entity_type',
        name: 'Entity',
        render: (r) => (
          <div className="flex flex-col leading-tight">
            <span className="text-[11px]">{r.entity_type || '—'}</span>
            <span className="sys-meta">{r.entity_id}</span>
          </div>
        ),
      },
      {
        key: 'details',
        name: 'Details',
        render: (r) => <span className="text-[11px]">{detailText(r.details)}</span>,
      },
      {
        key: 'reason',
        name: 'Reason / override',
        render: (r) => (
          <div className="flex flex-col gap-1">
            {r.reason ? (
              <span className="text-[10.5px] text-ink-muted italic border-l-2 border-hairline-strong pl-1.5">
                {r.reason}
              </span>
            ) : (
              <span className="sys-meta">—</span>
            )}
            {r.is_override && (
              <span className="stamp critical self-start">
                <ShieldAlert size={10} aria-hidden="true" />
                Override
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'audit_id',
        name: 'Entry',
        width: '92px',
        render: (r) => <span className="mono text-[10.5px]">#{r.audit_id}</span>,
      },
    ],
    [],
  );

  const filtersActive = [action, entityType, dateFrom, dateTo].some(Boolean);

  const exportCurrentPage = async () => {
    setNotice('');
    setError('');
    try {
      const res = await api.audit.list({
        page: 1,
        page_size: 100,
        action: action || undefined,
        entity_type: entityType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      const rows = (res.items ?? res.entries ?? []).map((e) => ({
        Entry: e.audit_id,
        Timestamp: String(e.timestamp).replace('T', ' '),
        Action: e.action,
        User: e.user_name,
        'Employee ID': e.user_id,
        Entity: `${e.entity_type} ${e.entity_id}`,
        Details: detailText(e.details),
        Reason: e.reason ?? '',
        Override: e.is_override ? 'yes' : 'no',
      }));
      exportToExcel(rows, `audit-log-${new Date().toISOString().slice(0, 10)}`, 'Audit Log');
      setNotice(`Exported ${rows.length} audit entries (first 100 of ${res.total}).`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Audit export failed.'));
    }
  };

  return (
    <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
      <div className="page-head">
        <div className="min-w-0">
          <h1>
            Audit Trail{' '}
            <span className="text-ink-muted font-normal text-[15px]" lang="hi">
              / लेखापरीक्षा
            </span>
          </h1>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            Append-only record of every prioritisation, plan generation and approval decision.
          </p>
          <p className="sys-meta mt-1">GET /audit · {total} entries match the current filters</p>
        </div>

        <ExportButton
          onExportPDF={() => void exportToPDF('audit-export', 'audit-log')}
          onExportExcel={exportCurrentPage}
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

      <div className="m-card p-3 mb-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="a-action" className="m-field-label">
              Action
            </label>
            <input
              id="a-action"
              className="m-field w-[190px]"
              placeholder="e.g. APPROVED_PLAN"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="a-entity" className="m-field-label">
              Entity type
            </label>
            <input
              id="a-entity"
              className="m-field w-[160px]"
              placeholder="e.g. Plan"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="a-from" className="m-field-label">
              From
            </label>
            <input
              id="a-from"
              type="date"
              className="m-field w-[160px]"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="a-to" className="m-field-label">
              To
            </label>
            <input
              id="a-to"
              type="date"
              className="m-field w-[160px]"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="a-size" className="m-field-label">
              Rows
            </label>
            <select
              id="a-size"
              className="m-field w-[92px]"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="m-btn" onClick={() => setPage(1)} disabled={loading}>
            <RefreshCw size={13} aria-hidden="true" />
            Apply
          </button>
          {filtersActive && (
            <button type="button" className="m-btn sm" onClick={resetFilters}>
              Clear filters
            </button>
          )}
          <span className="sys-meta ml-auto">
            Entries are ordered newest first by the API
          </span>
        </div>
      </div>

      <div id="audit-export">
        <DataTable
          columns={columns}
          data={entries}
          emptyMessage={loading ? 'Loading audit trail…' : 'No audit entries match the filters'}
          pagination={{ page, pageSize, total, onPageChange: setPage }}
          rowKey={(r) => r.id}
        />
      </div>

      <p className="sys-meta mt-2 leading-relaxed">
        The backend stores each entry with a chained integrity hash; this console shows the entry
        reference. Rows marked “Override” were forced through by a human approver and cannot be
        removed from the trail.
      </p>
    </div>
  );
}
