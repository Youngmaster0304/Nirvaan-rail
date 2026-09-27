import React, { useMemo } from 'react';

export interface ShapFactor {
  feature: string;
  value: number;
  display?: string;
}

interface SHAPExplanationProps {
  contributions: ShapFactor[];
  /** Caption printed under the bars. */
  caption?: string;
  /** Cap rows so a long feature list does not blow out the panel. */
  maxRows?: number;
}

/**
 * Horizontal contribution bars for one SHAP explanation.
 * Used by the SHAP Explainability drawer; pure markup, no chart library.
 */
export const SHAPExplanation: React.FC<SHAPExplanationProps> = ({
  contributions,
  caption = "Bars show each factor's additive contribution to the AI priority score.",
  maxRows = 14,
}) => {
  const rows = useMemo(
    () => [...contributions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, maxRows),
    [contributions, maxRows],
  );

  const peak = useMemo(
    () => Math.max(0.0001, ...rows.map((r) => Math.abs(r.value))),
    [rows],
  );

  if (rows.length === 0) {
    return (
      <p className="sys-meta" role="status">
        No SHAP contributions recorded for this task yet. Run the prioritiser to generate them.
      </p>
    );
  }

  return (
    <div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const pct = Math.max(2, (Math.abs(row.value) / peak) * 100);
          const positive = row.value >= 0;
          return (
            <li key={row.feature} className="grid grid-cols-[1fr] gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold text-ink truncate" title={row.feature}>
                  {row.feature}
                </span>
                <span
                  className={`mono text-[11px] font-bold shrink-0 ${positive ? 'text-status-approved' : 'text-status-rejected'}`}
                >
                  {row.display ?? `${positive ? '+' : ''}${row.value.toFixed(3)}`}
                </span>
              </div>
              <div className="hbar" role="img" aria-label={`${row.feature}: ${row.display ?? row.value}`}>
                <span
                  className={`hbar-fill ${positive ? 'pos' : 'neg'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[10.5px] leading-snug text-ink-muted border-t border-hairline pt-2">{caption}</p>
    </div>
  );
};
