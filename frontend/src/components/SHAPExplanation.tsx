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
 * Visual SHAP Factor Contributions component matching the Figma CRIS AI design:
 * Displays a clean horizontal waterfall bar chart on top, followed by the structured
 * FACTOR / SCORE Δ breakdown table with colored status dots.
 */
export const SHAPExplanation: React.FC<SHAPExplanationProps> = ({
  contributions,
  caption = "Bars show each factor's additive contribution to the AI priority score. Positive values increase priority; negative values decrease it.",
  maxRows = 10,
}) => {
  const rows = useMemo(
    () => [...contributions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, maxRows),
    [contributions, maxRows],
  );

  const maxVal = useMemo(
    () => Math.max(1, ...rows.map((r) => Math.abs(r.value))),
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
    <div className="flex flex-col gap-3.5">
      {/* 1. Visual Bar Chart Box matching Figma */}
      <div className="border border-[#CBD5E1] rounded bg-white p-3 shadow-xs">
        <div className="relative h-[130px] flex flex-col justify-between py-1">
          {/* Subtle vertical grid lines */}
          <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
            <div className="border-r border-[#94A3B8] h-full" />
            <div className="border-r border-[#94A3B8] h-full" />
            <div className="border-r border-[#94A3B8] h-full" />
            <div className="border-r border-[#94A3B8] h-full" />
          </div>

          {/* Bars */}
          <div className="relative z-10 flex flex-col justify-around h-full">
            {rows.map((r) => {
              const widthPct = Math.min(100, Math.max(3, (Math.abs(r.value) / maxVal) * 100));
              const isPos = r.value >= 0;
              const barColor =
                r.value >= 30
                  ? '#B91C1C'
                  : r.value >= 10
                  ? '#D97706'
                  : r.value >= 0
                  ? '#EA580C'
                  : '#15803D';

              return (
                <div key={r.feature} className="flex items-center gap-2 group">
                  <div className="w-[110px] shrink-0 text-[10px] text-[#475569] font-medium truncate" title={r.feature}>
                    {r.feature}
                  </div>
                  <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-xs overflow-hidden relative">
                    <div
                      className="h-full rounded-xs transition-all duration-300"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                  <span className="mono text-[10px] font-bold w-10 text-right shrink-0" style={{ color: barColor }}>
                    {r.display ?? `${isPos ? '+' : ''}${r.value}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis tick labels */}
        <div className="border-t border-[#E2E8F0] pt-1 mt-1 flex justify-between text-[9px] mono text-[#94A3B8]">
          <span>0</span>
          <span>{Math.round(maxVal * 0.33)}</span>
          <span>{Math.round(maxVal * 0.66)}</span>
          <span>{Math.round(maxVal)}</span>
        </div>
      </div>

      {/* Caption */}
      <p className="text-[10.5px] leading-snug text-[#64748B]">{caption}</p>

      {/* 2. Structured Factor Breakdown Table matching Figma */}
      <div className="border border-[#CBD5E1] rounded overflow-hidden shadow-xs bg-white">
        <div className="bg-[#F8FAFC] px-3 py-1.5 border-b border-[#CBD5E1] flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#475569]">
          <span>FACTOR</span>
          <span>SCORE Δ</span>
        </div>
        <div className="divide-y divide-[#F1F5F9] text-[11px]">
          {rows.map((r) => {
            const isPos = r.value >= 0;
            const dotColor =
              r.value >= 30
                ? '#DC2626'
                : r.value >= 10
                ? '#D97706'
                : r.value >= 0
                ? '#F59E0B'
                : '#16A34A';
            const textColor =
              r.value >= 30
                ? 'text-[#DC2626]'
                : r.value >= 10
                ? 'text-[#D97706]'
                : r.value >= 0
                ? 'text-[#D97706]'
                : 'text-[#16A34A]';

            return (
              <div key={r.feature} className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-[#F8FAFC]">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="font-medium text-[#1E293B] truncate" title={r.feature}>
                    {r.feature}
                  </span>
                </div>
                <span className={`mono font-bold shrink-0 text-[11.5px] ${textColor}`}>
                  {r.display ?? `${isPos ? '+' : ''}${r.value}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

