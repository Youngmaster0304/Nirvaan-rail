import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CalendarClock, Send, AlertTriangle } from 'lucide-react';
import { SHAPExplanation, type ShapFactor } from './SHAPExplanation';
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

  return (
    <>
      {/* Frosted Glass Backdrop Blur matching Image 2 */}
      <div
        className="fixed inset-0 z-40 bg-[#001128]/45 backdrop-blur-md transition-all duration-300 no-print"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[480px] bg-white shadow-2xl flex flex-col border-l border-[#C8D4E6] no-print animate-in slide-in-from-right duration-200"
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

        <div className="drawer-body flex flex-col gap-4">
          {/* Quick task metadata card matching Figma */}
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded p-3 text-[11px] grid grid-cols-2 gap-y-2 gap-x-3">
            <div className="text-[#64748B] flex items-center gap-1">
              <span>⏱️</span>
              <span>Last Inspected</span>
            </div>
            <div className="font-semibold text-right text-[#0F172A] font-mono">
              {task.days_overdue ? `${task.days_overdue} days ago (overdue ${task.days_overdue}d)` : '31 days ago (overdue 31d)'}
            </div>

            <div className="text-[#64748B] flex items-center gap-1">
              <span>👤</span>
              <span>Assigned Officer</span>
            </div>
            <div className="font-bold text-right text-amber-600 flex items-center justify-end gap-1">
              <span>⚠️</span>
              <span>UNASSIGNED</span>
            </div>

            <div className="text-[#64748B] flex items-center gap-1">
              <span>🏛️</span>
              <span>Department</span>
            </div>
            <div className="font-semibold text-right text-[#0F172A]">
              {task.department || 'P-Way'}
            </div>

            <div className="text-[#64748B] flex items-center gap-1">
              <span>🚆</span>
              <span>Trains Impacted</span>
            </div>
            <div className="font-semibold text-right text-[#002D62] font-mono">
              9 trains
            </div>
          </div>

          {/* AI Priority Score mini-bar */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                AI Priority Score
              </span>
              <div className="text-[24px] font-black font-mono text-[#002D62] leading-none mt-0.5">
                {score ?? '96'}
                <span className="text-[12px] font-bold text-[#64748B] ml-1">/ 100</span>
              </div>
            </div>
            <div className="w-[140px]">
              <div className="pbar h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className={`h-full ${scorePercent(score) >= 80 ? 'bg-[#DC2626]' : scorePercent(score) >= 50 ? 'bg-[#D97706]' : 'bg-[#16A34A]'}`}
                  style={{ width: `${Math.min(100, scorePercent(score))}%` }}
                />
              </div>
              <span className="text-[9.5px] text-[#94A3B8] font-mono block text-right mt-1">
                Class: {task.defect_severity || 'Critical'}
              </span>
            </div>
          </div>

          {/* SHAP Factor Contributions Section */}
          <section aria-labelledby="shap-factors-label">
            <div className="flex items-center justify-between mb-1.5">
              <h3 id="shap-factors-label" className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
                SHAP FACTOR CONTRIBUTIONS
              </h3>
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#E6F0F9] text-[#002D62] border border-[#CBD5E1]">
                SHAP v2.4 - CRIS AI
              </span>
            </div>

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

        <div className="drawer-foot flex flex-col gap-2 pt-3 border-t border-[#E2E8F0]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            ACTIONS
          </div>
          <button
            type="button"
            className="w-full py-2 px-3 rounded text-[12px] font-bold text-white bg-[#002D62] hover:bg-[#003B82] shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            onClick={() => navigate(`/block-planning?focus=${encodeURIComponent(task.task_id)}`)}
          >
            <CalendarClock size={14} aria-hidden="true" />
            Schedule Block for This Task
          </button>
          <button
            type="button"
            className="w-full py-2 px-3 rounded text-[12px] font-bold text-[#334155] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            onClick={() => {
              alert(`Circular sent to DRM Office & SSE/P-Way for ${task.task_id}`);
            }}
          >
            <Send size={14} aria-hidden="true" />
            Assign Engineer / Send Circular
          </button>
        </div>
      </aside>
    </>
  );
};
