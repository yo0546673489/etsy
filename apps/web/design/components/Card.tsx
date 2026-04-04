// apps/web/design/components/Card.tsx
'use client';

import { cn } from '../cn';
import { tw } from '../tokens';

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  hoverable?: boolean;
}

export function Card({ title, subtitle, icon, action, children, className, noPadding, hoverable }: CardProps) {
  return (
    <div className={cn(tw.card.base, hoverable && tw.card.hover, className)}>
      {(title || action) && (
        <div className="flex items-center justify-between p-5 border-b border-[rgba(188,202,190,0.6)]">
          <div className="flex items-center gap-3">
            {icon && <div className={tw.iconCircle.primary}>{icon}</div>}
            <div>
              {title && <h3 className="text-lg font-semibold text-[#181c22]">{title}</h3>}
              {subtitle && <p className="text-sm text-[#6d7a70]">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={cn(!noPadding && tw.card.padding)}>{children}</div>
    </div>
  );
}
