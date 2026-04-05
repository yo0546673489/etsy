'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/language-context';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import {
  Activity,
  Store,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  MessageSquare,
  Inbox,
  Zap,
  WifiOff,
  ArrowRight,
} from 'lucide-react';

const STATUS_API = 'https://profix-ai.com/messages-api/api/status';
const REFRESH_INTERVAL = 30000; // 30 seconds

interface StoreInfo {
  id: number;
  store_name: string;
  store_email: string;
  store_number: number;
}

interface Conversation {
  id: number;
  customer_name: string;
  status: string;
  last_message_text: string;
  last_message_at: string;
  updated_at: string;
  store_name: string;
  store_number: number;
}

interface StatusData {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
  stores: {
    total: number;
    active: number;
    needs_reauth: number;
    needs_reauth_list: StoreInfo[];
  };
  conversations: {
    total: number;
    updated_24h: number;
    new_count: number;
    recent: Conversation[];
  };
  messages: {
    synced_24h: number;
  };
  queues: {
    sync: { waiting: number; active: number; failed: number; completed: number };
    reply: { waiting: number; active: number; failed: number };
  };
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds} שניות`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} דקות`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} שעות`;
  return `${Math.floor(seconds / 86400)} ימים`;
}

function timeAgo(isoString: string): string {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'כרגע';
  if (mins < 60) return `לפני ${mins} דק'`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `לפני ${hrs} שע'`;
  return `לפני ${Math.floor(hrs / 24)} ימים`;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    new: 'חדש',
    open: 'פתוח',
    closed: 'סגור',
    pending: 'ממתין',
  };
  return map[s] || s;
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    new: 'bg-green-100 text-green-700',
    open: 'bg-blue-100 text-blue-700',
    closed: 'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  return map[s] || 'bg-gray-100 text-gray-500';
}

export default function AutomationDashboard() {
  const { isRTL } = useLanguage();
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch(STATUS_API, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e?.message || 'שגיאת חיבור');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const isOnline = !error && data?.status === 'ok';

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-[1100px] mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-800">לוח בקרה — אוטומציה</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              מצב מערכת האוטומציה בזמן אמת
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-400">
                עודכן {timeAgo(lastRefresh.toISOString())}
              </span>
            )}
            <button
              onClick={() => fetchStatus(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#006d43] text-white text-sm font-medium hover:bg-[#005a37] transition-colors disabled:opacity-60"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              רענן
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-[#006d43] animate-spin" />
          </div>
        )}

        {/* Error / offline */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
            <WifiOff className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-base">האוטומציה אינה מגיבה</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <p className="text-red-500 text-xs mt-2">בדוק שה-PM2 פועל ושהשרת מחובר לרשת</p>
            </div>
          </div>
        )}

        {/* Main content */}
        {!loading && data && (
          <>
            {/* Status bar */}
            <div className={cn(
              'rounded-2xl p-5 flex items-center gap-4',
              isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            )}>
              {isOnline
                ? <CheckCircle2 className="w-7 h-7 text-green-500 flex-shrink-0" />
                : <XCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
              }
              <div className="flex-1">
                <p className={cn('font-bold text-base', isOnline ? 'text-green-700' : 'text-red-700')}>
                  {isOnline ? '✅ האוטומציה פעילה ותקינה' : '❌ האוטומציה לא מגיבה'}
                </p>
                {isOnline && (
                  <p className="text-sm text-green-600 mt-0.5">
                    זמן פעולה רצוף: {formatUptime(data.uptime)}
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(data.timestamp).toLocaleTimeString('he-IL')}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={Store}
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
                label="חנויות פעילות"
                value={`${data.stores.active} / ${data.stores.total}`}
                sub={data.stores.needs_reauth > 0 ? `${data.stores.needs_reauth} דורשות כניסה מחדש` : 'הכל תקין'}
                subColor={data.stores.needs_reauth > 0 ? 'text-orange-500' : 'text-green-500'}
              />
              <KpiCard
                icon={MessageSquare}
                iconBg="bg-purple-50"
                iconColor="text-purple-500"
                label="שיחות סה״כ"
                value={data.conversations.total}
                sub={`${data.conversations.updated_24h} פעילות ב-24 שע'`}
                subColor="text-gray-400"
              />
              <KpiCard
                icon={Inbox}
                iconBg="bg-green-50"
                iconColor="text-green-500"
                label="הודעות סונכרנו"
                value={data.messages.synced_24h}
                sub="ב-24 שעות האחרונות"
                subColor="text-gray-400"
              />
              <KpiCard
                icon={Zap}
                iconBg="bg-yellow-50"
                iconColor="text-yellow-500"
                label="תורי עבודה"
                value={data.queues.sync.active + data.queues.reply.active}
                sub={
                  data.queues.sync.failed + data.queues.reply.failed > 0
                    ? `${data.queues.sync.failed + data.queues.reply.failed} נכשלו`
                    : 'אין כשלונות'
                }
                subColor={
                  data.queues.sync.failed + data.queues.reply.failed > 0 ? 'text-red-500' : 'text-green-500'
                }
              />
            </div>

            {/* Queues detail */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-[#006d43]" />
                  <h2 className="font-bold text-gray-700">תור סנכרון שיחות</h2>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <QueueStat label="ממתין" value={data.queues.sync.waiting} color="text-yellow-600" />
                  <QueueStat label="פעיל" value={data.queues.sync.active} color="text-blue-600" />
                  <QueueStat label="הושלם" value={data.queues.sync.completed} color="text-green-600" />
                  <QueueStat label="נכשל" value={data.queues.sync.failed} color="text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRight className="w-5 h-5 text-[#006d43]" />
                  <h2 className="font-bold text-gray-700">תור שליחת תגובות</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <QueueStat label="ממתין" value={data.queues.reply.waiting} color="text-yellow-600" />
                  <QueueStat label="פעיל" value={data.queues.reply.active} color="text-blue-600" />
                  <QueueStat label="נכשל" value={data.queues.reply.failed} color="text-red-500" />
                </div>
              </div>
            </div>

            {/* Stores needing re-auth */}
            {data.stores.needs_reauth > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h2 className="font-bold text-orange-700">
                    חנויות שדורשות כניסה מחדש ל-Etsy ({data.stores.needs_reauth})
                  </h2>
                </div>
                <div className="space-y-2">
                  {data.stores.needs_reauth_list.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-orange-100">
                      <div>
                        <span className="font-medium text-gray-800">חנות {s.store_number}</span>
                        {s.store_name && (
                          <span className="text-gray-500 text-sm mr-2">— {s.store_name}</span>
                        )}
                      </div>
                      <span className="text-sm text-orange-600 font-medium">נדרשת התחברות</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-orange-500 mt-3">
                  פתח את AdsPower עבור הפרופיל של כל חנות, היכנס ל-Etsy, וחדש את הסנכרון
                </p>
              </div>
            )}

            {/* Recent conversations */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[#006d43]" />
                <h2 className="font-bold text-gray-700">פעילות אחרונה — שיחות</h2>
                <span className="mr-auto text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                  {data.conversations.new_count} חדשות
                </span>
              </div>
              {data.conversations.recent.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">אין שיחות עדיין</p>
              ) : (
                <div className="space-y-2">
                  {data.conversations.recent.map(conv => (
                    <div key={conv.id} className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#006d43]/10 flex items-center justify-center text-[#006d43] font-bold text-xs">
                        {conv.store_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800 text-sm">{conv.customer_name || 'לקוח'}</span>
                          {conv.store_name && (
                            <span className="text-xs text-gray-400">· {conv.store_name}</span>
                          )}
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium mr-auto', statusBadge(conv.status))}>
                            {statusLabel(conv.status)}
                          </span>
                        </div>
                        {conv.last_message_text && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[420px]">
                            {conv.last_message_text}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-gray-400 mt-0.5 whitespace-nowrap">
                        {timeAgo(conv.updated_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  subColor,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-800" dir="ltr">{value}</p>
      {sub && <p className={cn('text-xs mt-1', subColor)}>{sub}</p>}
    </div>
  );
}

function QueueStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={cn('text-xl font-black', color)}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
