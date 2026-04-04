// apps/web/design/components/Button.tsx
'use client';

import { forwardRef } from 'react';
import { cn } from '../cn';
import { tw } from '../tokens';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          tw.button[variant],
          variant !== 'icon' && sizeClasses[size],
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="flex items-center gap-2">
            {icon}
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
