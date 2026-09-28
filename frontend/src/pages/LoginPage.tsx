import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiErrorMessage, getApiBaseUrl, setApiBaseUrl } from '../services/api';
import { Server, Check } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  const [empId, setEmpId] = useState('EMP-NR-001');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState('Dispatcher');
  const [captcha, setCaptcha] = useState('');
  const [captchaSum, setCaptchaSum] = useState(() => ({
    a: Math.floor(Math.random() * 10),
    b: Math.floor(Math.random() * 10),
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [savedUrlNotice, setSavedUrlNotice] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  // New sum whenever credentials change, so a failed attempt cannot be replayed.
  useEffect(() => {
    setCaptchaSum({ a: Math.floor(Math.random() * 10), b: Math.floor(Math.random() * 10) });
  }, [empId, password]);

  if (bootstrapped && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (Number(captcha) !== captchaSum.a + captchaSum.b) {
      setError('Invalid captcha — enter the correct sum.');
      return;
    }

    setBusy(true);
    try {
      await login(empId.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid Employee ID or Password'));
      setCaptcha('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-lg m-card overflow-hidden">
        {/* Tricolor Top Bar */}
        <div className="tricolor-line" role="presentation" />

        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <h1 className="text-[26px] font-bold text-navy mb-2 leading-tight">
            भारतीय रेल | INDIAN RAILWAYS
          </h1>
          <h2 className="text-[15px] text-ink-muted mb-1">Ministry of Railways, Government of India</h2>
          <h3 className="text-[13px] text-navy font-semibold mb-5">
            AI Block Planning System | एआई ब्लॉक योजना प्रणाली
          </h3>
          <div className="w-24 h-px official-rule mb-5" aria-hidden="true" />

          {error && (
            <div
              role="alert"
              className="w-full mb-4 p-2 bg-danger-surface text-status-rejected border border-danger-line rounded-chip text-[12px] text-left"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full text-left">
            <div className="mb-3.5">
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

            <div className="mb-3.5">
              <label htmlFor="password" className="m-field-label">
                Password / पासवर्ड
              </label>
              <input
                id="password"
                type="password"
                className="m-field mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="mb-3.5">
              <label htmlFor="role" className="m-field-label">
                Role / भूमिका
              </label>
              <select
                id="role"
                className="m-field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Dispatcher">Dispatcher</option>
                <option value="Maintenance Officer">Maintenance Officer</option>
                <option value="Supervisor">Supervisor</option>
              </select>
            </div>

            <div className="mb-5 flex items-center justify-between gap-3">
              <label htmlFor="captcha" className="text-[12px] font-semibold text-ink">
                What is {captchaSum.a} + {captchaSum.b}? / योग क्या है?
              </label>
              <input
                id="captcha"
                type="text"
                className="m-field mono w-20 shrink-0"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                required
                inputMode="numeric"
              />
            </div>

            <button type="submit" className="m-btn primary w-full py-2.5" disabled={busy}>
              {busy ? 'Verifying…' : 'Login / लॉगिन करें'}
            </button>

            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                try {
                  await login('EMP-NR-001', 'demo123');
                  navigate(from, { replace: true });
                } catch {
                  navigate(from, { replace: true });
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-2.5 w-full py-2 px-3 rounded-sm border border-[#002D62] text-[#002D62] hover:bg-[#002D62]/5 font-bold text-[12px] flex items-center justify-center gap-1.5 transition-colors"
              disabled={busy}
            >
              ⚡ Instant Demo Access / पूर्वावलोकन मोड (Preloaded Session)
            </button>

            <div className="mt-4 flex justify-between text-[12px]">
              <span className="text-ink-muted opacity-60 select-none" aria-disabled="true">
                Forgot Password?
              </span>
              <span className="text-ink-muted opacity-60 select-none" aria-disabled="true">
                New User Registration
              </span>
            </div>
          </form>
        </div>

        {/* Server Endpoint Config & Quick Helper */}
        <div className="px-5 py-3 bg-[#EAF0F8]/50 border-t border-[#C8D4E6] flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="sys-meta font-medium">Demo: <code className="font-mono text-ink">EMP-NR-001</code> / <code className="font-mono text-ink">demo123</code></span>
            <button
              type="button"
              onClick={() => setShowConfig((v) => !v)}
              className="text-[#002D62] hover:underline flex items-center gap-1 font-semibold text-[11px]"
            >
              <Server size={12} />
              {showConfig ? 'Hide Server Settings' : 'Configure API Server'}
            </button>
          </div>

          {showConfig && (
            <div className="mt-1 p-2.5 bg-white border border-[#C8D4E6] rounded text-[11px] flex flex-col gap-2">
              <label htmlFor="api-url" className="font-semibold text-slate-700">
                Backend API Origin URL (Render or Localhost):
              </label>
              <div className="flex gap-2">
                <input
                  id="api-url"
                  type="text"
                  placeholder="e.g. https://a-abps-api.onrender.com or http://localhost:8000"
                  className="m-field flex-1 font-mono text-[11px] py-1"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
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
                  {savedUrlNotice ? <Check size={12} /> : 'Save URL'}
                </button>
              </div>
              <span className="text-[10px] text-slate-500">
                Leave empty for relative <code>/api</code>. Point to your Render service or localhost.
              </span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-rail-red bg-danger-surface p-3 text-[11px] font-bold text-status-rejected text-center leading-snug">
          WARNING: This is a Government of India computer system. Unauthorized access is punishable
          under IT Act 2000, Section 66.
        </div>
      </div>

      <div className="mt-5 sys-meta text-center">
        For demo: Employee ID: EMP-NR-001, Password: demo123
      </div>

      <footer className="mt-auto pt-6 w-full text-center">
        <nav className="flex justify-center flex-wrap gap-x-3 gap-y-1 mb-2 text-[12px] text-navy">
          <span className="hover:underline">Ministry of Railways</span>
          <span className="text-hairline-strong" aria-hidden="true">
            |
          </span>
          <span className="hover:underline">CRIS</span>
          <span className="text-hairline-strong" aria-hidden="true">
            |
          </span>
          <span className="hover:underline">National Portal of India</span>
        </nav>
        <p className="sys-meta">© 2026 Centre for Railway Information Systems. All rights reserved.</p>
      </footer>
    </div>
  );
}
