import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiErrorMessage, getApiBaseUrl, setApiBaseUrl } from '../services/api';
import { Server, Check, ShieldCheck, Train, UserCheck, KeyRound, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';

const ROLES = [
  { id: 'Chief Controller', label: 'Chief Controller (CPTM)', empId: 'EMP-NR-001', zone: 'NCR' },
  { id: 'Section Engineer', label: 'Section Engineer (SSE)', empId: 'EMP-NCR-204', zone: 'NCR' },
  { id: 'Dispatcher', label: 'Traffic Dispatcher', empId: 'EMP-WR-102', zone: 'WR' },
  { id: 'Safety Auditor', label: 'Safety Auditor (CRS)', empId: 'EMP-CRS-088', zone: 'RB' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const [empId, setEmpId] = useState('EMP-NR-001');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState('Chief Controller');
  const [captcha, setCaptcha] = useState('');
  const [captchaSum, setCaptchaSum] = useState(() => ({
    a: Math.floor(Math.random() * 8) + 2,
    b: Math.floor(Math.random() * 8) + 1,
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [savedUrlNotice, setSavedUrlNotice] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const regenerateCaptcha = () => {
    setCaptchaSum({
      a: Math.floor(Math.random() * 8) + 2,
      b: Math.floor(Math.random() * 8) + 1,
    });
    setCaptcha('');
  };

  const handleRoleSelect = (r: typeof ROLES[0]) => {
    setRole(r.id);
    setEmpId(r.empId);
    setPassword('demo123');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (Number(captcha) !== captchaSum.a + captchaSum.b) {
      setError('Invalid captcha — enter the correct sum.');
      regenerateCaptcha();
      return;
    }

    setBusy(true);
    try {
      await login(empId.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Authentication failed. Please verify credentials.'));
      regenerateCaptcha();
    } finally {
      setBusy(false);
    }
  };

  const handleInstantDemo = async () => {
    setBusy(true);
    try {
      await login(empId.trim() || 'EMP-NR-001', 'demo123');
      navigate(from, { replace: true });
    } catch {
      navigate(from, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#020B18] text-white flex flex-col justify-between selection:bg-[#F9931E]/30 selection:text-white">
      {/* Ambient Lighting & Glow Orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-[#003B82]/35 to-[#001838]/0 blur-[130px] pointer-events-none" />
      <div className="absolute top-[25%] right-[-15%] w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-[#F9931E]/20 to-[#CC6A00]/0 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[25%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#138808]/20 to-[#0A5E1C]/0 blur-[140px] pointer-events-none" />

      {/* Subtle Railway Grid Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #FFF 1px, transparent 0)`,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Top Bar Branding */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg shadow-black/40">
            <Train className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[13px] font-black tracking-wider uppercase text-white/90 font-mono flex items-center gap-1.5">
              <span>A-ABPS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                v2.1
              </span>
            </div>
            <div className="text-[10.5px] text-white/50 tracking-wide font-sans">
              Indian Railways AI Automatic Block Planning System
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 text-[11px] text-white/70">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CRIS Engine Online</span>
          </div>
          {isAuthenticated && (
            <Link
              to="/"
              className="px-3 py-1 rounded-full bg-white/[0.1] hover:bg-white/[0.2] border border-white/20 text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              <span>Console Active</span>
              <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </header>

      {/* Main Glassmorphism Card */}
      <main className="relative z-10 w-full max-w-[520px] mx-auto px-4 py-4 my-auto">
        <div
          className="relative rounded-2xl overflow-hidden backdrop-blur-2xl bg-white/[0.08] border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all"
        >
          {/* Tricolor Edge Glow */}
          <div
            className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"
            style={{ boxShadow: '0 0 16px rgba(255, 153, 51, 0.4)' }}
          />

          <div className="p-6 sm:p-8">
            {/* Header / National Emblem */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-b from-white/15 to-white/5 border border-white/25 shadow-inner mb-3">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              <h1 className="text-[20px] font-black tracking-tight text-white leading-tight font-sans">
                भारतीय रेल | INDIAN RAILWAYS
              </h1>
              <p className="text-[12px] text-white/65 mt-0.5 font-medium">
                Centre for Railway Information Systems (CRIS)
              </p>
              <p className="text-[10.5px] font-mono text-amber-400/90 tracking-wide mt-1">
                SECURE DISPATCHER &amp; CONTROLLER CONSOLE
              </p>
            </div>

            {/* Authenticated Warning / Quick Access */}
            {isAuthenticated && user && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 backdrop-blur-md flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-emerald-200">Active Session: {user.name}</div>
                    <div className="text-[10px] text-emerald-300/70">{user.role} · {user.zone}</div>
                  </div>
                </div>
                <Link
                  to="/"
                  className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-[#020B18] font-bold text-xs shadow-sm transition-colors flex items-center gap-1"
                >
                  <span>Dashboard</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            )}

            {/* Role Switcher Pills */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold text-white/70 block mb-2 uppercase tracking-wider">
                Select Console Persona / भूमिका चयन
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLES.map((r) => {
                  const isActive = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleSelect(r)}
                      className={`px-2.5 py-2 rounded-lg text-left text-[11px] font-medium transition-all border ${
                        isActive
                          ? 'bg-white/20 text-white border-amber-400/80 shadow-[0_0_12px_rgba(249,147,30,0.25)]'
                          : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.09] hover:text-white'
                      }`}
                    >
                      <div className="font-bold truncate text-[11px]">{r.label}</div>
                      <div className="text-[9.5px] text-white/45 font-mono">{r.empId} · {r.zone}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 backdrop-blur-md"
              >
                <AlertTriangle size={14} className="shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="empId" className="block text-[11px] font-semibold text-white/80 mb-1">
                  Employee ID / कर्मचारी आईडी
                </label>
                <div className="relative">
                  <input
                    id="empId"
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.06] border border-white/15 text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all backdrop-blur-sm"
                    placeholder="EMP-NR-001"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    required
                    autoComplete="username"
                  />
                  <span className="absolute right-3 top-3 text-[10px] text-white/40 font-mono">ID</span>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-[11px] font-semibold text-white/80 mb-1">
                  Security Password / पासवर्ड
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.06] border border-white/15 text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all backdrop-blur-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <KeyRound size={13} className="absolute right-3 top-3 text-white/40" />
                </div>
              </div>

              {/* Captcha */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-medium text-white/80">
                    Verify: <span className="font-mono font-bold text-amber-300">{captchaSum.a} + {captchaSum.b}</span> =
                  </span>
                  <button
                    type="button"
                    onClick={regenerateCaptcha}
                    className="text-white/40 hover:text-white transition-colors"
                    title="Refresh Captcha"
                  >
                    <RefreshCw size={11} />
                  </button>
                </div>
                <input
                  id="captcha"
                  type="text"
                  className="w-20 px-2 py-1 rounded bg-white/[0.08] border border-white/20 text-white text-center font-mono text-xs focus:outline-none focus:border-amber-400"
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                  placeholder="?"
                  required
                  inputMode="numeric"
                />
              </div>

              {/* Primary Login Button */}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#004492] to-[#002D62] hover:from-[#0055B3] hover:to-[#003B82] text-white font-bold text-xs tracking-wide shadow-lg shadow-black/40 border border-white/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Login to Secure Console / अधिकृत लॉगिन</span>
                  </>
                )}
              </button>

              {/* Instant One-Click Demo Access */}
              <button
                type="button"
                onClick={handleInstantDemo}
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border border-emerald-500/30 font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
              >
                <span>⚡ Instant Demo Access / पूर्वावलोकन (One-Click)</span>
              </button>
            </form>

            {/* Server Settings Accordion */}
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-white/50">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-[10px]">Render API: Connected</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfig((v) => !v)}
                  className="text-amber-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Server size={11} />
                  <span>{showConfig ? 'Hide Settings' : 'Configure Server'}</span>
                </button>
              </div>

              {showConfig && (
                <div className="mt-2 p-3 rounded-lg bg-white/[0.05] border border-white/15 text-[11px] space-y-2">
                  <label htmlFor="api-url" className="text-white/80 font-medium block">
                    Backend API Origin URL:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="api-url"
                      type="text"
                      className="flex-1 px-2.5 py-1 rounded bg-black/40 border border-white/20 text-white font-mono text-[10.5px]"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://nirvaan-f4oi.onrender.com"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setApiBaseUrl(apiUrl);
                        setSavedUrlNotice(true);
                        setTimeout(() => setSavedUrlNotice(false), 2500);
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[10.5px] transition-colors shrink-0"
                    >
                      {savedUrlNotice ? <Check size={12} /> : 'Save'}
                    </button>
                  </div>
                  <p className="text-[9.5px] text-white/40">
                    Live backend: <code>https://nirvaan-f4oi.onrender.com</code> or local <code>http://127.0.0.1:8000</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Statutory Footer notice */}
          <div className="bg-red-950/40 border-t border-red-500/20 px-4 py-2 text-center text-[10px] text-red-300/80 font-mono">
            RESTRICTED SYSTEM · UNAUTHORIZED ACCESS PROHIBITED UNDER IT ACT 2000 §66
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 py-4 text-center text-xs text-white/40">
        <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 mb-1 font-medium">
          <span>Ministry of Railways</span>
          <span>·</span>
          <span>Centre for Railway Information Systems (CRIS)</span>
          <span>·</span>
          <span>Government of India</span>
        </div>
        <p className="text-[10px] font-mono text-white/30">
          A-ABPS v2.1 (Automatic Asset &amp; Block Planning System) · Protected by G&amp;SR Rules 2026
        </p>
      </footer>
    </div>
  );
}
