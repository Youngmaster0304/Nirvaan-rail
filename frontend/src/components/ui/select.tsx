import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleValueChange = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <SelectContext.Provider
      value={{
        value: value !== undefined ? value : internalValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
      }}
    >
      <div ref={containerRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ctx = useContext(SelectContext);
  return (
    <button
      type="button"
      className={cn(
        'm-field flex h-9 items-center justify-between text-left cursor-pointer',
        className,
      )}
      onClick={() => ctx?.setOpen(!ctx.open)}
      aria-haspopup="listbox"
      aria-expanded={ctx?.open ?? false}
    >
      {children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60 shrink-0"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = useContext(SelectContext);
  return <span className="truncate">{ctx?.value || placeholder}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const ctx = useContext(SelectContext);
  if (!ctx?.open) return null;
  return (
    <div
      role="listbox"
      className="absolute z-50 mt-1 max-h-60 w-full overflow-auto border border-hairline-strong bg-white shadow-gov-md"
    >
      <div className="py-0.5">{children}</div>
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(SelectContext);
  const isSelected = ctx?.value === value;
  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={cn(
        'w-full cursor-pointer select-none px-3 py-1.5 text-[11.5px] outline-none hover:bg-tints-600',
        isSelected && 'bg-tints-950 font-bold text-navy',
      )}
      onClick={() => ctx?.onValueChange(value)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ctx?.onValueChange(value);
        }
      }}
    >
      {children}
    </div>
  );
}
