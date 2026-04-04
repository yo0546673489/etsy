'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export type DateRangeKey =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'this_month'
  | 'this_year'
  | 'last_year'
  | 'all_time';

export interface DateRange {
  key: DateRangeKey;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

const PRESET_KEYS: { key: DateRangeKey; tKey: string }[] = [
  { key: 'today',      tKey: 'dateRange.today' },
  { key: 'yesterday',  tKey: 'dateRange.yesterday' },
  { key: 'last7',      tKey: 'dateRange.last7' },
  { key: 'last30',     tKey: 'dateRange.last30' },
  { key: 'this_month', tKey: 'dateRange.thisMonth' },
  { key: 'this_year',  tKey: 'dateRange.thisYear' },
  { key: 'last_year',  tKey: 'dateRange.lastYear' },
  { key: 'all_time',   tKey: 'dateRange.allTime' },
];

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeRange(key: DateRangeKey): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let start: Date;
  let end: Date = new Date(today);

  switch (key) {
    case 'today':
      start = new Date(today);
      break;
    case 'yesterday':
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      end = new Date(start);
      break;
    case 'last7':
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      break;
    case 'last30':
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    case 'this_month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'this_year':
      start = new Date(today.getFullYear(), 0, 1);
      break;
    case 'last_year':
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = new Date(today.getFullYear() - 1, 11, 31);
      break;
    case 'all_time':
      start = new Date(2010, 0, 1); // far past
      break;
    default:
      start = new Date(today);
      start.setDate(start.getDate() - 29);
  }

  return { key, startDate: toISO(start), endDate: toISO(end) };
}

// getLabelForKey is now replaced by inline t() call in the component

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(key: DateRangeKey) {
    onChange(computeRange(key));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:border-gray-300 transition-colors min-w-[160px]"
      >
        <div className="text-right flex-1">
          <p className="text-xs text-gray-400 mb-0.5">{t('dateRange.label')}</p>
          <p className="text-sm font-bold text-gray-700">{t(PRESET_KEYS.find(p => p.key === value.key)?.tKey ?? 'dateRange.last30')}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50">
          {PRESET_KEYS.map(preset => (
            <button
              key={preset.key}
              onClick={() => select(preset.key)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-right hover:bg-gray-50 transition-colors"
            >
              <span className={value.key === preset.key ? 'font-bold text-[#006d43]' : 'text-gray-700'}>
                {t(preset.tKey)}
              </span>
              {value.key === preset.key && (
                <Check className="w-4 h-4 text-[#006d43] flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
