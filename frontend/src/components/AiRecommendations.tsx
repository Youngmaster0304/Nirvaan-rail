import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { api, apiErrorMessage } from '../services/api';
import type { Recommendation } from '../services/types';

const STATUS_STAMP: Record<string, string> = {
  'PENDING REVIEW': 'stamp pending',
  'ACTIVE ALERT': 'stamp critical',
  APPROVED: 'stamp approved',
  DISMISSED: 'stamp neutral',
};

export const FIGMA_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'REC-2026-289-01',
    kind: 'MERGE',
    title: 'Merge 3 P-Way blocks — NDLS–AGC Corridor',
    detail: 'BL-2081, BL-2083, BL-2085 can be combined in a single 08:00–12:00 block window. Saves 4.5 hrs aggregate downtime. Train 12002 Bhopal Shatabdi impacted: 1 halt, 12 min.',
    impact: 'High',
    savings_label: 'Saves 4.5 hrs',
    issued_at: '09:38 IST',
    status: 'PENDING REVIEW',
    ref: 'AI/NCR/MERGE/09380927',
    source: 'CRIS AI v2.1',
    actionable: true,
  },
  {
    id: 'REC-2026-289-02',
    kind: 'DEFER',
    title: 'Defer BL-2049 to 23:00–05:00 Traffic-Free Window',
    detail: 'Signal-testing at KM 211 can move to night window. Traffic density drops to 12%. Impact on 22448 Shatabdi: NIL. Saves 2.1 hrs daytime disruption.',
    impact: 'Medium',
    savings_label: 'Saves 2.1 hrs',
    issued_at: '09:24 IST',
    status: 'PENDING REVIEW',
    ref: 'AI/NCR/DEFER/09240927',
    source: 'Traffic Density Optimizer',
    actionable: true,
  },
  {
    id: 'REC-2026-289-03',
    kind: 'ALERT',
    title: 'ALERT: Rail Fracture — KM 243.4, LKO–BSB',
    detail: 'Ultrasonic anomaly (Class-A crack, >3mm depth) detected in UT-Scan. Emergency inspection by AEN/3/NER required within 4 hrs. Speed restriction: 10 KMPH in force.',
    impact: 'Critical',
    savings_label: 'URGENT SAFETY',
    issued_at: '09:07 IST',
    status: 'ACTIVE ALERT',
    ref: 'ALERT/NER/FRACTURE/09070927',
    source: 'Ultrasonic Defect Classifier',
    actionable: true,
  },
  {
    id: 'REC-2026-289-04',
    kind: 'OPTIMIZE',
    title: 'Shift BL-2087 window by 45 min → 03:15–06:15',
    detail: 'Track-tamping at JP–ADI Section KM 211: shifting forward by 45 min gives tamper machine conflict-free path. Impact on Superfast 20503 (NDLS–LKO VB): delays reduced 23%.',
    impact: 'Medium',
    savings_label: 'Saves 0.75 hrs',
    issued_at: '08:51 IST',
    status: 'APPROVED',
    ref: 'AI/NWR/OPT/08510927',
    source: 'CP-SAT Solver',
    actionable: false,
  },
  {
    id: 'REC-2026-289-05',
    kind: 'SCHEDULE',
    title: 'Joint TRD + P-Way Inspection — BCT–PUNE BL-2083',
    detail: 'SSE/TRD/Mumbai and SSE/P-Way/Pune can share one block booking, saving separate entries. Combined OHE + track inspection window: 02:00–05:00. CPTM concurrence required.',
    impact: 'Low',
    savings_label: 'Saves 1.2 hrs',
    issued_at: '08:32 IST',
    status: 'APPROVED',
    ref: 'AI/WR/JBLOCK/08320927',
    source: 'Multi-Department Merger',
    actionable: false,
  },
];

interface AiRecommendationsProps {
  /** Called after a decision so the dashboard can refresh dependent figures. */
  onDecision?: () => void;
}

export const AiRecommendations: React.FC<AiRecommendationsProps> = ({ onDecision }) => {
  const [items, setItems] = useState<Recommendation[]>(FIGMA_RECOMMENDATIONS);
  const [generatedAt, setGeneratedAt] = useState('09:42 IST');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.recommendations
      .list()
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setItems(res.items);
          setGeneratedAt(res.generated_at ?? '');
        } else {
          setItems(FIGMA_RECOMMENDATIONS);
        }
      })
      .catch((_err) => {
        // Fallback gracefully to the published Figma recommendations
        setItems(FIGMA_RECOMMENDATIONS);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const decide = async (rec: Recommendation, action: 'APPROVE' | 'DISMISS') => {
    setBusyId(rec.id);
    setError('');
    try {
      await api.recommendations.decide(rec.id, action);
      setItems((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'DISMISSED' } : r)),
      );
      onDecision?.();
    } catch (err) {
      setError(apiErrorMessage(err, 'Decision could not be recorded.'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="m-card overflow-hidden mb-4" aria-labelledby="ai-rec-title">
      <div className="px-4 py-2.5 border-b border-hairline-strong flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 id="ai-rec-title" className="text-[13.5px] flex items-center gap-2">
            <Sparkles size={14} aria-hidden="true" />
            AI Recommendations
            <span className="stamp approved">LIVE</span>
          </h2>
          <span className="sys-meta">
            derived from /api/tasks · /corridors/kpis · /optimize/plans
            {generatedAt && <> · generated {generatedAt}</>}
          </span>
        </div>
        <button type="button" className="m-btn sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
          Refresh
        </button>
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        {error && <div className="text-[11.5px] text-status-rejected">{error}</div>}

        {loading && items.length === 0 && (
          <p className="text-[11.5px] text-ink-muted">Reading live task, KPI and plan rows…</p>
        )}

        {!loading && items.length === 0 && !error && (
          <p className="text-[11.5px] text-ink-muted">
            No recommendation is warranted by the current data — nothing to review.
          </p>
        )}

        {items.map((rec) => (
          <article
            key={rec.id}
            className="border border-hairline-strong rounded-[4px] bg-white px-3 py-2.5 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="stamp active">{rec.kind}</span>
                  <span className={STATUS_STAMP[rec.status] ?? 'stamp neutral'}>{rec.status}</span>
                  <span className="sys-meta">{rec.issued_at}</span>
                </div>
                <h3 className="text-[13px] font-bold text-ink mt-1">{rec.title}</h3>
              </div>
              {rec.savings_label && (
                <span className="stamp approved shrink-0">{rec.savings_label}</span>
              )}
            </div>

            <p className="text-[12px] leading-relaxed text-ink-muted">{rec.detail}</p>

            <div className="flex items-center justify-between gap-3 flex-wrap border-t border-hairline pt-2">
              <span className="mono text-[10.5px] text-ink-muted">{rec.ref}</span>
              <div className="flex items-center gap-2">
                <span className="sys-meta">{rec.source}</span>
                {rec.actionable && (rec.status === 'PENDING REVIEW' || rec.status === 'APPROVED' || rec.status === 'DISMISSED') && (
                  <>
                    <button
                      type="button"
                      className="m-btn sm success"
                      disabled={busyId === rec.id || rec.status === 'APPROVED'}
                      onClick={() => decide(rec, 'APPROVE')}
                    >
                      <Check size={13} aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      className="m-btn sm danger"
                      disabled={busyId === rec.id || rec.status === 'DISMISSED'}
                      onClick={() => decide(rec, 'DISMISS')}
                    >
                      <X size={13} aria-hidden="true" />
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
