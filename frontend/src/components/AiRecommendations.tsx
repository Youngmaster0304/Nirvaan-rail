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

interface AiRecommendationsProps {
  /** Called after a decision so the dashboard can refresh dependent figures. */
  onDecision?: () => void;
}

export const AiRecommendations: React.FC<AiRecommendationsProps> = ({ onDecision }) => {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [generatedAt, setGeneratedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.recommendations
      .list()
      .then((res) => {
        setItems(res.items ?? []);
        setGeneratedAt(res.generated_at ?? '');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Recommendations could not be loaded.')))
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
