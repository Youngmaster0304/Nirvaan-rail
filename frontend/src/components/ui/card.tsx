import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('m-card', className)}>{children}</div>;
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-4 py-3 border-b border-hairline', className)}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-[13px] font-bold text-ink', className)}>{children}</h3>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-[11.5px] text-ink-muted', className)}>{children}</p>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-4 py-3 border-t border-hairline bg-tints-400', className)}>{children}</div>;
}
