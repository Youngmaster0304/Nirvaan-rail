import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading' }) => (
  <div className="flex flex-col items-center justify-center p-8" role="status" aria-live="polite">
    <span
      className="w-7 h-7 border-2 border-hairline-strong border-t-navy rounded-full animate-spin mb-3"
      aria-hidden="true"
    />
    <span className="text-[11px] font-semibold text-ink-muted">{message}…</span>
  </div>
);
