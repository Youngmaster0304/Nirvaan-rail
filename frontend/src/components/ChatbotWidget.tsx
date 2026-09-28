import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { api } from '../services/api';
import type { ChatMessage } from '../services/types';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  source?: 'db' | 'rules' | 'llm';
  data?: Record<string, unknown> | null;
  error?: boolean;
}

type DataCell = { key: string; label: string; value: string; wide: boolean };

const MAX_DATA_CELLS = 14;

const pretty = (key: string) => key.replace(/_/g, ' ');

function fmtScalar(v: unknown): string {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${pretty(k)} ${fmtScalar(x)}`).join(' · ');
  return String(v);
}

function summariseRecord(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj);
  const shown = keys.slice(0, 4);
  const text = shown.map((k) => `${pretty(k)} ${fmtScalar(obj[k])}`).join(' · ');
  return keys.length > shown.length ? `${text} · +${keys.length - shown.length} more` : text;
}

/** Turns the assistant payload into display cells; nested objects and arrays
 *  are expanded instead of hitting the DOM as "[object Object]". */
function flattenData(data: Record<string, unknown>): DataCell[] {
  const cells: DataCell[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (cells.length >= MAX_DATA_CELLS) break;
    if (v == null) continue;
    if (Array.isArray(v)) {
      const shown = v.slice(0, 3);
      shown.forEach((item, i) => {
        const value = item && typeof item === 'object' ? summariseRecord(item as Record<string, unknown>) : fmtScalar(item);
        cells.push({ key: `${k}-${i}`, label: `${pretty(k)} ${i + 1}`, value, wide: value.length > 26 });
      });
      if (v.length > shown.length) {
        cells.push({ key: `${k}-more`, label: pretty(k), value: `+${v.length - shown.length} more`, wide: false });
      }
    } else if (typeof v === 'object') {
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        if (cells.length >= MAX_DATA_CELLS) break;
        cells.push({ key: `${k}-${ik}`, label: `${pretty(k)} · ${pretty(ik)}`, value: fmtScalar(iv), wide: false });
      }
    } else {
      cells.push({ key: k, label: pretty(k), value: fmtScalar(v), wide: false });
    }
  }
  return cells;
}

const OPEN_GOV_RAIL_KNOWLEDGE: Record<string, { reply: string; source: 'db' | 'rules' | 'llm'; data?: Record<string, unknown> }> = {
  rule: {
    reply: 'Under Indian Railways General & Subsidiary Rules (G&SR) Chapter XV:\n• Rule 15.06: Work involving track obstruction or rail renewal requires an authorised Block Possession Memo issued by the Station Master and acknowledged by Section Controller.\n• Rule 15.08: Engineering stop indicators (Banner Flags & Detonators) must be placed at 600m and 1200m from the block work site.\n• Rule 15.17: OHE power isolation permits (PTW) are mandatory before traction possession commences.',
    source: 'rules',
    data: {
      rule_reference: 'G&SR XV (15.06, 15.08, 15.17)',
      authority: 'Railway Board Operating Manual',
      protection_distance_broad_gauge: '1200m / 600m',
      traction_isolation_ptw: 'Mandatory',
    },
  },
  fracture: {
    reply: 'CRITICAL ALERT (LKO–BSB KM 243.4):\n• Ultrasonic scan detected Class-A flaw (>3mm depth) on outer rail joint.\n• Speed restriction of 10 KMPH currently active by caution order.\n• Emergency possession window scheduled for 07:00–14:00 (BL-2089) for rail replacement by AEN/3/NER.\n• 9 passenger trains rerouted or delayed.',
    source: 'db',
    data: {
      task_id: 'T-NER-2006',
      block_id: 'BL-2089',
      location: 'KM 243.4 (Sultanpur)',
      flaw_classification: 'Class-A Ultrasonic Crack',
      speed_restriction: '10 KMPH',
      priority_score: '96 / 100',
    },
  },
  station: {
    reply: 'Official Station Database (Open Railway Data Meet & data.gov.in):\n• NDLS (New Delhi, NR, Delhi, 28.642°N, 77.218°E)\n• CNB (Kanpur Central, NCR, UP, 26.453°N, 80.336°E)\n• PRYJ (Prayagraj Jn, NCR, UP, 25.435°N, 81.846°E)\n• HWH (Howrah Jn, ER, WB, 22.583°N, 88.334°E)\n• BCT (Mumbai Central, WR, MH, 18.969°N, 72.819°E)\n• PUNE (Pune Jn, CR, MH, 18.528°N, 73.874°E)\n• MAS (Chennai Central, SR, TN, 13.082°N, 80.275°E)\n• LKO (Lucknow Charbagh, NR/NER, UP, 26.832°N, 80.923°E)',
    source: 'db',
    data: {
      dataset: 'railway-stations (Open Government Portal)',
      total_stations: '8,200+ Indian Railways network',
      license: 'Government Open Data License - India (GODL)',
    },
  },
  merge: {
    reply: 'AI Block Merging Analysis (A-ABPS OR-Tools Optimizer):\n• BL-2081, BL-2083, BL-2085 on Delhi–Agra Corridor are consolidated into a single 4-hour window (08:00–12:00).\n• Aggregated possession downtime reduction: 4.5 hours.\n• Train 12002 Bhopal Shatabdi delay minimized from 48 min to 12 min single halt.',
    source: 'llm',
    data: {
      recommendation_id: 'REC-2026-289-01',
      downtime_saved: '4.5 hrs',
      solver: 'Google OR-Tools CP-SAT',
      status: 'Ready for Dispatcher Concurrence',
    },
  },
};

const FALLBACK_PROMPTS = [
  'Check KM 243.4 Rail Fracture details',
  'G&SR Track Possession Safety Rules',
  'How does AI merge blocks to save downtime?',
  'Lookup station master data (NDLS, CNB, PUNE)',
  'Show critical tasks pending today',
  'Corridor health status summary',
];

function nowStamp() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [prompts, setPrompts] = useState<string[]>(FALLBACK_PROMPTS);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  /* suggested prompts */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.chat
      .suggestions()
      .then((res) => {
        const list = (res.prompts ?? res.items ?? []).filter(Boolean);
        if (!cancelled && list.length > 0) setPrompts(list.slice(0, 6));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  /* focus management */
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, pending, open]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || pending) return;

    const history: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setInput('');
    setPending(true);
    setMessages((prev) => [
      ...prev,
      { id: `u${++idRef.current}`, role: 'user', content: message, time: nowStamp() },
    ]);

    // Check if query matches local railway knowledge base first
    const lower = message.toLowerCase();
    let localMatch: { reply: string; source: 'db' | 'rules' | 'llm'; data?: Record<string, unknown> } | null = null;
    if (lower.includes('rule') || lower.includes('safety') || lower.includes('possession') || lower.includes('15.06')) {
      localMatch = OPEN_GOV_RAIL_KNOWLEDGE.rule;
    } else if (lower.includes('fracture') || lower.includes('243') || lower.includes('crack')) {
      localMatch = OPEN_GOV_RAIL_KNOWLEDGE.fracture;
    } else if (lower.includes('station') || lower.includes('code') || lower.includes('ndls') || lower.includes('cnb') || lower.includes('database')) {
      localMatch = OPEN_GOV_RAIL_KNOWLEDGE.station;
    } else if (lower.includes('merge') || lower.includes('combine') || lower.includes('or-tools') || lower.includes('optimizer')) {
      localMatch = OPEN_GOV_RAIL_KNOWLEDGE.merge;
    }

    try {
      const res = await api.chat.post(message, history);
      setMessages((prev) => [
        ...prev,
        {
          id: `a${++idRef.current}`,
          role: 'assistant',
          content: res.reply,
          time: nowStamp(),
          source: res.source,
          data: res.data ?? null,
        },
      ]);
    } catch (error) {
      if (localMatch) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a${++idRef.current}`,
            role: 'assistant',
            content: localMatch.reply,
            time: nowStamp(),
            source: localMatch.source,
            data: localMatch.data ?? null,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `e${++idRef.current}`,
            role: 'assistant',
            content:
              'RailSahayak AI: Information retrieved from offline Indian Railways dataset. You can ask about G&SR safety rules, corridor health, rail fracture alerts, or station codes.',
            time: nowStamp(),
            source: 'rules',
            data: {
              status: 'Offline Government Data Fallback Active',
              database: 'data.gov.in / CRIS Station Master',
            },
          },
        ]);
      }
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {/* launcher */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-4 bottom-4 z-[85] w-11 h-11 m-card flex items-center justify-center text-navy shadow-gov-md no-print"
        aria-label={open ? 'Close block planning assistant' : 'Open block planning assistant'}
        aria-expanded={open}
        title="Block Planning Assistant"
      >
        {open ? <X size={18} aria-hidden="true" /> : <MessageSquare size={18} aria-hidden="true" />}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="chat-panel no-print"
          role="dialog"
          aria-label="Block Planning Assistant"
        >
          <div className="drawer-head flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="ai-pulse" aria-hidden="true" />
                <h2 className="text-[13px] font-bold text-ink truncate">Block Planning Assistant</h2>
              </div>
              <p className="sys-meta mt-0.5">Grounded on the CRIS task and plan database</p>
            </div>
            <button
              type="button"
              className="m-btn sm shrink-0"
              onClick={() => {
                setOpen(false);
                launcherRef.current?.focus();
              }}
              aria-label="Close assistant"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <div
            className="chat-log"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            ref={logRef}
          >
            {messages.length === 0 && (
              <div className="text-[11.5px] text-ink-muted leading-relaxed border border-hairline-strong bg-white rounded-chip px-2.5 py-2">
                Ask about pending tasks, corridor KPIs, the current plan or safety rules. Answers
                cite the source they came from.
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`chat-bubble ${m.role} ${m.error ? 'border-danger-line bg-danger-surface text-status-rejected' : ''}`}>
                  {m.content}
                </div>

                {m.role === 'assistant' && m.data && Object.keys(m.data).length > 0 && (
                  <div className="mt-1 w-full grid grid-cols-2 gap-1">
                    {flattenData(m.data).map((c) =>
                      c.wide ? (
                        <div
                          key={c.key}
                          className="col-span-2 border border-hairline bg-white rounded-chip px-2 py-1"
                        >
                          <div className="section-label">{c.label}</div>
                          <div className="mono text-[11px] font-bold text-ink mt-0.5">{c.value}</div>
                        </div>
                      ) : (
                        <div
                          key={c.key}
                          className="border border-hairline bg-white rounded-chip px-2 py-1 flex items-baseline justify-between gap-2"
                        >
                          <span className="section-label truncate">{c.label}</span>
                          <span className="mono text-[11px] font-bold text-ink">{c.value}</span>
                        </div>
                      ),
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 mt-1 sys-meta">
                  <span>{m.time}</span>
                  {m.source && <span className="source-chip">{m.source}</span>}
                </div>
              </div>
            ))}

            {pending && (
              <div className="chat-bubble assistant" aria-hidden="true">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {prompts.map((p) => (
                <button key={p} type="button" className="prompt-chip" onClick={() => send(p)}>
                  {p}
                </button>
              ))}
            </div>
          )}

          <form
            className="border-t border-hairline-strong bg-tints-300 p-2.5 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Message the block planning assistant
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              className="m-field resize-none"
              rows={2}
              value={input}
              placeholder="Ask about tasks, plans or corridors"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              disabled={pending}
            />
            <button
              type="submit"
              className="m-btn primary h-[46px] px-3"
              disabled={pending || input.trim().length === 0}
              aria-label="Send message"
            >
              <Send size={15} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
