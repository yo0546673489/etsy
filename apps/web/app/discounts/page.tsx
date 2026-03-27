'use client';

import { useState, useEffect, useCallback } from 'react';
import { useShop } from '@/lib/shop-context';
import { useToast } from '@/lib/toast-context';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { discountsApi, type DiscountRule, type DiscountTask, type RotationItem } from '@/lib/api';
import {
  Tag, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Clock, CheckCircle2, XCircle, Loader2, RefreshCw,
} from 'lucide-react';

function cn(...cls: (string | boolean | undefined | null)[]) {
  return cls.filter(Boolean).join(' ');
}

// ─── Status configs ──────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active:    { label: 'פעיל',    bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  paused:    { label: 'מושהה',   bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  draft:     { label: 'טיוטה',   bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  completed: { label: 'הסתיים',  bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
};

const taskStatusIcon: Record<string, string> = {
  pending:     '🕐',
  in_progress: '⚙️',
  completed:   '✅',
  failed:      '❌',
};

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.draft;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({ rule, onToggle, onEdit, onDelete }: {
  rule: DiscountRule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const scopeLabel = rule.scope === 'entire_shop' ? 'כל החנות'
    : rule.scope === 'specific_listings' ? `${rule.listing_ids?.length || 0} מוצרים נבחרים`
    : 'קטגוריה';

  const valueLabel = rule.discount_type === 'percentage'
    ? `${rule.discount_value}% הנחה`
    : `$${rule.discount_value} הנחה`;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="font-semibold text-gray-800 text-base">{rule.name}</h3>
            <StatusBadge status={rule.status} />
          </div>
          <p className="text-sm text-gray-600 mb-1">{valueLabel} • {scopeLabel}</p>
          {rule.is_scheduled && rule.start_date && (
            <p className="text-xs text-gray-400">
              תזמון: {new Date(rule.start_date).toLocaleDateString('he-IL')}
              {rule.end_date ? ` – ${new Date(rule.end_date).toLocaleDateString('he-IL')}` : ''}
            </p>
          )}
          {rule.etsy_sale_name && (
            <p className="text-xs text-gray-400 mt-0.5">שם ב-Etsy: {rule.etsy_sale_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggle}
            className={cn('transition-colors', rule.is_active ? 'text-[#006d43]' : 'text-gray-300')}
            title={rule.is_active ? 'כבה' : 'הפעל'}
          >
            {rule.is_active
              ? <ToggleRight className="w-8 h-8" />
              : <ToggleLeft className="w-8 h-8" />
            }
          </button>
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-[#006d43] transition-colors rounded-lg hover:bg-gray-50">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal form ───────────────────────────────────────────────────────────────

const DEFAULT_ROTATION: RotationItem[] = [0,1,2,3,4,5,6].map(d => ({ day_of_week: d, discount_value: 0 }));

function DiscountModal({ initial, onClose, onSave }: {
  initial?: DiscountRule;
  onClose: () => void;
  onSave: (data: Partial<DiscountRule>, activate: boolean) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initial?.name || '');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>(initial?.discount_type || 'percentage');
  const [discountValue, setDiscountValue] = useState(initial?.discount_value?.toString() || '');
  const [scope, setScope] = useState<'entire_shop' | 'specific_listings'>(
    (initial?.scope as any) || 'entire_shop'
  );
  const [isScheduled, setIsScheduled] = useState(initial?.is_scheduled || false);
  const [scheduleType, setScheduleType] = useState<'one_time' | 'rotating'>(
    (initial?.schedule_type as any) || 'one_time'
  );
  const [startDate, setStartDate] = useState(initial?.start_date ? initial.start_date.slice(0,10) : '');
  const [endDate, setEndDate] = useState(initial?.end_date ? initial.end_date.slice(0,10) : '');
  const [rotation, setRotation] = useState<RotationItem[]>(initial?.rotation_config || DEFAULT_ROTATION);
  const [targetCountry, setTargetCountry] = useState(initial?.target_country || 'everywhere');
  const [termsText, setTermsText] = useState(initial?.terms_text || '');
  const [etsySaleName, setEtsySaleName] = useState(initial?.etsy_sale_name || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'שם הכלל נדרש';
    if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) e.discountValue = 'ערך הנחה חייב להיות מספר חיובי';
    if (discountType === 'percentage' && Number(discountValue) > 100) e.discountValue = 'אחוז לא יכול לעלות על 100';
    if (etsySaleName && !/^[A-Za-z0-9]+$/.test(etsySaleName)) e.etsySaleName = 'אותיות ומספרים בלבד';
    if (isScheduled && scheduleType === 'one_time') {
      if (!startDate) e.startDate = 'תאריך התחלה נדרש';
      if (startDate && endDate) {
        const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
        if (diff > 30) e.endDate = 'מקסימום 30 יום (מגבלת Etsy)';
        if (diff < 0) e.endDate = 'תאריך סיום חייב להיות אחרי ההתחלה';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = (activate: boolean): Partial<DiscountRule> => ({
    name: name.trim(),
    discount_type: discountType,
    discount_value: Number(discountValue),
    scope,
    is_scheduled: isScheduled,
    schedule_type: isScheduled ? scheduleType : undefined,
    start_date: isScheduled && startDate ? startDate : undefined,
    end_date: isScheduled && endDate ? endDate : undefined,
    rotation_config: isScheduled && scheduleType === 'rotating'
      ? rotation.filter(r => r.discount_value > 0)
      : undefined,
    target_country: targetCountry,
    terms_text: termsText || undefined,
    etsy_sale_name: etsySaleName || undefined,
    status: activate ? 'active' : 'draft',
    is_active: activate,
  });

  const handleSubmit = async (activate: boolean) => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(buildPayload(activate), activate);
    } finally {
      setSaving(false);
    }
  };

  const previewPrice = discountType === 'percentage' && discountValue
    ? `מחיר מקורי: $100 → אחרי הנחה: $${(100 - Number(discountValue)).toFixed(0)}`
    : discountType === 'fixed_amount' && discountValue
      ? `מחיר מקורי: $100 → אחרי הנחה: $${(100 - Number(discountValue)).toFixed(0)}`
      : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{initial ? 'עריכת הנחה' : 'הנחה חדשה'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {/* שם הכלל */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם הכלל (פנימי)</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className={cn('w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43]', errors.name ? 'border-red-300' : 'border-gray-200')}
              placeholder="לדוגמה: הנחת קיץ 2026" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* שם מכירה ב-Etsy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם המכירה ב-Etsy</label>
            <input value={etsySaleName} onChange={e => setEtsySaleName(e.target.value.toUpperCase())}
              className={cn('w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43] font-mono', errors.etsySaleName ? 'border-red-300' : 'border-gray-200')}
              placeholder="SPRINGSALE2026" />
            {errors.etsySaleName
              ? <p className="text-xs text-red-500 mt-1">{errors.etsySaleName}</p>
              : <p className="text-xs text-gray-400 mt-1">אותיות ומספרים בלבד, ייחודי ב-Etsy</p>
            }
          </div>

          {/* סוג הנחה */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">סוג הנחה</label>
            <div className="flex gap-4">
              {(['percentage', 'fixed_amount'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={discountType === t} onChange={() => setDiscountType(t)} className="accent-[#006d43]" />
                  <span className="text-sm">{t === 'percentage' ? 'אחוזים (%)' : 'סכום קבוע ($)'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ערך הנחה */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ערך ההנחה {discountType === 'percentage' ? '(%)' : '($)'}
            </label>
            <input type="number" min="0" max={discountType === 'percentage' ? 100 : undefined}
              value={discountValue} onChange={e => setDiscountValue(e.target.value)}
              className={cn('w-32 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43]', errors.discountValue ? 'border-red-300' : 'border-gray-200')} />
            {errors.discountValue && <p className="text-xs text-red-500 mt-1">{errors.discountValue}</p>}
            {previewPrice && (
              <p className="text-xs text-[#006d43] mt-2 font-medium">{previewPrice}</p>
            )}
          </div>

          {/* איפה ההנחה תקפה */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">איפה ההנחה תקפה</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={targetCountry === 'everywhere'} onChange={() => setTargetCountry('everywhere')} className="accent-[#006d43]" />
                <span className="text-sm">בכל מקום (Everywhere)</span>
              </label>
            </div>
          </div>

          {/* היקף */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">היקף ההנחה</label>
            <div className="flex gap-4">
              {(['entire_shop', 'specific_listings'] as const).map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={scope === s} onChange={() => setScope(s)} className="accent-[#006d43]" />
                  <span className="text-sm">{s === 'entire_shop' ? 'כל החנות' : 'מוצרים ספציפיים'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* תנאים */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תנאים והגבלות (אופציונלי)
            </label>
            <textarea value={termsText} onChange={e => setTermsText(e.target.value)} rows={2} maxLength={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43] resize-none"
              placeholder="תנאי השימוש שיוצגו ב-Etsy..." />
            <p className="text-xs text-gray-400 text-left">{termsText.length}/500</p>
          </div>

          {/* תזמון */}
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isScheduled} onChange={e => setIsScheduled(e.target.checked)} className="accent-[#006d43]" />
                <span className="text-sm font-medium text-gray-700">תזמן את ההנחה</span>
              </label>
            </div>

            {isScheduled && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  {(['one_time', 'rotating'] as const).map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={scheduleType === t} onChange={() => setScheduleType(t)} className="accent-[#006d43]" />
                      <span className="text-sm">{t === 'one_time' ? 'חד פעמי' : 'רוטציה לפי ימים'}</span>
                    </label>
                  ))}
                </div>

                {scheduleType === 'one_time' && (
                  <div className="flex gap-4 flex-wrap">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">תאריך התחלה</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className={cn('px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43]', errors.startDate ? 'border-red-300' : 'border-gray-200')} />
                      {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">תאריך סיום</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className={cn('px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43]', errors.endDate ? 'border-red-300' : 'border-gray-200')} />
                      {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
                    </div>
                  </div>
                )}

                {scheduleType === 'one_time' && (
                  <p className="text-xs text-amber-600 font-medium">⚠️ Etsy מגביל מכירה ל-30 יום מקסימום</p>
                )}

                {scheduleType === 'rotating' && (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">יום</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">הנחה (%)</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">פעיל</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rotation.map((item, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2 text-gray-700">{DAY_NAMES[item.day_of_week]}</td>
                              <td className="px-3 py-2">
                                <input type="number" min="0" max="100" value={item.discount_value || ''}
                                  onChange={e => {
                                    const updated = [...rotation];
                                    updated[i] = { ...item, discount_value: Number(e.target.value) };
                                    setRotation(updated);
                                  }}
                                  disabled={item.discount_value === 0 && rotation[i].discount_value === 0}
                                  className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#006d43]" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="checkbox"
                                  checked={item.discount_value > 0}
                                  onChange={e => {
                                    const updated = [...rotation];
                                    updated[i] = { ...item, discount_value: e.target.checked ? 10 : 0 };
                                    setRotation(updated);
                                  }}
                                  className="accent-[#006d43]" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">תאריך התחלה (אופציונלי)</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43]" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">תאריך סיום (אופציונלי)</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ביטול
          </button>
          <div className="flex gap-3">
            <button onClick={() => handleSubmit(false)} disabled={saving}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline ml-1" /> : null}
              שמור כטיוטה
            </button>
            <button onClick={() => handleSubmit(true)} disabled={saving}
              className="px-4 py-2 text-sm bg-[#006d43] text-white rounded-lg hover:bg-[#005535] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline ml-1" /> : null}
              שמור והפעל
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',       label: 'כל הכללים' },
  { key: 'active',    label: 'פעילים' },
  { key: 'draft',     label: 'טיוטות' },
  { key: 'paused',    label: 'מושהים' },
  { key: 'history',   label: 'היסטוריית ביצועים' },
];

export default function DiscountsPage() {
  const { selectedShop } = useShop();
  const { showToast } = useToast();

  const [tab, setTab] = useState('all');
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [tasks, setTasks] = useState<DiscountTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | undefined>();

  const shopId = selectedShop?.id;

  const loadData = useCallback(async () => {
    if (!shopId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [rulesData, tasksData] = await Promise.all([
        discountsApi.getRules(shopId),
        discountsApi.getTasks(shopId),
      ]);
      setRules(rulesData);
      setTasks(tasksData);
    } catch {
      showToast('שגיאה בטעינת ההנחות', 'error');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRules = tab === 'all' || tab === 'history'
    ? rules
    : rules.filter(r => r.status === tab);

  const handleSave = async (data: Partial<DiscountRule>, _activate: boolean) => {
    if (!shopId) return;
    try {
      if (editingRule) {
        const updated = await discountsApi.updateRule(shopId, editingRule.id, data);
        setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
        showToast('הנחה עודכנה בהצלחה', 'success');
      } else {
        const created = await discountsApi.createRule(shopId, data);
        setRules(prev => [created, ...prev]);
        showToast('הנחה נוצרה בהצלחה', 'success');
      }
      setShowModal(false);
      setEditingRule(undefined);
    } catch {
      showToast('שגיאה בשמירת ההנחה', 'error');
      throw new Error('save failed');
    }
  };

  const handleToggle = async (rule: DiscountRule) => {
    if (!shopId) return;
    try {
      const updated = await discountsApi.toggleRule(shopId, rule.id);
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch {
      showToast('שגיאה בשינוי הסטטוס', 'error');
    }
  };

  const handleDelete = async (rule: DiscountRule) => {
    if (!shopId || !confirm(`למחוק את "${rule.name}"?`)) return;
    try {
      await discountsApi.deleteRule(shopId, rule.id);
      setRules(prev => prev.filter(r => r.id !== rule.id));
      showToast('הנחה נמחקה', 'success');
    } catch {
      showToast('שגיאה במחיקה', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1200px] mx-auto space-y-6" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Tag className="w-6 h-6 text-[#006d43]" />
              ניהול הנחות
            </h1>
            <p className="text-gray-500 text-sm mt-1">נהל הנחות על מוצרים ועל החנות שלך</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadData} className="p-2 text-gray-400 hover:text-[#006d43] transition-colors rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setEditingRule(undefined); setShowModal(true); }}
              disabled={!shopId}
              className="flex items-center gap-2 px-4 py-2 bg-[#006d43] text-white rounded-lg font-medium hover:bg-[#005535] transition-colors disabled:opacity-50 text-sm"
            >
              <Plus className="w-4 h-4" />
              הנחה חדשה
            </button>
          </div>
        </div>

        {!shopId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
            בחר חנות כדי לנהל הנחות
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.key
                  ? 'bg-[#006d43] text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {t.label}
              {t.key !== 'history' && t.key !== 'all' && (
                <span className="mr-1.5 text-xs opacity-70">
                  ({rules.filter(r => r.status === t.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-[#006d43] animate-spin" />
          </div>
        ) : tab === 'history' ? (
          /* Tasks table */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">היסטוריית ביצועים</h3>
            </div>
            {tasks.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p>אין משימות בתור</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">תאריך ביצוע</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">פעולה</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">היקף</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">פרטים</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">
                          {new Date(task.scheduled_for).toLocaleDateString('he-IL')}{' '}
                          {new Date(task.scheduled_for).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {task.action === 'apply_discount'
                            ? `החל ${task.discount_value || ''}%`
                            : 'הסר הנחה'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {task.scope === 'entire_shop' ? 'כל החנות' : `${task.listing_ids?.length || 0} מוצרים`}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-base">{taskStatusIcon[task.status]}</span>{' '}
                          <span className="text-gray-600">
                            {task.status === 'pending' ? 'ממתין'
                              : task.status === 'in_progress' ? 'בתהליך'
                              : task.status === 'completed' ? 'בוצע'
                              : 'נכשל'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-red-500 text-xs">
                          {task.error_message || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Rules list */
          <div className="space-y-3">
            {filteredRules.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">אין כללי הנחה</h3>
                <p className="text-gray-400 text-sm mb-4">לחץ "הנחה חדשה" כדי ליצור כלל</p>
                <button
                  onClick={() => { setEditingRule(undefined); setShowModal(true); }}
                  disabled={!shopId}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#006d43] text-white rounded-lg font-medium hover:bg-[#005535] transition-colors disabled:opacity-50 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  הנחה חדשה
                </button>
              </div>
            ) : (
              filteredRules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={() => handleToggle(rule)}
                  onEdit={() => { setEditingRule(rule); setShowModal(true); }}
                  onDelete={() => handleDelete(rule)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {showModal && (
        <DiscountModal
          initial={editingRule}
          onClose={() => { setShowModal(false); setEditingRule(undefined); }}
          onSave={handleSave}
        />
      )}
    </DashboardLayout>
  );
}
