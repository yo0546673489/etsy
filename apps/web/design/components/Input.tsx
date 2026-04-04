// apps/web/design/components/Input.tsx
'use client';

import { forwardRef } from 'react';
import { cn } from '../cn';
import { tw } from '../tokens';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className={tw.text.label}>{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6d7a70]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              tw.input.base,
              icon && 'pr-10',
              error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#6d7a70]">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
