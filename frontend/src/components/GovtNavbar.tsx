import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Settings,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Train,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

export const GovtNavbar: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (moreRef.current && !moreRef.current.contains(target)) setMoreOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.name ?? 'Shri R.K. Sharma';
  const displayRole = user?.role ? `${user.role} / ${user.zone ?? 'NCR'}` : 'Sr. Traffic Controller / NCR';
  const displayEmp = user?.employee_id ?? 'NCR/ATC/2847';

  return (
    <nav className="m-dark w-full z-30 relative no-print select-none shadow-md">
      <div className="mx-auto max-w-[1700px] px-3 sm:px-5 h-12 flex items-center justify-between gap-3">
        {/* Left side: Brand Logo + Primary Nav Pills */}
        <div className="flex items-center gap-3">
          {/* Brand Tile */}
          <div
            className="flex items-center gap-2 pr-3 shrink-0"
            style={{ borderRight: '1px solid rgba(255,255,255,0.15)' }}
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <Train className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-[11px] tracking-tight leading-tight">
                A-ABPS v2.1
              </div>
              <div
                className="text-[9px] leading-tight"
                style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                F.No. NCR/DRM/ABPS/2026/289
              </div>
            </div>
          </div>

          {/* Desktop Nav Pills */}
          <div className="hidden lg:flex items-center gap-0.5">
            <NavLink
              to="/"
              end
              className={({ isActive }) => cn('nav-pill', isActive && 'active')}
            >
              Operations Dashboard
            </NavLink>
            <NavLink
              to="/tasks"
              className={({ isActive }) => cn('nav-pill', isActive && 'active')}
            >
              Task Prioritisation
            </NavLink>
            <NavLink
              to="/block-planning"
              className={({ isActive }) => cn('nav-pill', isActive && 'active')}
            >
              Block Programme
            </NavLink>

            {/* More Menu */}
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={cn('nav-pill flex-row items-center gap-1', moreOpen && 'active')}
                aria-expanded={moreOpen}
              >
                <span>More Modules</span>
                <ChevronDown size={11} className={cn('transition-transform duration-150', moreOpen && 'rotate-180')} />
              </button>

              {moreOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-56 py-1 rounded bg-white shadow-xl z-50 text-slate-800"
                  style={{ border: '1px solid #C8D4E6' }}
                >
                  {[
                    { path: '/weekly', label: 'Weekly Programme', sub: '7-day possession windows' },
                    { path: '/monthly', label: 'Monthly Master Plan', sub: 'Long-range corridor blocks' },
                    { path: '/corridor-map', label: 'Corridor GIS Map', sub: 'Interactive network overview' },
                    { path: '/simulation', label: 'Impact Simulator', sub: 'Monte Carlo traffic ripple' },
                    { path: '/audit', label: 'Audit Trail', sub: 'Statutory verification log' },
                    { path: '/reports', label: 'Reports & Analytics', sub: 'MIS exports & KPIs' },
                    { path: '/help', label: 'G&SR Operating Manual', sub: 'Safety rules & guidelines' },
                  ].map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'block px-3 py-2 text-xs hover:bg-[#F0F4FA] transition-colors',
                          isActive ? 'bg-[#E0EAFF] font-bold text-[#002D62]' : 'text-slate-700'
                        )
                      }
                    >
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{item.sub}</div>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side: AI Pulse, Bell, Settings, User Popover */}
        <div className="flex items-center gap-3">
          {/* AI Engine Active Pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
            title="LightGBM Priority + OR-Tools CP-SAT Planner Active"
          >
            <div className="ai-pulse" />
            <span
              className="text-[11px] font-semibold tracking-wide"
              style={{ color: '#86EFAC', fontFamily: 'JetBrains Mono, monospace' }}
            >
              AI ENGINE ACTIVE
            </span>
          </div>

          {/* Notifications Bell with Popover */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-1.5 rounded hover:bg-white/10 transition-colors"
              aria-label="Alerts and Notifications"
            >
              <Bell className="w-3.5 h-3.5 text-white/70" />
              <span
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 text-[8px] font-bold text-white rounded-full flex items-center justify-center"
                style={{ background: '#B91C1C' }}
              >
                3
              </span>
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-72 rounded bg-white shadow-xl overflow-hidden z-50"
                style={{ border: '1px solid #C8D4E6' }}
              >
                <div
                  className="px-3 py-2 border-b flex items-center justify-between"
                  style={{ background: '#EBF0FA', borderColor: '#C8D4E6' }}
                >
                  <span className="text-xs font-bold" style={{ color: '#002D62' }}>
                    Critical Safety Alerts
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                    3 Active
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs text-slate-700 max-h-60 overflow-y-auto">
                  <div className="p-2.5 hover:bg-red-50 cursor-pointer" onClick={() => navigate('/tasks')}>
                    <div className="font-bold text-red-700 flex items-center gap-1">
                      <span>⚑</span> Rail Fracture Alert
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      KM 243.4 (Sultanpur, LKO-BSB) Class-A crack. Speed 10 KMPH.
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 font-mono">09:07 IST · Emergency</div>
                  </div>
                  <div className="p-2.5 hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/block-planning')}>
                    <div className="font-bold text-[#002D62]">AI Block Merge Opportunity</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Combine BL-2081 & BL-2082 on NDLS-CNB to save 4.5h downtime.
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 font-mono">09:38 IST · Recommendation</div>
                  </div>
                  <div className="p-2.5 hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/monthly')}>
                    <div className="font-bold text-amber-700">Night Window Possibility</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      BL-2049 Signal testing shift saves 2.1h daytime disruption.
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 font-mono">09:24 IST · Advisory</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Settings */}
          <button
            type="button"
            onClick={() => navigate('/help')}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            title="System Settings & Help"
          >
            <Settings className="w-3.5 h-3.5 text-white/70" />
          </button>

          {/* User Profile Popover */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded hover:bg-white/10 transition-colors"
              aria-expanded={profileOpen}
            >
              <div
                className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ background: '#E8820C' }}
              >
                RS
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[11px] font-semibold text-white leading-tight">{displayName}</div>
                <div
                  className="text-[9px] leading-tight"
                  style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {displayEmp}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-white/40 ml-0.5" />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-60 rounded bg-white shadow-xl overflow-hidden z-50 text-slate-800"
                style={{ border: '1px solid #C8D4E6' }}
              >
                <div className="px-3 py-2.5 border-b" style={{ background: '#EBF0FA', borderColor: '#C8D4E6' }}>
                  <div className="text-xs font-bold" style={{ color: '#002D62' }}>
                    {displayName}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{displayRole}</div>
                  <div className="text-[10px] mt-1 font-mono text-emerald-700">
                    ● Login: 06:14 IST · Session Active
                  </div>
                </div>

                <div className="py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/reports');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Officer Profile & Logs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/audit');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Approval Audit Trail</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-700 font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-600" />
                    <span>Sign Out of Console</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="lg:hidden p-1.5 text-white/80 hover:text-white"
            onClick={() => setSheetOpen(true)}
            aria-label="Open mobile navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Sheet */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm m-dark flex flex-col p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/15">
              <span className="text-white font-bold text-xs">A-ABPS Navigation</span>
              <button onClick={() => setSheetOpen(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 flex flex-col gap-1.5 overflow-y-auto flex-1">
              {[
                { path: '/', label: 'Operations Dashboard' },
                { path: '/tasks', label: 'Task Prioritisation' },
                { path: '/block-planning', label: 'Block Programme' },
                { path: '/weekly', label: 'Weekly Programme' },
                { path: '/monthly', label: 'Monthly Master Plan' },
                { path: '/corridor-map', label: 'Corridor GIS Map' },
                { path: '/simulation', label: 'Impact Simulation' },
                { path: '/audit', label: 'Audit Trail' },
                { path: '/reports', label: 'Reports' },
                { path: '/help', label: 'Help' },
              ].map((m) => (
                <NavLink
                  key={m.path}
                  to={m.path}
                  end={m.path === '/'}
                  onClick={() => setSheetOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'px-3 py-2 rounded text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white',
                      isActive && 'bg-white/15 text-white font-bold'
                    )
                  }
                >
                  {m.label}
                </NavLink>
              ))}
            </div>
            <div className="pt-3 border-t border-white/15">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

