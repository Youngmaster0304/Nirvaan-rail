import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';

interface KPICardProps {
  label: string;
  /** Hindi label shown under the English one (bilingual console). */
  labelHi?: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  /** Optional sparkline series — only rendered when real trend data exists. */
  spark?: number[];
  /** Where the number comes from, shown as a mono footnote. */
  source?: string;
}

const TREND_COLOR: Record<NonNullable<KPICardProps['trend']>, string> = {
  up: 'text-status-approved',
  down: 'text-rail-red',
  stable: 'text-ink-muted',
};

export const KPICard: React.FC<KPICardProps> = ({
  label,
  labelHi,
  value,
  unit,
  trend,
  trendValue,
  sub,
  color,
  icon,
  spark,
  source,
}) => {
  const sparkClass = trend ? TREND_COLOR[trend] : 'text-navy-bright';

  return (
    <section className="m-card p-3.5 flex flex-col gap-2 min-w-0" aria-label={label}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="section-label">{label}</h2>
          {labelHi && (
            <div className="text-[10.5px] leading-tight text-ink-muted mt-0.5" lang="hi">
              {labelHi}
            </div>
          )}
        </div>
        {icon && (
          <span className="text-ink-muted/70 shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="mono text-[26px] font-bold leading-none text-ink tabular-nums truncate">
            {value}
          </span>
          {unit && <span className="mono text-[11px] font-bold text-ink-muted">{unit}</span>}
        </div>

        {spark && spark.length > 1 && (
          <div className={cn('w-[76px] h-[30px] shrink-0', sparkClass)} aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark.map((v, i) => ({ i, v }))}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 min-h-[18px]">
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 mono text-[10px] font-bold uppercase tracking-wide',
              TREND_COLOR[trend],
            )}
          >
            {trend === 'up' && <ArrowUp size={11} aria-hidden="true" />}
            {trend === 'down' && <ArrowDown size={11} aria-hidden="true" />}
            {trend === 'stable' && <Minus size={11} aria-hidden="true" />}
            {trendValue}
          </span>
        ) : sub ? (
          <span className="mono text-[10px] font-medium text-slate-500 truncate" style={color ? { color } : undefined}>
            {sub}
          </span>
        ) : (
          <span />
        )}
        {source && <span className="sys-meta truncate" title={source}>{source}</span>}
      </div>
    </section>
  );
};
