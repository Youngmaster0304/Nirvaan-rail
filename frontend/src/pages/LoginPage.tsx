import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiErrorMessage } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Dispatcher');
  const [captcha, setCaptcha] = useState('');
  const [captchaSum, setCaptchaSum] = useState(() => ({
    a: Math.floor(Math.random() * 10),
    b: Math.floor(Math.random() * 10),
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
