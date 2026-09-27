import React, { useState } from 'react';
import { AlertTriangle, XCircle, Info, CheckCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface WarningBannerProps {
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  onDismiss?: () => void;
}

const CONFIG = {
  warning: {
    icon: AlertTriangle,
    wrap: 'border-warn-line bg-warn-surface text-status-pending',
    iconColor: 'text-warn-icon',
  },
  error: {
    icon: XCircle,
    wrap: 'border-danger-line bg-danger-surface text-status-rejected',
    iconColor: 'text-rail-red',
  },
  info: {
    icon: Info,
    wrap: 'border-info-line bg-tints-600 text-navy',
    iconColor: 'text-navy-bright',
  },
  success: {
    icon: CheckCircle,
    wrap: 'border-ok-line bg-ok-surface text-status-approved',
    iconColor: 'text-status-approved',
  },
} as const;

export const WarningBanner: React.FC<WarningBannerProps> = ({ type, message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);
  if (!isVisible) return null;

  const { icon: Icon, wrap, iconColor } = CONFIG[type];

  return (
    <div
      className={cn(
        'w-full flex items-start gap-2 border-l-[3px] rounded-chip px-2.5 py-2 text-[11.5px] leading-snug',
        wrap,
      )}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <Icon size={14} className={cn('shrink-0 mt-0.5', iconColor)} aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          onDismiss?.();
        }}
        className="shrink-0 -mr-1 p-0.5 rounded-chip hover:bg-black/5 focus-visible:outline focus-visible:outline-1"
        aria-label="Dismiss alert"
      >
        <X size={13} />
      </button>
    </div>
  );
};
