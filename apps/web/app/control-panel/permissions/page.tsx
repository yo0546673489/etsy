'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cpApi, type Customer, type FeatureType } from '@/lib/cp-api';
import { CheckCircle, XCircle } from 'lucide-react';

const FEATURES: FeatureType[] = ['messaging', 'discounts', 'automations'];
const FEATURE_LABELS: Record<FeatureType, string> = { messaging: '📨 Messages', discounts: '🏷️ Discounts', automations: '⚡ Automations' };

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
      setGrantMsg(`✅ Granted ${feature} to ${email}`);
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
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Permissions Management</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-white font-semibold mb-4">Quick Grant</h2>
        <form onSubmit={handleGrant} className="flex gap-3">
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Customer email"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <select value={feature} onChange={e => setFeature(e.target.value as FeatureType)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none">
            {FEATURES.map(f => <option key={f} value={f}>{FEATURE_LABELS[f]}</option>)}
          </select>
          <button type="submit" disabled={!email}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium">
            Grant Access
          </button>
        </form>
        {grantMsg && <p className="mt-3 text-sm text-gray-300">{grantMsg}</p>}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Tenant</th>
              <th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Email</th>
              {FEATURES.map(f => <th key={f} className="text-center px-4 py-3 text-gray-400 text-xs font-semibold uppercase">{FEATURE_LABELS[f]}</th>)}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.tenant_id} className="border-b border-gray-800/50">
                <td className="px-4 py-3 text-white text-sm font-medium">{c.org_name}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{c.email}</td>
                {FEATURES.map(f => {
                  const status = getAccess(c, f);
                  const approved = status === 'approved';
                  const key = `${c.tenant_id}-${f}`;
                  return (
                    <td key={f} className="px-4 py-3 text-center">
                      <button onClick={() => toggle(c.tenant_id, f, status)}
                        disabled={toggling === key}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                          approved ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-gray-700 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                        }`}>
                        {approved ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {toggling === key ? '...' : approved ? 'Revoke' : 'Grant'}
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
