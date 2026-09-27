import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { stampVariant } from './StatusBadge';
import type { AuditEntry } from '../services/types';

export type { AuditEntry };

interface AuditLogEntryProps {
  entry: AuditEntry;
}

function detailText(details: unknown): string {
  if (details == null) return '';
  let text: string;
  if (typeof details === 'string') text = details;
  else {
    try {
      text = JSON.stringify(details);
    } catch {
      text = String(details);
    }
  }
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

export const AuditLogEntry: React.FC<AuditLogEntryProps> = ({ entry }) => {
  const who = entry.user_name || 'System';
  const detail = detailText(entry.details);

  return (
    <div className="border-b border-hairline last:border-b-0 py-2 px-3 flex flex-col gap-1 bg-transparent hover:bg-tints-400 transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`stamp ${stampVariant(entry.action)} max-w-[150px] truncate`}>
          {entry.action}
        </span>
        <span className="text-[11px] font-bold text-ink truncate">{who}</span>
        <span className="sys-meta ml-auto shrink-0">{entry.timestamp}</span>
      </div>

      <div className="text-[11.5px] text-ink leading-snug">
        {entry.entity_type && (
          <span className="mono text-[10.5px] text-ink-muted mr-1.5">
            {entry.entity_type}
            {entry.entity_id ? ` ${entry.entity_id}` : ''}
          </span>
        )}
        {detail}
      </div>

      {entry.reason && (
        <div className="text-[10.5px] text-ink-muted italic border-l-2 border-hairline-strong pl-2">
          {entry.reason}
        </div>
      )}

      {entry.is_override && (
        <span className="stamp critical self-start mt-0.5">
          <ShieldAlert size={10} aria-hidden="true" />
          Human override
        </span>
      )}
    </div>
  );
};
