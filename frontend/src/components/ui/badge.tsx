import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const VARIANTS: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'stamp active',
  secondary: 'stamp neutral',
  destructive: 'stamp critical',
  outline: 'stamp neutral bg-transparent',
  success: 'stamp approved',
  warning: 'stamp pending',
};

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  return <span className={cn(VARIANTS[variant], className)} {...props} />;
}
