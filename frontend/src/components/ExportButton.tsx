import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface ExportButtonProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExportPDF,
  onExportExcel,
  label = 'Export',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="m-btn"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Download size={13} aria-hidden="true" />
        {label}
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-48 border border-hairline-strong bg-white shadow-gov-md z-20 py-0.5"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onExportPDF();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-[11.5px] hover:bg-tints-600 flex items-center gap-2"
          >
            <FileText size={14} className="text-rail-red" aria-hidden="true" />
            Download as PDF
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onExportExcel();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-[11.5px] hover:bg-tints-600 flex items-center gap-2"
          >
            <FileSpreadsheet size={14} className="text-status-approved" aria-hidden="true" />
            Download as Excel
          </button>
        </div>
      )}
    </div>
  );
};
