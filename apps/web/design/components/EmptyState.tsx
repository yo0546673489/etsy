// apps/web/design/components/EmptyState.tsx
'use client';

import { cn } from '../cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-[#6d7a70] mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-[#181c22] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#6d7a70] mb-4 max-w-md">{description}</p>}
      {action}
    </div>
  );
}
