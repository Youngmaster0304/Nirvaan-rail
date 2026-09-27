import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'destructive' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    const variantStyles =
      variant === 'default'
        ? 'm-btn primary'
        : variant === 'outline'
          ? 'm-btn'
          : variant === 'destructive'
            ? 'm-btn danger'
            : 'm-btn';

    const sizeStyles =
      size === 'sm'
        ? 'text-[10.5px] px-2.5 py-1'
        : size === 'lg'
          ? 'text-[13px] px-5 py-2.5'
          : size === 'icon'
            ? 'p-2'
            : '';

    return (
      <button
        ref={ref}
        type={type}
        className={cn(variantStyles, sizeStyles, variant === 'ghost' && 'bg-transparent border-transparent shadow-none', className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
