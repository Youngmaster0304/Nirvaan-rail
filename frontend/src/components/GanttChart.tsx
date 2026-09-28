import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export interface GanttBlock {
  block_id: string;
  label?: string;
  corridor: string;
  fullName?: string;
  zone?: string;
  startHour: number;
  duration: number;
  departments: string[];
  dept?: string;
  status: string;
  impact?: string;
  trainsAffected?: number;
  trains?: number;
  eng?: string;
  assignedTo?: string;
  taskCount?: number;
  emergency?: boolean;
}

interface GanttChartProps {
  blocks: GanttBlock[];
  onBlockClick?: (block: GanttBlock) => void;
  nowHour?: number;
  emptyMessage?: string;
}

const DEPT_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'p-way': { bg: '#002D62', text: '#FFFFFF', border: '#004A97' },
  engineering: { bg: '#002D62', text: '#FFFFFF', border: '#004A97' },
  ohe: { bg: '#CC6A00', text: '#FFFFFF', border: '#E8820C' },
  trd: { bg: '#CC6A00', text: '#FFFFFF', border: '#E8820C' },
  traction: { bg: '#CC6A00', text: '#FFFFFF', border: '#E8820C' },
  bridge: { bg: '#0A5E1C', text: '#FFFFFF', border: '#138808' },
  signal: { bg: '#4C1D95', text: '#FFFFFF', border: '#6D28D9' },
  's&t': { bg: '#4C1D95', text: '#FFFFFF', border: '#6D28D9' },
};

const STATUS_MAP: Record<string, string> = {
  active: 'ACTIVE',
  scheduled: 'SCHEDULED',
  approved: 'APPROVED',
  critical: 'EMERGENCY',
  emergency: 'EMERGENCY',
};

const IMPACT_COLOR: Record<string, string> = {
  Low: '#0A6B21',
  Medium: '#D97706',
  High: '#D05D00',
  Critical: '#B91C1C',
};

function formatTime(h: number): string {
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const HOUR_TICKS = Array.from({ length: 25 }, (_, i) => i);

export const GanttChart: React.FC<GanttChartProps> = ({
  blocks,
  onBlockClick,
  nowHour,
  emptyMessage,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<GanttBlock | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredBlock, setHoveredBlock] = useState<GanttBlock | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const byCorridor = new Map<string, GanttBlock[]>();
    for (const block of blocks) {
      const list = byCorridor.get(block.corridor) ?? [];
      list.push(block);
      byCorridor.set(block.corridor, list);
    }
    return Array.from(byCorridor.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [blocks]);

  // Close popup on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBlock(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleBlockClick = (e: React.MouseEvent, block: GanttBlock) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // Clamp popup within viewport
    const x = Math.min(window.innerWidth - 300, Math.max(16, rect.left));
    const y = Math.max(120, rect.top - 12);
    setPopupPos({ x, y });
    setSelectedBlock(block);
    onBlockClick?.(block);
  };

  const handleMouseEnter = (e: React.MouseEvent, block: GanttBlock) => {
    if (selectedBlock) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ x: rect.left, y: rect.top - 8 });
    setHoveredBlock(block);
  };

  const handleMouseLeave = () => {
    setHoveredBlock(null);
  };

  if (rows.length === 0) {
    return (
      <div className="border border-hairline-strong rounded-card bg-white px-4 py-10 text-center shadow-sm">
        <p className="section-label mb-1">No blocks in window</p>
        <p className="sys-meta">{emptyMessage ?? 'Generate a plan to populate the programme.'}</p>
      </div>
    );
  }

  const activeModalBlock = selectedBlock;

  return (
    <div
      ref={containerRef}
      className="border border-[#C8D4E6] rounded-card bg-white overflow-hidden shadow-sm relative"
      onClick={() => setSelectedBlock(null)}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          {/* 24-Hour Time Header Axis */}
          <div className="flex border-b border-[#C8D4E6] g-head select-none">
            <div className="sticky left-0 z-10 w-[180px] shrink-0 px-3 py-2 border-r border-[#C8D4E6] g-head-id">
              <span className="section-label text-[#546380]">Corridor / Section</span>
            </div>
            <div className="relative flex-1 h-[28px]">
              {HOUR_TICKS.map((h) => (
                <span
                  key={h}
                  className="absolute top-0 bottom-0 flex items-center border-l border-[#DCE5F0] pl-1"
                  style={{ left: `${(h / 24) * 100}%` }}
                >
                  {h % 2 === 0 && (
                    <span className="mono text-[9px] font-bold text-[#546380]">
                      {String(h % 24).padStart(2, '0')}:00
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Corridor Rows */}
          <div>
            {rows.map(([corridor, corridorBlocks], rowIdx) => {
              const firstBlock = corridorBlocks[0];
              return (
                <div
                  key={corridor}
                  className={cn(
                    'flex border-b border-[#E8EFF8] transition-colors',
                    rowIdx % 2 === 0 ? 'g-row-a' : 'bg-white'
                  )}
                >
                  {/* Sticky Left Column: Corridor Name & Block Count matching Figma */}
                  <div
                    className={cn(
                      'sticky left-0 z-10 w-[210px] shrink-0 px-3.5 py-2 border-r border-[#C8D4E6] flex flex-col justify-center',
                      rowIdx % 2 === 0 ? 'g-row-id-a' : 'bg-white'
                    )}
                  >
                    <div className="text-[12px] font-bold text-[#002D62] leading-tight truncate" title={corridor}>
                      {corridor}
                    </div>
                    <div className="text-[10px] text-[#546380] leading-tight mt-0.5 truncate">
                      {firstBlock?.zone ? `${firstBlock.zone} ` : ''}{firstBlock?.fullName || ''}
                    </div>
                    <div className="text-[9.5px] text-[#8090A8] font-medium mt-0.5">
                      {corridorBlocks.length} block{corridorBlocks.length === 1 ? '' : 's'} today
                    </div>
                  </div>

                  {/* 24-Hour Timeline Bar Canvas (Height 54px matching Figma) */}
                  <div className="relative flex-1 h-[54px]">
                    {/* Background hour grid lines */}
                    {HOUR_TICKS.map((h) => (
                      <span
                        key={h}
                        className="absolute top-0 bottom-0 border-l border-[#F0F4FA] pointer-events-none"
                        style={{ left: `${(h / 24) * 100}%` }}
                      />
                    ))}

                    {/* Red NOW vertical indicator line */}
                    {nowHour !== undefined && nowHour >= 0 && nowHour <= 24 && (
                      <span className="g-now" style={{ left: `${(nowHour / 24) * 100}%` }} />
                    )}

                    {/* Scheduled Block Elements */}
                    {corridorBlocks.map((block) => {
                      const left = Math.max(0, (block.startHour / 24) * 100);
                      const width = Math.max(2.5, (Math.min(block.duration, 24 - block.startHour) / 24) * 100);
                      const primaryDept = (block.dept || block.departments[0] || 'engineering').toLowerCase();
                      const styleConfig = DEPT_STYLE[primaryDept] || DEPT_STYLE['p-way'];
                      const isSelected = selectedBlock?.block_id === block.block_id;

                      const bg = block.emergency
                        ? 'linear-gradient(148deg, #dc2626 0%, #b91c1c 55%, #7f1d1d 100%)'
                        : styleConfig.bg;

                      return (
                        <button
                          type="button"
                          key={block.block_id}
                          className={cn(
                            'g-block select-none text-[9.5px] rounded-[3px] shadow-sm flex flex-col justify-center text-left transition-all hover:brightness-110',
                            block.emergency && 'is-emergency shadow-red-500/20',
                            isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-[#002D62] z-30'
                          )}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            background: bg,
                            border: `1px solid ${block.emergency ? '#ef4444' : styleConfig.border}`,
                            boxShadow: isSelected
                              ? '0 0 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)'
                              : '0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                          }}
                          onClick={(e) => handleBlockClick(e, block)}
                          onMouseEnter={(e) => handleMouseEnter(e, block)}
                          onMouseLeave={handleMouseLeave}
                          aria-label={`Block ${block.block_id} on ${block.corridor}, ${block.duration} hours`}
                        >
                          <div className="flex flex-col justify-center h-full px-2 py-0.5 leading-tight overflow-hidden">
                            <div className="flex items-center gap-1 font-bold text-white text-[10.5px] truncate">
                              {block.emergency && <span className="text-amber-300 font-bold shrink-0">⚠️</span>}
                              <span className="truncate">{block.label || block.block_id}</span>
                            </div>
                            <div className="font-mono text-[9px] opacity-85 text-white/90 truncate mt-0.5">
                              {block.block_id} · {formatTime(block.startHour)}–{formatTime(block.startHour + block.duration)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover preview tooltip */}
      {hoveredBlock && !selectedBlock && (
        <div
          className="fixed pointer-events-none z-[190] text-xs transition-opacity duration-150"
          style={{
            left: hoverPos.x + 10,
            top: hoverPos.y,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="bg-[#0D1A2D]/95 text-white backdrop-blur-sm border border-white/20 rounded px-2.5 py-1.5 shadow-lg text-[10px] font-mono leading-tight">
            <span className="font-bold text-amber-300">{hoveredBlock.block_id}</span> ·{' '}
            <span>{hoveredBlock.label || hoveredBlock.departments.join(', ')}</span> ·{' '}
            <span className="text-emerald-400">
              {formatTime(hoveredBlock.startHour)} – {formatTime(hoveredBlock.startHour + hoveredBlock.duration)}
            </span>
          </div>
        </div>
      )}

      {/* CLICKED BLOCK TASK BOX POPUP (as in Figma Make App) */}
      {activeModalBlock && (
        <div
          className="fixed z-[200] pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: popupPos.x,
            top: popupPos.y,
            transform: 'translateY(-100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="text-white rounded overflow-hidden shadow-2xl"
            style={{
              background: '#0D1A2D',
              border: '1px solid rgba(255,255,255,0.18)',
              minWidth: 260,
              maxWidth: 320,
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
              padding: '12px 14px',
            }}
          >
            {/* Header: Block ID & Close button */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11.5px] font-bold font-mono tracking-wide text-white">
                  {activeModalBlock.block_id}
                </span>
                <span
                  className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded font-mono"
                  style={{
                    background:
                      activeModalBlock.emergency || activeModalBlock.status === 'critical'
                        ? 'rgba(239,68,68,0.25)'
                        : 'rgba(34,197,94,0.2)',
                    color:
                      activeModalBlock.emergency || activeModalBlock.status === 'critical'
                        ? '#FCA5A5'
                        : '#86EFAC',
                    border: `1px solid ${
                      activeModalBlock.emergency || activeModalBlock.status === 'critical'
                        ? '#EF4444'
                        : '#22C55E'
                    }`,
                  }}
                >
                  {STATUS_MAP[activeModalBlock.status.toLowerCase()] || activeModalBlock.status.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBlock(null)}
                className="text-white/50 hover:text-white p-0.5 rounded transition-colors"
                aria-label="Close block task box"
              >
                <X size={13} />
              </button>
            </div>

            {/* Official subtle rule */}
            <div
              className="official-rule mb-2"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
            />

            {/* Key-Value Details matching the Figma site */}
            <div className="space-y-1 text-[10.5px]">
              <div className="flex items-start justify-between gap-4">
                <span className="text-white/45 text-[9.5px]">Block</span>
                <span className="text-right font-medium text-white">{activeModalBlock.label || 'Track Inspection'}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-white/45 text-[9.5px]">Department</span>
                <span className="text-right font-medium text-white">
                  {activeModalBlock.dept || activeModalBlock.departments.join(', ') || 'P-Way'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-white/45 text-[9.5px]">Duration</span>
                <span className="text-right font-mono font-medium text-amber-300">
                  {formatTime(activeModalBlock.startHour)} –{' '}
                  {formatTime(activeModalBlock.startHour + activeModalBlock.duration)} (
                  {activeModalBlock.duration.toFixed(1)}h)
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-white/45 text-[9.5px]">Impact</span>
                <span
                  className="text-right font-bold"
                  style={{ color: IMPACT_COLOR[activeModalBlock.impact || 'Medium'] || '#FFF' }}
                >
                  {activeModalBlock.impact || 'Medium'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-white/45 text-[9.5px]">Trains Affected</span>
                <span className="text-right font-mono font-medium text-white">
                  {activeModalBlock.trainsAffected ?? activeModalBlock.trains ?? 2} train
                  {(activeModalBlock.trainsAffected ?? activeModalBlock.trains ?? 2) === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-white/45 text-[9.5px]">Engineer</span>
                <span className="text-right font-medium text-slate-300 truncate max-w-[150px]">
                  {activeModalBlock.eng || activeModalBlock.assignedTo || 'SSE/P-Way/Section'}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons inside the task box */}
            <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center gap-2">
              <button
                type="button"
                className="flex-1 py-1 px-2 rounded-sm text-[10px] font-bold text-white bg-[#004492] hover:bg-[#0052b3] transition-colors border border-white/20 text-center flex items-center justify-center gap-1"
                onClick={() => {
                  alert(`Inspecting asset telemetry for ${activeModalBlock.block_id} on ${activeModalBlock.corridor}`);
                }}
              >
                <Clock size={11} />
                Inspect Track
              </button>
              <button
                type="button"
                className="flex-1 py-1 px-2 rounded-sm text-[10px] font-bold text-white bg-[#138808] hover:bg-[#18a30c] transition-colors border border-white/20 text-center flex items-center justify-center gap-1"
                onClick={() => {
                  alert(`Block window ${activeModalBlock.block_id} confirmed by CPTM controller.`);
                  setSelectedBlock(null);
                }}
              >
                <ShieldCheck size={11} />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

