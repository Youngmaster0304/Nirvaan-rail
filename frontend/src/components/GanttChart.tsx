import React, { useMemo } from 'react';
import { cn } from '../lib/utils';

export interface GanttBlock {
  block_id: string;
  /** Row key — one row per corridor. */
  corridor: string;
  /** Hour of day, 0–24. */
  startHour: number;
  /** Length in hours. */
  duration: number;
  departments: string[];
  status: string;
  taskCount: number;
  trainsAffected?: number;
  emergency?: boolean;
}

interface GanttChartProps {
  blocks: GanttBlock[];
  onBlockClick?: (block: GanttBlock) => void;
  /** Local hour (0–24) for the NOW marker; omit to hide it. */
  nowHour?: number;
  emptyMessage?: string;
}

const DEPT_CLASS: Record<string, string> = {
  engineering: 'dept-eng',
  's&t': 'dept-snt',
  'signal & telecom': 'dept-snt',
  traction: 'dept-trd',
  maintenance: 'dept-mnt',
};

function deptClass(departments: string[]) {
  for (const dept of departments) {
    const hit = DEPT_CLASS[String(dept).toLowerCase()];
    if (hit) return hit;
  }
  return 'dept-unknown';
}

const HOUR_TICKS = Array.from({ length: 25 }, (_, i) => i);

export const GanttChart: React.FC<GanttChartProps> = ({ blocks, onBlockClick, nowHour, emptyMessage }) => {
  const rows = useMemo(() => {
    const byCorridor = new Map<string, GanttBlock[]>();
    for (const block of blocks) {
      const list = byCorridor.get(block.corridor) ?? [];
      list.push(block);
      byCorridor.set(block.corridor, list);
    }
    return Array.from(byCorridor.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [blocks]);

  if (rows.length === 0) {
    return (
      <div className="border border-hairline-strong rounded-card bg-white px-4 py-10 text-center">
        <p className="section-label mb-1">No blocks in window</p>
        <p className="sys-meta">{emptyMessage ?? 'Generate a plan to populate the programme.'}</p>
      </div>
    );
  }

  return (
    <div className="border border-hairline-strong rounded-card bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          {/* time axis */}
          <div className="flex border-b border-hairline-strong g-head">
            <div className="sticky left-0 z-10 w-[150px] shrink-0 px-2 py-1.5 border-r border-hairline-strong g-head-id">
              <span className="section-label">Corridor</span>
            </div>
            <div className="relative flex-1 h-[26px]">
              {HOUR_TICKS.map((h) => (
                <span
                  key={h}
                  className="absolute top-0 bottom-0 flex items-center border-l border-panel-line pl-1"
                  style={{ left: `${(h / 24) * 100}%` }}
                >
                  {h % 3 === 0 && (
                    <span className="mono text-[9px] font-bold text-ink-muted">
                      {String(h % 24).padStart(2, '0')}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* rows */}
          <div>
            {rows.map(([corridor, corridorBlocks], rowIdx) => (
              <div
                key={corridor}
                className={cn(
                  'flex border-b border-hairline',
                  rowIdx % 2 === 0 ? 'g-row-a' : 'bg-white',
                )}
              >
                <div
                  className={cn(
                    'sticky left-0 z-10 w-[150px] shrink-0 px-2 py-2 border-r border-hairline-strong',
                    rowIdx % 2 === 0 ? 'g-row-id-a' : 'bg-white',
                  )}
                >
                  <div className="text-[11px] font-bold text-ink leading-tight truncate" title={corridor}>
                    {corridor}
                  </div>
                  <div className="sys-meta">{corridorBlocks.length} blocks</div>
                </div>

                <div className="relative flex-1 h-[34px]">
                  {HOUR_TICKS.map((h) => (
                    <span
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-panel-grid"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}

                  {nowHour !== undefined && nowHour >= 0 && nowHour <= 24 && (
                    <span className="g-now" style={{ left: `${(nowHour / 24) * 100}%` }} />
                  )}

                  {corridorBlocks.map((block) => {
                    const left = Math.max(0, (block.startHour / 24) * 100);
                    const width = Math.max(0.6, (Math.min(block.duration, 24 - block.startHour) / 24) * 100);
                    const active =
                      block.status.toUpperCase() === 'ACTIVE' ||
                      (nowHour !== undefined &&
                        block.startHour <= nowHour &&
                        block.startHour + block.duration >= nowHour);
                    const title =
                      `${block.block_id} · ${block.corridor}\n` +
                      `${block.departments.join(', ') || '—'} · ${block.duration}h · ${block.taskCount} tasks` +
                      (block.trainsAffected !== undefined ? `\n${block.trainsAffected} trains impacted` : '');

                    return (
                      <button
                        type="button"
                        key={block.block_id}
                        className={cn(
                          'g-block',
                          !block.emergency && deptClass(block.departments),
                          block.emergency && 'is-emergency',
                          active && 'is-active',
                        )}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          outlineOffset: 1,
                        }}
                        title={title}
                        onClick={() => onBlockClick?.(block)}
                        aria-label={`${block.block_id} on ${block.corridor}, ${block.departments.join(', ')}, status ${block.status}`}
                      >
                        {block.duration >= 1.5 ? block.block_id : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
