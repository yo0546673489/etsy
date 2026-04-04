// apps/web/design/components/Badge.tsx
'use client';

import { cn } from '../cn';
import { tw } from '../tokens';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = 'neutral', children, className, dot }: BadgeProps) {
  return (
    <span className={cn(tw.badge[variant], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current me-1.5" />}
      {children}
    </span>
  );
}
