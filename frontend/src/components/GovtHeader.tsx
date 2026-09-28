import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * 24-spoke Ashoka Chakra vector matching the official Government of India seal from Figma
 */
export const AshokaChakra: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-8 h-8',
  size = 32,
}) => {
  const spokes = Array.from({ length: 24 }, (_, idx) => {
    const angle = (idx * 15 * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return (
      <line
        key={idx}
        x1={16 + 5 * cos}
        y1={16 + 5 * sin}
        x2={16 + 12 * cos}
        y2={16 + 12 * sin}
        stroke="#002D62"
        strokeWidth="0.65"
      />
    );
  });

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="15.5" stroke="#002D62" strokeWidth="1" />
      <circle cx="16" cy="16" r="12" stroke="#002D62" strokeWidth="0.6" strokeDasharray="2 1.2" />
      <circle cx="16" cy="16" r="5" stroke="#002D62" strokeWidth="1" />
      {spokes}
      <circle cx="16" cy="16" r="2" fill="#002D62" />
    </svg>
  );
};

export const GovtHeader: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const [liveTime, setLiveTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST'
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST'
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sessionId = token ? `SES-NCR-20260927-${token.slice(-4).toUpperCase()}` : 'SES-NCR-20260927-2094';

  return (
    <header className="w-full z-40 relative no-print select-none">
      <div className="goi-bar px-4 py-1.5" style={{ borderBottom: '1px solid #C8D4E6' }}>
        <div className="flex items-center justify-between h-9 max-w-[1700px] mx-auto gap-3">
          {/* Left — 24-spoke Chakra + Ministry Identity */}
          <div className="flex items-center gap-3">
            <AshokaChakra size={28} className="w-7 h-7 flex-shrink-0" />
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold tracking-wide"
                  style={{ color: '#002D62', fontFamily: 'Noto Sans Devanagari, Noto Sans, sans-serif' }}
                >
                  भारत सरकार
                </span>
                <span className="text-[10px]" style={{ color: '#A0AABF' }}>
                  |
                </span>
                <span className="text-xs font-semibold" style={{ color: '#002D62' }}>
                  Government of India
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[10px]"
                  style={{ color: '#546380', fontFamily: 'Noto Sans Devanagari, Noto Sans, sans-serif' }}
                >
                  रेल मंत्रालय
                </span>
                <span className="text-[10px]" style={{ color: '#A0AABF' }}>
                  |
                </span>
                <span className="text-[10px] font-medium" style={{ color: '#546380' }}>
                  Ministry of Railways
                </span>
              </div>
            </div>
          </div>

          {/* Centre — CRIS Title */}
          <div className="text-center hidden md:block">
            <div
              className="text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: '#546380', letterSpacing: '0.14em' }}
            >
              Centre for Railway Information Systems (CRIS)
            </div>
          </div>

          {/* Right — Session metadata & Clock */}
          <div className="text-right flex items-center gap-3">
            <div className="sys-meta hidden sm:block">
              <span className="opacity-80">Session:</span> <span className="font-semibold">{sessionId}</span>
            </div>
            <span className="hidden sm:inline text-slate-300">|</span>
            <div className="sys-meta font-medium">
              <span>Date: 27/09/2026 · </span>
              <span className="font-semibold text-slate-800">{liveTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tricolor separator line */}
      <div className="tricolor-line" role="presentation" />
    </header>
  );
};

