import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { api, apiErrorMessage } from '../services/api';
import type { ChatMessage } from '../services/types';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  source?: 'db' | 'rules' | 'llm';
  data?: Record<string, number | string> | null;
  error?: boolean;
}

const FALLBACK_PROMPTS = [
  'How many critical tasks are pending today?',
  'Which corridor has the worst composite score?',
  'What is in the current weekly plan?',
  'Why was task TSK-1001 scored so high?',
  'Show pending approvals awaiting my decision.',
  'What safety rules block a block window?',
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

  /* suggested prompts — live list with a local fallback */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.chat
      .suggestions()
      .then((res) => {
        const list = (res.prompts ?? res.items ?? []).filter(Boolean);
        if (!cancelled && list.length > 0) setPrompts(list.slice(0, 6));
      })
      .catch(() => {
        /* keep the local fallback — the widget must never fail to open */
      });
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
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(
          'button, textarea, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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
      setMessages((prev) => [
        ...prev,
        {
          id: `e${++idRef.current}`,
          role: 'assistant',
          content:
            apiErrorMessage(error, 'The assistant could not reach the server.') +
            '\nYou can still use Task Prioritisation, Block Programme and the filters directly.',
          time: nowStamp(),
          source: 'rules',
          error: true,
        },
      ]);
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
                    {Object.entries(m.data).map(([k, v]) => (
                      <div
                        key={k}
                        className="border border-hairline bg-white rounded-chip px-2 py-1 flex items-baseline justify-between gap-2"
                      >
                        <span className="section-label truncate">{k.replace(/_/g, ' ')}</span>
                        <span className="mono text-[11px] font-bold text-ink">{String(v)}</span>
                      </div>
                    ))}
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
