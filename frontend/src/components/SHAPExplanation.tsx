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

const FEATURE_NAMES: Record<string, string> = {
  defect_severity_encoded: 'Defect Severity Score',
  defect_severity: 'Defect Severity',
  historical_failure_rate: 'Asset Condition Score',
  corridor_traffic_density: 'Train Traffic Density',
  days_overdue: 'Inspection Overdue',
  asset_age_years: 'Asset Age Factor',
  weather_risk: 'Monsoon / Weather Risk',
  track_quality_index: 'Track Quality Index',
  trc_deviation: 'Seasonal TRC Shift',
  recent_maintenance: 'Recent Maint. Adj.',
  ultrasonic_anomaly: 'Ultrasonic Anomaly (A)',
  emergency_classification: 'Emergency Classification',
  assigned_engineer: 'Engineer Allocation',
  speed_restriction: 'Speed Restriction Active',
  night_window: 'Night Window Available',
};

function formatFeature(raw: string): string {
  if (!raw) return 'Asset Parameter';
  // Check if string contains equation like "Defect severity = 4 -> +9.54"
  if (raw.includes('->')) {
    const leftPart = raw.split('->')[0].split('=')[0].trim();
    return formatFeature(leftPart);
  }
  const key = raw.toLowerCase().trim();
  if (FEATURE_NAMES[key]) return FEATURE_NAMES[key];
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+Encoded/i, '');
}

function formatDelta(val: number, display?: string): string {
  if (display && !display.includes('->') && (display.startsWith('+') || display.startsWith('-'))) {
    return display;
  }
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${Math.round(val)}`;
}

/**
 * Clean, uncluttered SHAP Factor Contributions component matching Image 2 (Figma site).
 */
export const SHAPExplanation: React.FC<SHAPExplanationProps> = ({
  contributions,
  caption = "Bars show each factor's additive contribution to the AI priority score. Positive values increase priority; negative values decrease it.",
  maxRows = 7,
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
    <div className="flex flex-col gap-3">
      {/* 1. Visual Waterfall Chart Box matching Image 2 */}
      <div className="border border-[#CBD5E1] rounded bg-white p-3 shadow-xs">
        <div className="relative flex flex-col gap-2.5 py-1 min-h-[140px]">
          {/* Subtle vertical grid lines */}
          <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
            <div className="border-r border-[#94A3B8] h-full" />
            <div className="border-r border-[#94A3B8] h-full" />
            <div className="border-r border-[#94A3B8] h-full" />
            <div className="border-r border-[#94A3B8] h-full" />
          </div>

          {/* Clean bars */}
          {rows.map((r, idx) => {
            const widthPct = Math.min(100, Math.max(6, (Math.abs(r.value) / maxVal) * 100));
            const isPos = r.value >= 0;
            const barColor =
              r.value >= 25
                ? '#B91C1C'
                : r.value >= 12
                ? '#D97706'
                : isPos
                ? '#2563EB'
                : '#16A34A';

            return (
              <div key={r.feature + idx} className="relative z-10 flex items-center gap-2 group">
                <div
                  className="w-[125px] shrink-0 text-[10.5px] text-[#334155] font-medium truncate"
                  title={formatFeature(r.feature)}
                >
                  {formatFeature(r.feature)}
                </div>
                <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-[2px] overflow-hidden relative">
                  <div
                    className="h-full rounded-[2px] transition-all duration-300"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                <span
                  className="mono text-[10.5px] font-bold w-12 text-right shrink-0"
                  style={{ color: barColor }}
                >
                  {formatDelta(r.value, r.display)}
                </span>
              </div>
            );
          })}
        </div>

        {/* X-axis tick labels */}
        <div className="border-t border-[#E2E8F0] pt-1.5 mt-1.5 flex justify-between text-[9px] mono text-[#94A3B8]">
          <span>0</span>
          <span>{Math.round(maxVal * 0.33)}</span>
          <span>{Math.round(maxVal * 0.66)}</span>
          <span>{Math.round(maxVal)}</span>
        </div>
      </div>

      {/* Caption */}
      <p className="text-[10px] leading-snug text-[#64748B]">{caption}</p>

      {/* 2. Structured Factor Breakdown Table matching Image 2 */}
      <div className="border border-[#CBD5E1] rounded overflow-hidden shadow-xs bg-white">
        <div className="bg-[#F8FAFC] px-3 py-1.5 border-b border-[#CBD5E1] flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#475569]">
          <span>FACTOR</span>
          <span>SCORE Δ</span>
        </div>
        <div className="divide-y divide-[#F1F5F9] text-[11px]">
          {rows.map((r, idx) => {
            const isPos = r.value >= 0;
            const dotColor =
              r.value >= 25
                ? '#DC2626'
                : r.value >= 12
                ? '#D97706'
                : isPos
                ? '#2563EB'
                : '#16A34A';
            const textColor =
              r.value >= 25
                ? 'text-[#DC2626]'
                : r.value >= 12
                ? 'text-[#D97706]'
                : isPos
                ? 'text-[#2563EB]'
                : 'text-[#16A34A]';

            return (
              <div
                key={r.feature + idx}
                className="px-3 py-1.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="font-medium text-[#1E293B] truncate" title={formatFeature(r.feature)}>
                    {formatFeature(r.feature)}
                  </span>
                </div>
                <span className={`mono font-bold shrink-0 text-[11px] ${textColor}`}>
                  {formatDelta(r.value, r.display)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


