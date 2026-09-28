import React, { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  action: 'approve' | 'reject';
  entityId: string;
  entityType: string;
  /** Optional spinner state while the API call is in flight. */
  busy?: boolean;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  entityId,
  entityType,
  busy = false,
}) => {
  const [reason, setReason] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, textarea, input, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isReject = action === 'reject';
  const confirmDisabled = busy || (isReject && reason.trim().length === 0);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 no-print">
      <div className="absolute inset-0 bg-[#001128]/45 backdrop-blur-md transition-opacity duration-200" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        className="relative w-full max-w-md m-card overflow-hidden"
      >
        <div
          className={cn(
            'px-4 py-2.5 text-white flex items-center justify-between',
            isReject ? 'btn-commit-danger' : 'btn-commit-ok',
          )}
        >
          <h2 id="decision-title" className="text-[13px] font-bold tracking-wide">
            {isReject ? 'Confirm rejection' : 'Confirm approval'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-chip hover:bg-white/20 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 border border-hairline-strong bg-tints-400 px-2.5 py-1.5 rounded-chip">
            <span className="section-label">{entityType}</span>
            <span className="mono text-[11.5px] font-bold">{entityId}</span>
          </div>

          <div>
            <label htmlFor="decision-reason" className="m-field-label">
              Reason{isReject ? ' (required)' : ' (optional)'}
            </label>
            <textarea
              id="decision-reason"
              className="m-field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={isReject}
              placeholder={isReject ? 'State why this plan cannot be accepted' : 'Note for the audit record'}
            />
          </div>

          <div className="flex items-start gap-2 border border-warn-line bg-warn-surface text-status-pending px-2.5 py-2 rounded-chip text-[11px]">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>This decision is written to the append-only audit trail with your employee ID.</span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-hairline-strong bg-tints-400 flex justify-end gap-2">
          <button type="button" className="m-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={isReject ? 'm-btn danger' : 'm-btn success'}
            onClick={() => onConfirm(reason)}
            disabled={confirmDisabled}
          >
            {busy ? 'Recording…' : isReject ? 'Reject plan' : 'Approve plan'}
          </button>
        </div>
      </div>
    </div>
  );
};
