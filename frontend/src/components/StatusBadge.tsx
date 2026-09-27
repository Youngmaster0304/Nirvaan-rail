import React from 'react';

export type BadgeStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'MERGED'
  | 'DRAFT'
  | 'COMPLETED'
  | 'ACTIVE'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'CONFLICT';

export type StampVariant = 'approved' | 'pending' | 'critical' | 'active' | 'medium' | 'neutral';

export function stampVariant(status: string): StampVariant {
  switch (String(status).toUpperCase()) {
    case 'APPROVED':
    case 'APPROVE':
    case 'COMPLETED':
      return 'approved';
    case 'PENDING':
    case 'DRAFT':
    case 'HIGH':
    case 'OVERRIDE':
      return 'pending';
    case 'REJECTED':
    case 'REJECT':
    case 'CRITICAL':
    case 'CONFLICT':
      return 'critical';
    case 'MERGED':
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return 'active';
    case 'MEDIUM':
      return 'medium';
    default:
      return 'neutral';
  }
}

/** Severity glyphs are specified by the reference design (task_plan.md §1). */
const SEVERITY_GLYPH: Record<string, string> = {
  CRITICAL: '⚑',
  HIGH: '▲',
  MEDIUM: '◆',
  LOW: '▼',
};

interface StatusBadgeProps {
  status: BadgeStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
  <span className={`stamp ${stampVariant(status)}`} role="status" aria-label={`Status: ${status}`}>
    {String(status).toUpperCase()}
  </span>
);

interface SeverityStampProps {
  severity: string;
}

export const SeverityStamp: React.FC<SeverityStampProps> = ({ severity }) => {
  const key = String(severity).toUpperCase();
  return (
    <span className={`stamp ${stampVariant(key)}`} role="status" aria-label={`Severity: ${severity}`}>
      <span aria-hidden="true" className="text-[9px] leading-none">
        {SEVERITY_GLYPH[key] ?? '·'}
      </span>
      {key}
    </span>
  );
};
