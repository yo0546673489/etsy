// apps/web/design/components/StatCard.tsx
'use client';

import { cn } from '../cn';
import { tw } from '../tokens';

interface StatCardProps {
  label: string;
  value: string | number;
  badge?: string;
  badgeVariant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  icon?: React.ReactNode;
  iconVariant?: 'primary' | 'danger' | 'info' | 'warning';
  className?: string;
}

const badgeColorMap = {
  success: 'text-[#006d43]',
  danger: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
  neutral: 'text-gray-500',
};

export function StatCard({ label, value, badge, badgeVariant = 'success', icon, iconVariant = 'primary', className }: StatCardProps) {
  return (
    <div className={cn(tw.card.base, 'px-6 pt-5 pb-6', className)}>
      <div className="flex items-center justify-between mb-5">
        {badge && (
          <span className={cn('text-sm font-semibold', badgeColorMap[badgeVariant])}>{badge}</span>
        )}
        {icon && <div className={tw.iconCircle[iconVariant]}>{icon}</div>}
      </div>
      <p className="text-sm text-gray-400 text-center mb-1.5">{label}</p>
      <p className="text-[28px] leading-tight font-black text-gray-800 text-center" dir="ltr">{value}</p>
    </div>
  );
}
