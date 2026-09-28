import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiErrorMessage, getApiBaseUrl, setApiBaseUrl } from '../services/api';
import { GovtHeader } from '../components/GovtHeader';
import { GovtFooter } from '../components/GovtFooter';
import { Server, Check, ShieldCheck, UserCheck, KeyRound, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';

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
    <div className="min-h-screen bg-canvas flex flex-col justify-between selection:bg-[#002D62] selection:text-white">
      {/* Official Government of India Header */}
      <GovtHeader />

      {/* Main Container with Soft Government Depth */}
      <main className="flex-1 flex flex-col items-center justify-center py-8 px-4 relative">
        {/* Soft Ambient Depth behind the Card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#002D62]/[0.04] blur-[100px] pointer-events-none" />

        {/* Frosted Glassmorphism Government Card */}
        <div className="w-full max-w-[500px] bg-white/95 backdrop-blur-md rounded-card border border-[#C8D4E6] shadow-gov-lg overflow-hidden relative z-10">
          {/* Official Indian Railways Tricolor Line */}
          <div className="tricolor-line" role="presentation" />

          <div className="p-6 sm:p-8">
            {/* Header & Emblem */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-chip bg-[#002D62]/[0.06] border border-[#002D62]/15 text-[#002D62] mb-2.5 shadow-2xs">
                <ShieldCheck size={26} />
              </div>
              <h1 className="text-[20px] font-bold text-[#002D62] leading-tight font-sans">
                भारतीय रेल | INDIAN RAILWAYS
              </h1>
              <p className="text-[12.5px] text-ink-muted mt-0.5 font-medium">
                Ministry of Railways, Government of India
              </p>
              <p className="text-[11.5px] text-[#002D62] font-semibold mt-1">
                AI Block Planning System | एआई स्वचालित ब्लॉक योजना प्रणाली
              </p>
              <div className="w-20 h-px official-rule mx-auto mt-3" aria-hidden="true" />
            </div>

            {/* If Already Logged In */}
            {isAuthenticated && user && (
              <div className="mb-4 p-3 rounded-chip bg-[#E5F4EA] border border-[#8DD4A0] flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#138808] shrink-0" />
                  <div>
                    <div className="font-bold text-[#0A6B21]">Active Session: {user.name}</div>
                    <div className="text-[10px] text-[#546380]">{user.role} · {user.zone}</div>
                  </div>
                </div>
                <Link
                  to="/"
                  className="px-2.5 py-1 rounded-chip bg-[#138808] hover:bg-[#0F6F06] text-white font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                >
                  <span>Dashboard</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            )}

            {/* Role Persona Pills (Matching Website's Filter Pills) */}
            <div className="mb-4">
              <label className="section-label block mb-1.5">
                Select Persona / भूमिका चयन
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLES.map((r) => {
                  const isActive = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleSelect(r)}
                      className={`px-2.5 py-2 rounded-chip text-left text-[11px] transition-all border ${
                        isActive
                          ? 'bg-[#002D62] text-white border-[#002D62] shadow-xs font-bold'
                          : 'bg-[#F8FAFD] text-[#334155] border-[#CBD5E1] hover:bg-[#EEF3FA] font-medium'
                      }`}
                    >
                      <div className="truncate">{r.label}</div>
                      <div className={`text-[9.5px] font-mono mt-0.5 ${isActive ? 'text-white/70' : 'text-[#8090A8]'}`}>
                        {r.empId} · {r.zone}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 p-2.5 bg-danger-surface text-status-rejected border border-danger-line rounded-chip text-[11.5px] flex items-center gap-2"
              >
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3.5 text-left">
              <div>
                <label htmlFor="empId" className="m-field-label">
                  Employee ID / कर्मचारी आईडी
                </label>
                <input
                  id="empId"
                  type="text"
                  className="m-field mono"
                  placeholder="e.g. EMP-NR-001"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="password" className="m-field-label">
                  Security Password / पासवर्ड
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    className="m-field mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <KeyRound size={13} className="absolute right-2.5 top-3 text-[#8090A8]" />
                </div>
              </div>

              {/* Captcha */}
              <div className="p-2.5 rounded-chip bg-[#F8FAFD] border border-[#CBD5E1] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-medium text-ink">
                    Verify: <span className="font-mono font-bold text-[#002D62]">{captchaSum.a} + {captchaSum.b}</span> =
                  </span>
                  <button
                    type="button"
                    onClick={regenerateCaptcha}
                    className="text-[#8090A8] hover:text-[#002D62] transition-colors p-0.5"
                    title="Refresh Captcha"
                  >
                    <RefreshCw size={11} />
                  </button>
                </div>
                <input
                  id="captcha"
                  type="text"
                  className="m-field mono w-18 py-1 text-center font-bold"
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
                className="m-btn primary w-full py-2.5 text-[12px] font-bold shadow-xs flex items-center justify-center gap-2"
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

              {/* One-Click Instant Demo Access */}
              <button
                type="button"
                onClick={handleInstantDemo}
                disabled={busy}
                className="w-full py-2 px-3 rounded-chip border border-[#138808] text-[#0A6B21] bg-[#138808]/[0.06] hover:bg-[#138808] hover:text-white font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>⚡ Instant Demo Access / पूर्वावलोकन मोड (Preloaded Session)</span>
              </button>
            </form>

            {/* Server Settings Accordion */}
            <div className="mt-4 pt-3 border-t border-[#DCE5F0] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#546380]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#138808]" />
                  <span className="font-mono text-[10px] text-ink">Render API: Connected</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfig((v) => !v)}
                  className="text-[#002D62] hover:underline flex items-center gap-1 font-semibold text-[11px]"
                >
                  <Server size={11} />
                  <span>{showConfig ? 'Hide Settings' : 'Configure Server'}</span>
                </button>
              </div>

              {showConfig && (
                <div className="mt-2 p-2.5 rounded-chip bg-[#F8FAFD] border border-[#CBD5E1] text-[11px] space-y-2">
                  <label htmlFor="api-url" className="text-slate-700 font-semibold block text-[11px]">
                    Backend API Origin URL:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="api-url"
                      type="text"
                      className="m-field flex-1 font-mono text-[11px] py-1"
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
                      className="m-btn primary py-1 px-3 text-[11px] shrink-0"
                    >
                      {savedUrlNotice ? <Check size={12} /> : 'Save'}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#8090A8]">
                    Live backend: <code>https://nirvaan-f4oi.onrender.com</code> or local <code>http://127.0.0.1:8000</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Statutory Red Warning Notice */}
          <div className="border-t-2 border-rail-red bg-danger-surface p-2.5 text-[10.5px] font-bold text-status-rejected text-center leading-snug">
            WARNING: This is a Government of India computer system. Unauthorized access is punishable
            under IT Act 2000, Section 66.
          </div>
        </div>
      </main>

      {/* Official Government Footer */}
      <GovtFooter />
    </div>
  );
}

