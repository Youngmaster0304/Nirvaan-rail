import { useEffect, useMemo, useState } from 'react';
import { FileText, Database, ExternalLink, Loader2 } from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { WarningBanner } from '../components/WarningBanner';
import { ExportButton } from '../components/ExportButton';
import { api, apiErrorMessage } from '../services/api';
import type { GovLiveResponse, ReportResponse } from '../services/types';
import { exportToExcel } from '../utils/exportUtils';

interface ReportKind {
  id: string;
  title: string;
  titleHi: string;
  desc: string;
}

const REPORT_KINDS: ReportKind[] = [
  {
    id: 'productivity',
    title: 'Block productivity',
    titleHi: 'ब्लॉक उत्पादकता',
    desc: 'Tasks per department, pending load, blocks planned and possession hours actually booked.',
  },
  {
    id: 'utilization',
    title: 'Department-wise utilization',
    titleHi: 'विभागवार उपयोग',
    desc: 'Every block with its corridor, section, status, window hours and the tasks it covers.',
  },
  {
    id: 'health',
    title: 'Corridor health',
    titleHi: 'गलियारा स्वास्थ्य',
    desc: 'Latest KPI row per corridor: punctuality, reliability, productivity and composite score.',
  },
  {
    id: 'overdue',
    title: 'Overdue maintenance',
    titleHi: 'अतिदेय रखरखाव',
    desc: 'Tasks past their due date, ordered by days overdue, with severity and priority score.',
  },
  {
    id: 'accuracy',
    title: 'AI recommendation accuracy',
    titleHi: 'एआई सिफारिश सटीकता',
    desc: 'How many tasks carry a model score, and how many were lifted by safety policy overrides.',
  },
];

type Row = { id?: string; [key: string]: unknown };

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export default function ReportsPage() {
  const [kind, setKind] = useState('productivity');
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [datasets, setDatasets] = useState<string[]>([]);
  const [datasetKey, setDatasetKey] = useState('');
  const [live, setLive] = useState<GovLiveResponse | null>(null);
  const [liveError, setLiveError] = useState('');

  useEffect(() => {
    api.gov
      .datasets()
      .then((res) => {
        const keys = res.keys ?? res.items.map((i) => i.key);
        setDatasets(keys);
        if (keys.length > 0) setDatasetKey(keys[0]);
      })
      .catch((err) => setLiveError(apiErrorMessage(err, 'Dataset catalogue unavailable.')));
  }, []);

  useEffect(() => {
    if (!datasetKey) return;
    let cancelled = false;
    setLiveError('');
    api.gov
      .railwayLive(datasetKey)
      .then((res) => {
        if (!cancelled) setLive(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setLive(null);
          setLiveError(apiErrorMessage(err, 'Open-data fetch failed.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [datasetKey]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const res = await api.reports.generate(kind);
      setReport(res);
      setNotice(`${res.report_id} generated from the live database.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Report generation failed.'));
    } finally {
      setGenerating(false);
    }
  };

  const reportData = report?.data ?? null;
  const metrics = (reportData?.metrics ?? null) as Record<string, unknown> | null;
  const rows: Row[] = useMemo(() => {
    const raw = reportData?.rows;
    if (!Array.isArray(raw)) return [];
    return (raw as Row[]).map((r, i) => ({ ...r, id: `row-${i}` }));
  }, [reportData]);

  const columns: Column<Row>[] = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0])
      .filter((key) => key !== 'id')
      .map((key) => ({
        key,
        name: key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
        align:
          key === 'days_overdue' || key.endsWith('_pct') || key.endsWith('score') ? 'right' : 'left',
        sortable: true,
        render: (r) => <span className="text-[11px]">{cell(r[key])}</span>,
      }));
  }, [rows]);

  const liveRecords: Row[] = useMemo(
    () => (live?.records ?? []).map((r, i) => ({ ...r, id: `row-${i}` })),
    [live],
  );

  const liveColumns: Column<Row>[] = useMemo(() => {
    if (liveRecords.length === 0) return [];
    const keys = Object.keys(liveRecords[0])
      .filter((key) => key !== 'id')
      .slice(0, 8);
    return keys.map((key) => ({
      key,
      name: key.replace(/_/g, ' '),
      render: (r) => <span className="text-[11px]">{cell(r[key])}</span>,
    }));
  }, [liveRecords]);

  const exportReport = () => {
    if (rows.length === 0) return;
    const exportable = rows.map((r) => {
      const copy: Row = { ...r };
      delete copy.id;
      return copy;
    });
    exportToExcel(exportable, `${report?.report_id ?? 'report'}`, report?.report_type ?? 'Report');
    setNotice(`Exported ${rows.length} rows to spreadsheet.`);
  };

  const activeKind = REPORT_KINDS.find((k) => k.id === kind);

  return (
    <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
      <div className="page-head">
        <div className="min-w-0">
          <h1>
            Reports{' '}
            <span className="text-ink-muted font-normal text-[15px]" lang="hi">
              / रिपोर्ट
            </span>
          </h1>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            Every figure is computed by the API from the operational database at the moment of
            request — no stored numbers in this portal.
          </p>
          <p className="sys-meta mt-1">POST /reports/generate · GET /reports/{'{report_id}'}/download</p>
        </div>
        <ExportButton onExportExcel={exportReport} onExportPDF={() => window.print()} />
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

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 mb-4">
        <section className="m-card p-0 overflow-hidden" aria-label="Report catalogue">
          <div className="px-4 py-2.5 border-b border-hairline-strong flex items-center gap-2">
            <FileText size={14} aria-hidden="true" />
            <h2 className="text-[13.5px]">Report catalogue</h2>
          </div>
          <div role="listbox" aria-label="Report type">
            {REPORT_KINDS.map((k) => {
              const selected = k.id === kind;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => setKind(k.id)}
                  className={`w-full text-left px-4 py-2.5 border-b border-hairline last:border-b-0 transition-colors ${
                    selected ? 'bg-navy/10' : 'hover:bg-blue-50/70'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-[12.5px] font-bold ${selected ? 'text-navy' : 'text-ink'}`}
                    >
                      {k.title}
                    </span>
                    <span className="sys-meta" lang="hi">
                      {k.titleHi}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-snug mt-0.5">{k.desc}</p>
                </button>
              );
            })}
          </div>
          <div className="p-3 border-t border-hairline-strong bg-canvas/70">
            <button
              type="button"
              className="m-btn primary w-full justify-center"
              onClick={generate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  Generating…
                </>
              ) : (
                <>
                  <FileText size={13} aria-hidden="true" />
                  Generate “{activeKind?.title}”
                </>
              )}
            </button>
            <p className="sys-meta mt-2 leading-relaxed">
              Generated reports are cached server-side for 50 ids, then served as CSV.
            </p>
          </div>
        </section>

        <section className="m-card p-0 overflow-hidden" aria-label="Generated report" id="report-export">
          <div className="px-4 py-2.5 border-b border-hairline-strong flex flex-wrap items-center gap-2">
            <h2 className="text-[13.5px]">{activeKind?.title}</h2>
            {report && <span className="stamp active">{report.report_id}</span>}
            <span className="sys-meta ml-auto">
              {report ? `generated ${String(report.generated_at).replace('T', ' ').slice(0, 19)} UTC` : 'not generated yet'}
            </span>
            {report && (
              <a
                className="m-btn sm"
                href={`/api/reports/${report.report_id}/download`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={12} aria-hidden="true" />
                CSV
              </a>
            )}
          </div>

          {!report && (
            <div className="px-4 py-10 text-center">
              <p className="section-label mb-1">No report generated</p>
              <p className="sys-meta">
                Pick a type from the catalogue and press Generate. The response carries `metrics`,
                `rows` and a CSV download link.
              </p>
            </div>
          )}

          {report && (
            <div className="p-3.5">
              <p className="text-[13px] leading-relaxed mb-3">{report.summary}</p>

              {metrics && (
                <dl className="kv-grid mb-3">
                  {Object.entries(metrics).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt>{k.replace(/_/g, ' ')}</dt>
                      <dd className="num">{cell(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <DataTable
                columns={columns}
                data={rows}
                emptyMessage="This report returned summary metrics only, no row detail"
                pageSize={15}
              />
            </div>
          )}
        </section>
      </div>

      <section className="m-card p-0 overflow-hidden" aria-label="Government open data">
        <div className="px-4 py-2.5 border-b border-hairline-strong flex flex-wrap items-center gap-2">
          <Database size={14} aria-hidden="true" />
          <h2 className="text-[13.5px]">Government open data</h2>
          <label htmlFor="gov-dataset" className="m-field-label mb-0">
            Dataset
          </label>
          <select
            id="gov-dataset"
            className="m-field w-[240px]"
            value={datasetKey}
            onChange={(e) => setDatasetKey(e.target.value)}
          >
            {datasets.length === 0 && <option value="">No datasets listed</option>}
            {datasets.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <span className="sys-meta ml-auto">
            {live
              ? `${live.source} · ${live.cached ? 'bundled fallback' : 'live fetch'} · ${String(live.fetched_at).replace('T', ' ').slice(0, 19)}`
              : 'GET /gov/railway-live'}
          </span>
        </div>

        {liveError && (
          <div className="p-3.5 pb-0">
            <WarningBanner type="warning" message={liveError} />
          </div>
        )}

        <div className="p-3.5 pt-0">
          {live?.note && (
            <p className="sys-meta mb-2 leading-relaxed">{live.note}</p>
          )}
          <DataTable
            columns={liveColumns}
            data={liveRecords}
            emptyMessage="No open-data records available for this dataset"
            pageSize={10}
          />
          <p className="sys-meta mt-2 leading-relaxed">
            Served from api.data.gov.in when an API key and resource id are configured; otherwise
            the bundled offline fallback shipped with the API is shown. Attribution stays with the
            original publisher.
          </p>
        </div>
      </section>
    </div>
  );
}
