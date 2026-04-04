# ריפקטור: הפרדת מערכת עיצוב (Design System) לתיקייה נפרדת

## מטרה
להוציא את כל העיצוב של האתר (`apps/web/`) לתיקייה מרוכזת אחת — `apps/web/design/` — כך שאפשר יהיה לעבוד על עיצוב בצ'אט נפרד בלי לגעת בלוגיקה עסקית, ולעבוד על פיצ'רים בלי לגעת בעיצוב.

**שים לב:** לאפליקציה יש תיקיית design נפרדת: `apps/mobile/design/`. הצבעים דומים אבל כל אחת עצמאית.

```
apps/web/design/          ← עיצוב האתר (Tailwind + CSS) — המסמך הזה
apps/mobile/design/       ← עיצוב האפליקציה (StyleSheet + RN) — מסמך נפרד
```

---

## מבנה תיקיית העיצוב הסופי

```
apps/web/design/
├── tokens.ts              # כל משתני העיצוב: צבעים, ספייסינג, רדיוסים, צלליות, פונטים
├── globals.css            # הקובץ הגלובלי (להעביר מ-app/globals.css)
├── tailwind.config.js     # הקונפיג של Tailwind (להעביר מ-apps/web/tailwind.config.js)
├── cn.ts                  # פונקציית cn (להעביר מ-lib/utils.ts)
├── index.ts               # barrel export — כל הקומפוננטות והטוקנים מיוצאים מפה
│
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Alert.tsx           # להעביר ולשפר מ-components/ui/Alert.tsx
│   ├── DataTable.tsx       # להעביר מ-components/ui/DataTable.tsx
│   ├── Tooltip.tsx
│   ├── Skeleton.tsx
│   ├── Toggle.tsx
│   ├── Tabs.tsx
│   ├── EmptyState.tsx
│   ├── StatusBadge.tsx     # badge לסטטוסים (active, pending, failed וכו')
│   ├── StatCard.tsx        # כרטיס סטטיסטיקה (כרגע inline בדף dashboard)
│   └── IconCircle.tsx      # עיגול אייקון עם רקע (חוזר בהרבה מקומות)
│
├── layout/
│   ├── Sidebar.tsx         # להעביר מ-components/layout/Sidebar.tsx
│   ├── TopBar.tsx          # להעביר מ-components/layout/TopBar.tsx
│   ├── DashboardLayout.tsx # להעביר מ-components/layout/DashboardLayout.tsx
│   ├── SearchModal.tsx     # להעביר מ-components/layout/SearchModal.tsx
│   └── NotificationPanel.tsx # להעביר מ-components/layout/NotificationPanel.tsx
│
└── README.md              # תיעוד: איך להשתמש, קונבנציות, רשימת קומפוננטות
```

---

## שלב 1: יצירת tokens.ts — מקור אמת יחיד לכל הצבעים

קובץ זה מרכז את כל הערכים שכרגע מפוזרים ב-`globals.css`, `tailwind.config.js`, ו-inline classes.

```typescript
// apps/web/design/tokens.ts

export const colors = {
  // === Primary (Emerald Green) ===
  primary: {
    DEFAULT: '#006d43',
    light: '#00a86b',
    dark: '#005232',
    bg: 'rgba(0, 109, 67, 0.08)',
    container: '#b9ebca',
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // === Secondary (Blue) ===
  secondary: {
    DEFAULT: '#3b82f6',
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a',
  },

  // === Accent (Teal) ===
  accent: {
    DEFAULT: '#0d9488',
    bg: 'rgba(13, 148, 136, 0.08)',
    500: '#14b8a6',
    600: '#0d9488',
  },

  // === Surface / Background ===
  surface: {
    bg: '#f0f2f5',
    bgDark: '#e8eaef',
    card: '#ffffff',
    cardHover: 'rgba(0, 109, 67, 0.04)',
    border: 'rgba(188, 202, 190, 0.6)',
  },

  // === Text ===
  text: {
    primary: '#181c22',
    secondary: '#3d4a41',
    muted: '#6d7a70',
    inverse: '#ffffff',
    inverseMuted: 'rgba(255,255,255,0.7)',
  },

  // === Status ===
  status: {
    success: '#006d43',
    successBg: 'rgba(0, 109, 67, 0.08)',
    info: '#1d4ed8',
    infoBg: 'rgba(59, 130, 246, 0.08)',
    warning: '#d97706',
    warningBg: 'rgba(217, 119, 6, 0.08)',
    danger: '#dc2626',
    dangerBg: 'rgba(220, 38, 38, 0.08)',
  },

  // === Order/Listing Status ===
  orderStatus: {
    new: '#3b82f6',
    processing: '#f59e0b',
    shipped: '#a855f7',
    queued: '#6b7280',
    drafting: '#eab308',
    publishing: '#3b82f6',
    done: '#10b981',
    failed: '#ef4444',
  },

  // === Sidebar ===
  sidebar: {
    bg: '#006d43',
    activeBg: 'rgba(255, 255, 255, 0.2)',
    hoverBg: 'rgba(255, 255, 255, 0.1)',
    text: 'rgba(255, 255, 255, 0.8)',
    textActive: '#ffffff',
    border: 'rgba(255, 255, 255, 0.1)',
  },
} as const;

export const spacing = {
  sidebar: {
    width: '260px',
    collapsedWidth: '80px',
  },
  topbar: {
    height: '64px',
  },
  card: {
    padding: '20px',       // p-5
    paddingSmall: '16px',  // p-4
    gap: '24px',           // gap-6
  },
  page: {
    padding: '24px',       // p-6
    maxWidth: '1400px',
  },
} as const;

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
  card: '12px',    // rounded-xl — ברירת מחדל לכרטיסים
  button: '12px',  // rounded-xl — ברירת מחדל לכפתורים
  input: '8px',    // rounded-lg — ברירת מחדל לשדות קלט
  badge: '9999px', // rounded-full — ברירת מחדל לתגיות
} as const;

export const shadows = {
  card: '0 2px 12px rgba(0,0,0,0.06)',
  cardHover: '0 2px 8px rgba(0, 109, 67, 0.08)',
  sidebar: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // shadow-2xl
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
} as const;

export const fonts = {
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  headline: "'Manrope', sans-serif",
  size: {
    xs: '12px',
    sm: '13px',
    base: '15px',
    lg: '17px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '28px',
  },
} as const;

export const animation = {
  fast: '150ms ease',
  normal: '200ms ease-out',
  slow: '300ms ease-out',
} as const;

// === Tailwind class helpers ===
// שימוש: className={tw.card.base} במקום לכתוב inline classes
export const tw = {
  card: {
    base: 'bg-white rounded-xl border border-gray-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)]',
    hover: 'hover:bg-[rgba(0,109,67,0.04)] hover:border-[rgba(0,109,67,0.2)] hover:shadow-[0_2px_8px_rgba(0,109,67,0.08)] transition-all duration-150',
    padding: 'p-5',
  },
  button: {
    primary: 'bg-[#006d43] text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-[#005232] transition-colors',
    secondary: 'bg-white text-[#006d43] border border-[rgba(188,202,190,0.6)] rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-[rgba(0,109,67,0.04)] transition-colors',
    danger: 'bg-red-600 text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-red-700 transition-colors',
    ghost: 'text-[#6d7a70] hover:text-[#181c22] hover:bg-gray-100 rounded-xl px-4 py-2.5 text-sm transition-colors',
    icon: 'p-2 rounded-lg hover:bg-gray-100 transition-colors',
  },
  input: {
    base: 'w-full px-4 py-2.5 rounded-lg border border-[rgba(188,202,190,0.6)] text-sm text-[#181c22] placeholder:text-[#6d7a70] focus:border-[rgba(0,109,67,0.4)] focus:ring-[3px] focus:ring-[rgba(0,109,67,0.1)] outline-none transition-all',
  },
  badge: {
    success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(0,109,67,0.08)] text-[#006d43]',
    danger: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(220,38,38,0.08)] text-red-600',
    warning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(217,119,6,0.08)] text-amber-600',
    info: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(59,130,246,0.08)] text-blue-600',
    neutral: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600',
  },
  text: {
    primary: 'text-[#181c22]',
    secondary: 'text-[#3d4a41]',
    muted: 'text-[#6d7a70]',
    heading: 'font-bold text-[#181c22]',
    label: 'text-sm font-medium text-[#3d4a41]',
  },
  page: {
    container: 'max-w-[1400px] mx-auto p-6',
    title: 'text-2xl font-bold text-[#181c22] font-headline',
    subtitle: 'text-sm text-[#6d7a70]',
  },
  gradient: {
    primary: 'bg-gradient-to-br from-[#006d43] to-[#00a86b]',
    blueGreen: 'bg-gradient-to-br from-[#3b82f6] to-[#006d43]',
  },
  iconCircle: {
    primary: 'w-12 h-12 rounded-full flex items-center justify-center bg-[rgba(0,109,67,0.08)] text-[#006d43]',
    danger: 'w-12 h-12 rounded-full flex items-center justify-center bg-[rgba(220,38,38,0.08)] text-red-600',
    info: 'w-12 h-12 rounded-full flex items-center justify-center bg-[rgba(59,130,246,0.08)] text-blue-600',
    warning: 'w-12 h-12 rounded-full flex items-center justify-center bg-[rgba(217,119,6,0.08)] text-amber-600',
  },
} as const;
```

---

## שלב 2: יצירת קומפוננטות UI בסיסיות

כל קומפוננטה צריכה:
- להיות **פשוטה ו-reusable**
- להשתמש ב-tokens מ-`tokens.ts` (דרך ה-`tw` object או ישירות)
- לתמוך ב-`className` prop לאפשר override
- לתמוך ב-RTL (direction: rtl) באופן טבעי

### Button.tsx

```tsx
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
```

### Card.tsx

```tsx
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
```

### Badge.tsx

```tsx
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
```

### Input.tsx

```tsx
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
```

### Modal.tsx

```tsx
// apps/web/design/components/Modal.tsx
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative bg-white rounded-2xl shadow-2xl w-full animate-fade-in',
        sizeMap[size],
        className
      )}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-[#181c22]">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[#6d7a70]" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
```

### StatCard.tsx

```tsx
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
```

### EmptyState.tsx

```tsx
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
```

---

## שלב 3: יצירת cn.ts ו-index.ts

### cn.ts
```typescript
// apps/web/design/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### index.ts — barrel export
```typescript
// apps/web/design/index.ts

// Tokens
export * from './tokens';

// Utility
export { cn } from './cn';

// Components
export { Button } from './components/Button';
export { Card } from './components/Card';
export { Badge } from './components/Badge';
export { Input } from './components/Input';
export { Modal } from './components/Modal';
export { StatCard } from './components/StatCard';
export { EmptyState } from './components/EmptyState';

// Layout
export { Sidebar } from './layout/Sidebar';
export { TopBar } from './layout/TopBar';
export { DashboardLayout } from './layout/DashboardLayout';
```

---

## שלב 4: העברת קבצים קיימים

### 4.1 — העברת globals.css
```bash
# העתק (לא למחוק את המקורי עדיין)
cp apps/web/app/globals.css apps/web/design/globals.css
```
ב-`apps/web/app/globals.css` — להשאיר רק:
```css
@import '../design/globals.css';
```

### 4.2 — העברת tailwind.config.js
```bash
cp apps/web/tailwind.config.js apps/web/design/tailwind.config.js
```
ב-`apps/web/tailwind.config.js` — לשנות ל:
```javascript
module.exports = require('./design/tailwind.config.js');
```

### 4.3 — העברת קומפוננטות Layout
```bash
# להעביר ולמחוק מהמקור
mv apps/web/components/layout/Sidebar.tsx apps/web/design/layout/Sidebar.tsx
mv apps/web/components/layout/TopBar.tsx apps/web/design/layout/TopBar.tsx
mv apps/web/components/layout/DashboardLayout.tsx apps/web/design/layout/DashboardLayout.tsx
mv apps/web/components/layout/SearchModal.tsx apps/web/design/layout/SearchModal.tsx
mv apps/web/components/layout/NotificationPanel.tsx apps/web/design/layout/NotificationPanel.tsx
```

### 4.4 — העברת קומפוננטות UI
```bash
mv apps/web/components/ui/Alert.tsx apps/web/design/components/Alert.tsx
mv apps/web/components/ui/DataTable.tsx apps/web/design/components/DataTable.tsx
mv apps/web/components/ui/NotificationBanner.tsx apps/web/design/components/NotificationBanner.tsx
mv apps/web/components/ui/DisconnectedShopBanner.tsx apps/web/design/components/DisconnectedShopBanner.tsx
```

### 4.5 — יצירת re-exports מהמיקום הישן
כדי שהקוד הקיים ימשיך לעבוד **בלי לשנות את כל ה-imports בכל הדפים**, צור קבצי re-export:

```typescript
// apps/web/components/layout/Sidebar.tsx
export { Sidebar } from '@/design/layout/Sidebar';
```

```typescript
// apps/web/components/ui/Alert.tsx
export { Alert } from '@/design/components/Alert';
```

וכן הלאה לכל קובץ שהועבר.

### 4.6 — הוספת alias ל-tsconfig.json
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/design/*": ["./design/*"],
      "@/design": ["./design/index.ts"]
    }
  }
}
```

---

## שלב 5: ריפקטור הדרגתי של דפים קיימים

**חשוב: לא לשנות הכל בבת אחת!** לעבור דף אחד בכל פעם.

### דוגמה: ריפקטור של StatCard בדף dashboard

**לפני:**
```tsx
// apps/web/app/dashboard/owner/page.tsx — inline component
function StatCard({ badge, badgeColor, icon: Icon, iconBg, iconColor, label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl px-6 pt-5 pb-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100/80">
      <div className="flex items-center justify-between mb-5">
        <span className={cn('text-sm font-semibold', badgeColor)}>{badge}</span>
        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon className={cn('w-[22px] h-[22px]', iconColor)} strokeWidth={1.8} />
        </div>
      </div>
      <p className="text-sm text-gray-400 text-center mb-1.5">{label}</p>
      <p className="text-[28px] leading-tight font-black text-gray-800 text-center" dir="ltr">{value}</p>
    </div>
  );
}
```

**אחרי:**
```tsx
// apps/web/app/dashboard/owner/page.tsx
import { StatCard } from '@/design';

// שימוש בקומפוננטה:
<StatCard
  label="צפיות"
  value="1,234"
  badge="יומי"
  badgeVariant="success"
  icon={<Eye className="w-[22px] h-[22px]" strokeWidth={1.8} />}
  iconVariant="primary"
/>
```

### סדר עדיפויות לריפקטור:

1. **StatCard** — מופיע ב-4 דפי dashboard, קל למיגרציה
2. **DashboardCard** — כבר קומפוננטה, רק להחליף ב-Card מ-design
3. **Alert** — כבר קומפוננטה, רק להעביר
4. **כפתורים** — הרבה inline, לעבור דף-דף ולהחליף ב-`<Button>`
5. **Inputs** — באותו אופן
6. **Badges** — מפוזרים בכל הדפים

---

## שלב 6: README לתיקיית העיצוב

```markdown
# Profitly Design System

## שימוש מהיר

\`\`\`tsx
import { Button, Card, Badge, Input, Modal, StatCard, tw, colors } from '@/design';
\`\`\`

## קונבנציות

- כל קומפוננטה תומכת ב-`className` prop ל-override
- צבעים — תמיד מ-`tokens.ts`, אף פעם hardcoded
- RTL — כל הקומפוננטות תומכות, להשתמש ב-`me-`/`ms-` במקום `ml-`/`mr-`
- Tailwind classes מוכנות — `tw.card.base`, `tw.button.primary` וכו'
- Icons — lucide-react בלבד

## איך לשנות עיצוב

1. לפתוח צ'אט Claude Code חדש
2. לתת גישה רק ל-`apps/web/design/`
3. לשנות tokens / קומפוננטות / CSS
4. השינוי ישפיע אוטומטית על כל האתר

## איך להוסיף קומפוננטה

1. ליצור קובץ ב-`components/` או `layout/`
2. להשתמש ב-`cn()` ל-className merging
3. להשתמש ב-`tw` object לקלאסים חוזרים
4. להוסיף export ל-`index.ts`
```

---

## סיכום: סדר הביצוע

| # | משימה | זמן משוער |
|---|--------|----------|
| 1 | יצירת תיקיית `design/` עם `tokens.ts`, `cn.ts`, `index.ts` | 5 דק |
| 2 | יצירת 8 קומפוננטות UI (Button, Card, Badge, Input, Modal, StatCard, EmptyState, Skeleton) | 30 דק |
| 3 | העברת `globals.css` ו-`tailwind.config.js` עם re-import | 5 דק |
| 4 | העברת קומפוננטות layout (Sidebar, TopBar, DashboardLayout) | 15 דק |
| 5 | העברת קומפוננטות UI קיימות (Alert, DataTable, NotificationBanner) | 10 דק |
| 6 | יצירת re-exports מהמיקום הישן | 10 דק |
| 7 | הוספת alias ל-tsconfig.json | 2 דק |
| 8 | יצירת README | 5 דק |
| 9 | ריפקטור דף dashboard כ-proof of concept | 20 דק |
| **סה"כ** | | **~100 דק** |

---

## הערה חשובה

אחרי הריפקטור, כל עבודה על עיצוב תתבצע כך:

**צ'אט עיצוב:**
```
תיקייה: apps/web/design/
מה הוא עושה: משנה צבעים, קומפוננטות, fonts, spacing
מה הוא לא נוגע בו: לוגיקה, API calls, routing, state
```

**צ'אט פיצ'רים:**
```
תיקייה: כל הפרויקט
מה הוא עושה: בונה דפים חדשים, API endpoints, לוגיקה
מה הוא משתמש בו: import { Button, Card } from '@/design'
```
