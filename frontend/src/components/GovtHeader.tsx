import React from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * GOI identity bar + the 4px tricolor rule that sits directly beneath it.
 * Restyled from the original header: no emoji, no gradient banner.
 */
export const GovtHeader: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const sessionId = token ? `${token.slice(-6).toUpperCase()}` : '--------';

  return (
    <header className="w-full z-40 relative no-print">
      <div className="goi-bar">
        <div className="mx-auto max-w-console px-3 sm:px-5 py-2 flex items-center justify-between gap-3">
          {/* Left — emblem + ministry */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="emblem" aria-hidden="true">
              IR
            </span>
            <div className="leading-tight min-w-0">
              <div className="text-[12.5px] font-bold text-ink truncate">Government of India</div>
              <div className="text-[10.5px] text-ink-muted truncate">Ministry of Railways</div>
            </div>
          </div>

          {/* Centre — CRIS */}
          <div className="hidden md:block goi-center text-center">
            Centre for Railway Information Systems (CRIS)
          </div>

          {/* Right — session meta */}
          <div className="flex items-center gap-3 sys-meta whitespace-nowrap">
            <span className="hidden sm:inline">SESS {sessionId}</span>
            <span aria-hidden="true" className="hidden sm:inline text-hairline-strong">
              |
            </span>
            <span>{today}</span>
          </div>
        </div>
      </div>

      <div className="tricolor-line" role="presentation" />

      {/* On small screens the CRIS line would otherwise vanish entirely */}
      <div className="md:hidden bg-tints-300 border-b border-hairline px-3 py-1 goi-center text-center">
        Centre for Railway Information Systems (CRIS)
      </div>

      <span className="sr-only">
        Signed in as {user ? `${user.name}, ${user.role}` : 'guest'}
      </span>
    </header>
  );
};
