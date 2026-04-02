'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cpApi, type Customer, type FeatureType } from '@/lib/cp-api';
import { CheckCircle, XCircle } from 'lucide-react';

const FEATURES: FeatureType[] = ['messaging', 'discounts', 'automations'];
const FEATURE_LABELS: Record<FeatureType, string> = {
  messaging: 'הודעות',
  discounts: 'הנחות',
  automations: 'אוטומציות',
};

export default function CPPermissions() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [email, setEmail] = useState('');
  const [feature, setFeature] = useState<FeatureType>('messaging');
  const [grantMsg, setGrantMsg] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const router = useRouter();

  const load = () => cpApi.getCustomers().then(setCustomers).catch(() => router.push('/control-panel'));
  useEffect(() => { load(); }, []);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cpApi.grantByEmail(email, feature);
      setGrantMsg(`✅ הגישה ל${FEATURE_LABELS[feature]} ניתנה ל-${email}`);
      setEmail('');
      load();
    } catch (e: any) { setGrantMsg(`❌ ${e.message}`); }
  };

  const toggle = async (tenantId: number, feat: FeatureType, current: string) => {
    const key = `${tenantId}-${feat}`;
    setToggling(key);
    try {
      if (current === 'approved') await cpApi.revokeFeature(tenantId, feat);
      else await cpApi.approveFeature(tenantId, feat);
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setToggling(null); }
  };

  const getAccess = (c: Customer, f: FeatureType) =>
    f === 'messaging' ? c.messaging_access : f === 'discounts' ? c.discounts_access : c.automations_access;

  return (
    <div className="p-8" style={{ direction: 'rtl' }}>
      <h1 className="text-2xl font-bold text-white mb-2">ניהול הרשאות</h1>
      <p className="text-sm mb-8" style={{ color: '#6b7280' }}>מתן ושלילת גישה לתכונות עבור לקוחות</p>

      <div className="rounded-xl p-6 mb-8" style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.2)' }}>
        <h2 className="text-white font-semibold mb-4">מתן גישה מהיר</h2>
        <form onSubmit={handleGrant} className="flex gap-3">
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="אימייל לקוח"
            className="flex-1 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none text-right"
            style={{ background: '#0a0f0d', border: '1px solid rgba(0,109,67,0.3)' }}
          />
          <select value={feature} onChange={e => setFeature(e.target.value as FeatureType)}
            className="rounded-lg px-4 py-2.5 text-white focus:outline-none"
            style={{ background: '#0a0f0d', border: '1px solid rgba(0,109,67,0.3)' }}>
            {FEATURES.map(f => <option key={f} value={f}>{FEATURE_LABELS[f]}</option>)}
          </select>
          <button type="submit" disabled={!email}
            className="text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 whitespace-nowrap"
            style={{ background: '#006d43' }}>
            מתן גישה
          </button>
        </form>
        {grantMsg && <p className="mt-3 text-sm" style={{ color: '#d1d5db' }}>{grantMsg}</p>}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.2)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,109,67,0.2)' }}>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>חשבון</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>אימייל</th>
              {FEATURES.map(f => (
                <th key={f} className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>
                  {FEATURE_LABELS[f]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.tenant_id} style={{ borderBottom: '1px solid rgba(0,109,67,0.1)' }}>
                <td className="px-4 py-3 text-white text-sm font-medium">{c.org_name}</td>
                <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>{c.email}</td>
                {FEATURES.map(f => {
                  const status = getAccess(c, f);
                  const approved = status === 'approved';
                  const key = `${c.tenant_id}-${f}`;
                  return (
                    <td key={f} className="px-4 py-3 text-center">
                      <button onClick={() => toggle(c.tenant_id, f, status)}
                        disabled={toggling === key}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                        style={{
                          background: approved ? 'rgba(0,109,67,0.15)' : 'rgba(255,255,255,0.05)',
                          color: approved ? '#006d43' : '#6b7280',
                        }}>
                        {approved
                          ? <CheckCircle className="w-3 h-3" />
                          : <XCircle className="w-3 h-3" />}
                        {toggling === key ? '...' : approved ? 'שלול' : 'אשר'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
