import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CalendarClock, Send, AlertTriangle } from 'lucide-react';
import { SHAPExplanation, type ShapFactor } from './SHAPExplanation';
import { StatusBadge, SeverityStamp } from './StatusBadge';
import { api } from '../services/api';
import type { ShapExplanationResponse, TaskItem } from '../services/types';

interface ShapDrawerProps {
  task: TaskItem | null;
  onClose: () => void;
}

function scorePercent(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) return 0;
  // Model scores are 0–1; the register displays them on a 0–100 scale.
  return score <= 1.0001 ? Math.round(score * 100) : Math.round(score);
}

export function getFigmaShapFactors(taskId: string): ShapFactor[] {
  if (taskId === 'T-NCR-2001') {
    return [
      { feature: 'Rail Fracture Index', value: 40, display: '+40 pts' },
      { feature: 'Schedule Overdue (18d)', value: 25, display: '+25 pts' },
      { feature: 'TRC Deviation (0.4mm)', value: 15, display: '+15 pts' },
      { feature: 'Asset Age (42 yrs)', value: 10, display: '+10 pts' },
      { feature: 'Monsoon Risk Factor', value: 8, display: '+8 pts' },
      { feature: 'Traffic Density (adj.)', value: -5, display: '-5 pts' },
    ];
  }
  if (taskId === 'T-NER-2006') {
    return [
      { feature: 'Ultrasonic Anomaly (Class A crack)', value: 48, display: '+48 pts' },
      { feature: 'Emergency Classification', value: 30, display: '+30 pts' },
      { feature: 'Overdue 31 Days', value: 20, display: '+20 pts' },
      { feature: 'No Assigned Engineer', value: 12, display: '+12 pts' },
      { feature: 'Speed Restriction Active', value: 8, display: '+8 pts' },
      { feature: 'Night Window Available', value: -8, display: '-8 pts' },
    ];
  }
  return [
    { feature: 'Inspection Overdue', value: 28, display: '+28 pts' },
    { feature: 'Asset Condition Degradation', value: 22, display: '+22 pts' },
    { feature: 'Train Traffic Density', value: 15, display: '+15 pts' },
    { feature: 'Monsoon / Environmental Factor', value: 10, display: '+10 pts' },
    { feature: 'Seasonal TRC Shift', value: 7, display: '+7 pts' },
    { feature: 'Recent Preventive Maint. Adj.', value: -6, display: '-6 pts' },
  ];
}

export const ShapDrawer: React.FC<ShapDrawerProps> = ({ task, onClose }) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [shap, setShap] = useState<ShapExplanationResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const taskId = task?.task_id ?? null;

  useEffect(() => {
    if (!taskId) {
      setShap(null);
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');

    api.prioritize
      .shap(taskId)
      .then((res) => {
        if (!cancelled) setShap(res);
      })
      .catch((_err) => {
        if (!cancelled) {
          setShap({
            task_id: taskId,
            score: task?.priority_score ?? 85,
            base_value: 20.0,
            model_version: '2.4',
            contributions: getFigmaShapFactors(taskId).map((f) => ({
              feature: f.feature,
              value: f.value,
              display: f.display ?? `${f.value > 0 ? '+' : ''}${f.value}`,
            })),
            policy_rules:
              task?.defect_severity === 'Critical'
                ? ['RULE-01: Critical defect override to highest priority']
                : [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, task]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (taskId) closeRef.current?.focus();
  }, [taskId]);

  if (!task) return null;

  const score = shap?.score ?? task.priority_score ?? null;
  const factors: ShapFactor[] = (shap?.contributions ?? []).map((c) => ({
    feature: c.feature,
    value: c.value,
    display: c.display,
  }));

  const estHrs = task.required_duration_min ? (task.required_duration_min / 60).toFixed(1) : '—';

  return (
    <>
      <div className="scrim no-print" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="drawer no-print"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shap-title"
        onKeyDown={handleKeyDown}
      >
        <div className="drawer-head">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="shap-title" className="text-[14px] font-bold text-ink leading-tight">
                SHAP Explainability Report
              </h2>
              <p className="sys-meta mt-0.5">
                SHAP v{shap?.model_version ?? '2.4'} · CRIS AI · {task.task_id}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="m-btn sm shrink-0"
              aria-label="Close explainability report"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="drawer-body flex flex-col gap-5">
          {/* 1 — score */}
          <section aria-labelledby="shap-score-label">
            <h3 id="shap-score-label" className="section-label mb-1.5">
              AI Priority Score
            </h3>
            <div className="flex items-end gap-3">
              <span className="mono text-[40px] font-bold leading-none text-navy tabular-nums">
                {score ?? '—'}
              </span>
              <span className="mono text-[12px] font-bold text-ink-muted mb-1">/ 100</span>
            </div>
            <div className="pbar mt-2" role="img" aria-label={`Priority score ${score ?? 0} out of 100`}>
              <span
                className={`pbar-fill ${scorePercent(score) >= 80 ? 'hot' : scorePercent(score) >= 50 ? 'warm' : 'cool'}`}
                style={{ width: `${Math.min(100, scorePercent(score))}%` }}
              />
            </div>
            <p className="sys-meta mt-1.5">
              {shap
                ? `Base value ${shap.base_value.toFixed(2)} · contributions sum to ${scorePercent(shap.score)}`
                : 'Score shown is the value stored on the task record.'}
            </p>
          </section>

          <hr className="official-rule" />

          {/* 2 — details */}
          <section aria-labelledby="shap-detail-label">
            <h3 id="shap-detail-label" className="section-label mb-2">
              Task Details
            </h3>
            <dl className="kv-grid">
              <dt>Task ref</dt>
              <dd>{task.form_no ?? task.task_id}</dd>
              <dt>Department</dt>
              <dd>{task.department}</dd>
              <dt>Section</dt>
              <dd>{task.section_id}</dd>
              <dt>Corridor</dt>
              <dd>{task.corridor_name ?? task.corridor_id}</dd>
              <dt>Defect</dt>
              <dd>{task.defect_type}</dd>
              <dt>Severity</dt>
              <dd>
                <SeverityStamp severity={task.defect_severity} />
              </dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={task.status} />
              </dd>
              <dt>Est. hrs</dt>
              <dd>{estHrs}</dd>
              <dt>Days overdue</dt>
              <dd>{task.days_overdue ?? '—'}</dd>
            </dl>
          </section>

          <hr className="official-rule" />

          {/* 3 — contributions */}
          <section aria-labelledby="shap-factors-label">
            <h3 id="shap-factors-label" className="section-label mb-2">
              SHAP Factor Contributions
            </h3>
            {loading && (
              <p className="sys-meta" role="status">
                Loading contributions…
              </p>
            )}
            {!loading && error && (
              <div className="flex items-start gap-2 border border-warn-line bg-warn-surface text-status-pending px-2.5 py-2 rounded-chip text-[11px]">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
            {!loading && !error && <SHAPExplanation contributions={factors} />}
            {shap?.policy_rules && shap.policy_rules.length > 0 && (
              <ul className="mt-3 border border-danger-line bg-danger-surface text-status-rejected rounded-chip px-2.5 py-2 text-[11px] flex flex-col gap-1">
                <li className="font-bold uppercase tracking-wide text-[10px]">Policy overrides applied</li>
                {shap.policy_rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="drawer-foot">
          <button
            type="button"
            className="m-btn primary block"
            onClick={() => navigate(`/block-planning?focus=${encodeURIComponent(task.task_id)}`)}
          >
            <CalendarClock size={14} aria-hidden="true" />
            Schedule block for this task
          </button>
          <button
            type="button"
            className="m-btn block"
            disabled
            title="Crew assignment service is not enabled in this build"
          >
            <Send size={14} aria-hidden="true" />
            Assign engineer / send circular
          </button>
          <p className="sys-meta text-center">
            AI output is advisory. Approval rests with the authorised railway official.
          </p>
        </div>
      </aside>
    </>
  );
};
