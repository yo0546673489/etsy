'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { cpApi, type CustomerDetails, type FeatureType } from '@/lib/cp-api';
import { ArrowRight, CheckCircle, XCircle, MessageSquare, Tag, Zap, AlertTriangle } from 'lucide-react';

const FEATURES: { key: FeatureType; label: string; icon: React.ElementType }[] = [
  { key: 'messaging', label: 'הודעות', icon: MessageSquare },
  { key: 'discounts', label: 'הנחות', icon: Tag },
  { key: 'automations', label: 'אוטומציות', icon: Zap },
];

function timeAgo(iso: string | null) {
  if (!iso) return 'אף פעם';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'עכשיו';
  if (h < 24) return `לפני ${h} שעות`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

export default function CPCustomerDetails() {
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const tenantId = Number(params.id);

  const load = () => cpApi.getCustomerDetails(tenantId).then(setCustomer).catch(() => router.push('/control-panel'));
  useEffect(() => { load(); }, [tenantId]);

  const toggleFeature = async (feature: FeatureType, current: string) => {
    setToggling(feature);
    try {
      if (current === 'approved') await cpApi.revokeFeature(tenantId, feature);
      else await cpApi.approveFeature(tenantId, feature);
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setToggling(null); }
  };

  const handleDelete = async () => {
    if (!customer || confirmEmail !== customer.members.find(m => m.role === 'owner')?.email) return;
    setDeleting(true);
    try {
      await cpApi.deleteCustomer(tenantId);
      router.push('/control-panel/customers');
    } catch (e: any) { alert(e.message); setDeleting(false); }
  };

  if (!customer) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#006d43' }} />
    </div>
  );

  const ownerEmail = customer.members.find(m => m.role === 'owner')?.email || '';
  const accessMap: Record<string, string> = {
    messaging: customer.messaging_access,
    discounts: customer.discounts_access,
    automations: customer.automations_access,
  };

  const roleLabel: Record<string, string> = { owner: 'בעלים', admin: 'מנהל', creator: 'יוצר', viewer: 'צופה' };

  return (
    <div className="p-8 max-w-4xl" style={{ direction: 'rtl' }}>
      <button onClick={() => router.push('/control-panel/customers')}
        className="flex items-center gap-2 mb-6 text-sm transition-colors"
        style={{ color: '#9ca3af' }}>
        <ArrowRight className="w-4 h-4" /> חזרה ללקוחות
      </button>

      <div className="rounded-xl p-6 mb-6" style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.2)' }}>
        <h1 className="text-2xl font-bold text-white">{customer.org_name}</h1>
        <div className="flex gap-6 mt-2 text-sm flex-wrap" style={{ color: '#9ca3af' }}>
          <span>{ownerEmail}</span>
          <span>{customer.status === 'active' ? 'פעיל' : customer.status}</span>
          <span>הצטרף {new Date(customer.created_at).toLocaleDateString('he-IL')}</span>
        </div>
      </div>

      <h2 className="text-white font-semibold text-lg mb-3">גישה לתכונות</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {FEATURES.map(f => {
          const status = accessMap[f.key];
          const approved = status === 'approved';
          return (
            <div key={f.key} className="rounded-xl p-5" style={{ background: '#121a16', border: `1px solid ${approved ? 'rgba(0,109,67,0.4)' : 'rgba(0,109,67,0.15)'}` }}>
              <div className="flex items-center gap-2 mb-3">
                <f.icon className="w-5 h-5" style={{ color: approved ? '#006d43' : '#6b7280' }} />
                <span className="text-white font-medium">{f.label}</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {approved
                  ? <CheckCircle className="w-4 h-4" style={{ color: '#006d43' }} />
                  : <XCircle className="w-4 h-4 text-gray-500" />}
                <span className="text-sm" style={{ color: approved ? '#006d43' : '#6b7280' }}>
                  {approved ? 'מאושר' : 'אין גישה'}
                </span>
              </div>
              <button onClick={() => toggleFeature(f.key, status)}
                disabled={toggling === f.key}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  background: approved ? 'rgba(220,38,38,0.15)' : 'rgba(0,109,67,0.15)',
                  color: approved ? '#f87171' : '#006d43',
                }}>
                {toggling === f.key ? '...' : approved ? 'שלילת גישה' : 'מתן גישה'}
              </button>
            </div>
          );
        })}
      </div>

      <h2 className="text-white font-semibold text-lg mb-3">חברי צוות ({customer.members.length})</h2>
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.2)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,109,67,0.2)' }}>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>אימייל</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>שם</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>תפקיד</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>כניסה אחרונה</th>
            </tr>
          </thead>
          <tbody>
            {customer.members.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid rgba(0,109,67,0.1)' }}>
                <td className="px-4 py-3 text-sm" style={{ color: '#d1d5db' }}>{m.email}</td>
                <td className="px-4 py-3 text-sm" style={{ color: '#d1d5db' }}>{m.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(0,109,67,0.15)', color: '#006d43' }}>
                    {roleLabel[m.role] || m.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: '#6b7280' }}>{timeAgo(m.last_login_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-white font-semibold text-lg mb-3">חנויות מחוברות ({customer.shops.length})</h2>
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.2)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,109,67,0.2)' }}>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>חנות</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>סטטוס</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>מוצרים</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>הזמנות</th>
            </tr>
          </thead>
          <tbody>
            {customer.shops.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,109,67,0.1)' }}>
                <td className="px-4 py-3 text-white text-sm font-medium">{s.display_name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs" style={{
                    background: s.status === 'connected' ? 'rgba(0,109,67,0.15)' : 'rgba(255,255,255,0.05)',
                    color: s.status === 'connected' ? '#006d43' : '#6b7280',
                  }}>
                    {s.status === 'connected' ? 'מחובר' : s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm" style={{ color: '#d1d5db' }}>{s.product_count}</td>
                <td className="px-4 py-3 text-center text-sm" style={{ color: '#d1d5db' }}>{s.order_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl p-6" style={{ background: '#121a16', border: '1px solid rgba(220,38,38,0.3)' }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h2 className="text-red-400 font-semibold">אזור מסוכן</h2>
        </div>
        <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>מחיקה לצמיתות של כל הנתונים. הלקוח יצטרך להירשם מחדש.</p>
        <p className="text-sm mb-2" style={{ color: '#9ca3af' }}>הקלד <span className="text-white font-mono">{ownerEmail}</span> לאישור:</p>
        <div className="flex gap-3">
          <input value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)}
            placeholder={ownerEmail}
            className="flex-1 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none text-right"
            style={{ background: '#0a0f0d', border: '1px solid rgba(220,38,38,0.4)' }}
          />
          <button onClick={handleDelete}
            disabled={confirmEmail !== ownerEmail || deleting}
            className="text-white px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-40"
            style={{ background: '#dc2626' }}>
            {deleting ? 'מוחק...' : 'מחיקת לקוח'}
          </button>
        </div>
      </div>
    </div>
  );
}
