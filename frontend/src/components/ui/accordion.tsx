import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../lib/utils';

const AccordionContext = createContext<{
  openItems: string[];
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
} | undefined>(undefined);

export function Accordion({
  type = 'single',
  collapsible = false,
  className = '',
  children,
}: {
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (value: string) => {
    setOpenItems((prev) => {
      if (prev.includes(value)) {
        return type === 'single' && !collapsible ? prev : prev.filter((i) => i !== value);
      }
      return type === 'single' ? [value] : [...prev, value];
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn('border border-hairline-strong rounded-card bg-white divide-y divide-hairline', className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

const AccordionItemContext = createContext<{ value: string } | undefined>(undefined);

export function AccordionItem({ value, className = '', children }: { value: string; className?: string; children: React.ReactNode }) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={className}>{children}</div>
    </AccordionItemContext.Provider>
  );
}

export function AccordionTrigger({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const ctx = useContext(AccordionContext);
  const itemCtx = useContext(AccordionItemContext);
  if (!ctx || !itemCtx) return null;
  const isOpen = ctx.openItems.includes(itemCtx.value);

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      className={cn(
        'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[12px] font-semibold text-ink hover:bg-tints-400 focus-visible:outline focus-visible:outline-2',
        className,
      )}
      onClick={() => ctx.toggleItem(itemCtx.value)}
    >
      {children}
      <span className="mono text-[13px] text-ink-muted shrink-0" aria-hidden="true">
        {isOpen ? '−' : '+'}
      </span>
    </button>
  );
}

export function AccordionContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const ctx = useContext(AccordionContext);
  const itemCtx = useContext(AccordionItemContext);
  if (!ctx || !itemCtx) return null;
  if (!ctx.openItems.includes(itemCtx.value)) return null;

  return (
    <div className={cn('px-3 pb-3 pt-1 text-[12px] leading-relaxed text-ink-muted bg-tints-100', className)}>
      {children}
    </div>
  );
}
