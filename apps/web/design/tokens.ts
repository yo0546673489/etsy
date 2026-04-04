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
