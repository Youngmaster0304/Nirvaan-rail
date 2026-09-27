import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

interface NavItem {
  path: string;
  label: string;
  labelHi: string;
}

/** Five pills fit the desktop bar; everything else lives under "More". */
const PRIMARY_NAV: NavItem[] = [
  { path: '/', label: 'Operations Dashboard', labelHi: 'परिचालन' },
  { path: '/tasks', label: 'Task Prioritisation', labelHi: 'कार्य प्राथमिकता' },
  { path: '/block-planning', label: 'Block Programme', labelHi: 'ब्लॉक कार्यक्रम' },
  { path: '/weekly', label: 'Weekly Programme', labelHi: 'साप्ताहिक' },
  { path: '/monthly', label: 'Monthly Programme', labelHi: 'मासिक' },
];

const SECONDARY_NAV: NavItem[] = [
  { path: '/corridor-map', label: 'Corridor Map', labelHi: 'गलियारा मानचित्र' },
  { path: '/simulation', label: 'Impact Simulation', labelHi: 'प्रभाव अनुकरण' },
  { path: '/audit', label: 'Audit Trail', labelHi: 'लेखापरीक्षा' },
  { path: '/reports', label: 'Reports', labelHi: 'रिपोर्ट' },
  { path: '/help', label: 'Help & Support', labelHi: 'सहायता' },
];

function Pill({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onClick}
      className={({ isActive }) => cn('nav-pill on-dark', isActive && 'active')}
    >
      {({ isActive }) => (
        <>
          <span>{item.label}</span>
          <span className="nav-hi" lang="hi">
            {item.labelHi}
          </span>
          <span className="sr-only">{isActive ? ' (current page)' : ''}</span>
        </>
      )}
    </NavLink>
  );
}

export const GovtNavbar: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="m-dark w-full z-30 relative no-print" aria-label="Primary">
      <div className="mx-auto max-w-console px-3 sm:px-5 h-12 flex items-center gap-3">
        {/* identity */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="logo-tile" aria-hidden="true">
            AB
          </span>
          <div className="leading-none">
            <div className="text-white text-[11px] font-bold tracking-wide">A-ABPS v2.1</div>
            <div className="form-ref text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,.45)' }}>
              FORM ABPS/CRIS/01
            </div>
          </div>
        </div>

        <div className="w-px self-stretch bg-white/15 mx-1 hidden sm:block" />

        {/* desktop pills */}
        <div className="hidden lg:flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          {PRIMARY_NAV.map((item) => (
            <Pill key={item.path} item={item} />
          ))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className={cn('nav-pill on-dark flex-row items-center gap-1', moreOpen && 'active')}
            >
              <span>More</span>
              <ChevronDown size={13} aria-hidden="true" />
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 w-56 py-1 border border-white/15 bg-navy shadow-lg z-50"
              >
                {SECONDARY_NAV.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'block px-3 py-2 text-[12.5px] font-semibold text-white/70 hover:bg-white/10 hover:text-white',
                        isActive && 'bg-white/15 text-white',
                      )
                    }
                  >
                    {item.label}
                    <span className="block text-[10px] font-normal text-white/45" lang="hi">
                      {item.labelHi}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* mobile trigger */}
        <button
          type="button"
          className="lg:hidden ml-auto on-dark text-white/80 hover:text-white p-1.5"
          onClick={() => setSheetOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={sheetOpen}
        >
          <Menu size={20} />
        </button>

        {/* right cluster */}
        <div className="hidden lg:flex items-center gap-3 ml-auto">
          <span className="nav-chip" title="Prioritisation and optimisation engine status">
            <span className="ai-pulse" aria-hidden="true" />
            AI Engine Active
          </span>

          <div className="text-right leading-tight max-w-[170px]">
            <div className="text-white text-[11.5px] font-semibold truncate">
              {user?.name ?? 'Guest user'}
            </div>
            <div className="text-[9.5px] uppercase tracking-[0.1em] text-white/55 truncate">
              {user?.role ?? 'No role'} · {user?.zone ?? '—'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="on-dark inline-flex items-center gap-1.5 border border-white/20 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-chip"
            aria-label="Sign out of A-ABPS"
          >
            <LogOut size={13} aria-hidden="true" />
            Logout
          </button>
        </div>
      </div>

      {/* mobile full-height sheet */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[86%] max-w-sm m-dark flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-4 h-12 border-b border-white/15">
              <span className="text-white text-[11px] font-bold tracking-wide">A-ABPS v2.1</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="on-dark text-white/80 hover:text-white p-1.5"
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 flex flex-col gap-1">
              {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => (
                <Pill key={item.path} item={item} onClick={() => setSheetOpen(false)} />
              ))}
            </div>

            <div className="mt-auto p-4 border-t border-white/15 flex flex-col gap-3">
              <span className="nav-chip self-start">
                <span className="ai-pulse" aria-hidden="true" />
                AI Engine Active
              </span>
              <div className="text-white text-[12px] font-semibold">{user?.name ?? 'Guest user'}</div>
              <div className="text-[10px] uppercase tracking-[0.1em] text-white/55">
                {user?.role ?? 'No role'} · {user?.zone ?? '—'}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="m-btn block w-full justify-center border-white/25 bg-white/10 text-white"
              >
                <LogOut size={13} aria-hidden="true" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
