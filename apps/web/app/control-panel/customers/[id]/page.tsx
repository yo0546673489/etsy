'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { cpApi, type CustomerDetails, type FeatureType } from '@/lib/cp-api';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Tag, Zap, AlertTriangle } from 'lucide-react';

const FEATURES: { key: FeatureType; label: string; icon: React.ElementType }[] = [
  { key: 'messaging', label: 'Messages', icon: MessageSquare },
  { key: 'discounts', label: 'Discounts', icon: Tag },
  { key: 'automations', label: 'Automations', icon: Zap },
];

function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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
      if (current === 'approved') {
        await cpApi.revokeFeature(tenantId, feature);
      } else {
        await cpApi.approveFeature(tenantId, feature);
      }
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

  if (!customer) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;

  const ownerEmail = customer.members.find(m => m.role === 'owner')?.email || '';
  const accessMap: Record<string, string> = {
    messaging: customer.messaging_access,
    discounts: customer.discounts_access,
    automations: customer.automations_access,
  };

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={() => router.push('/control-panel/customers')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h1 className="text-2xl font-bold text-white">{customer.org_name}</h1>
        <div className="flex gap-6 mt-2 text-sm text-gray-400">
          <span>{ownerEmail}</span>
          <span className="capitalize">{customer.status}</span>
          <span>Joined {new Date(customer.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <h2 className="text-white font-semibold text-lg mb-3">Feature Access</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {FEATURES.map(f => {
          const status = accessMap[f.key];
          const approved = status === 'approved';
          return (
            <div key={f.key} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <f.icon className={`w-5 h-5 ${approved ? 'text-green-400' : 'text-gray-500'}`} />
                <span className="text-white font-medium">{f.label}</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {approved ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-gray-500" />}
                <span className={`text-sm ${approved ? 'text-green-400' : 'text-gray-500'}`}>{approved ? 'Approved' : 'No access'}</span>
              </div>
              <button onClick={() => toggleFeature(f.key, status)}
                disabled={toggling === f.key}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  approved ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}>
                {toggling === f.key ? '...' : approved ? 'Revoke' : 'Grant'}
              </button>
            </div>
          );
        })}
      </div>

      <h2 className="text-white font-semibold text-lg mb-3">Members ({customer.members.length})</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead><tr className="border-b border-gray-800"><th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Email</th><th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Name</th><th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Role</th><th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Last Login</th></tr></thead>
          <tbody>
            {customer.members.map(m => (
              <tr key={m.id} className="border-b border-gray-800/50">
                <td className="px-4 py-3 text-gray-300 text-sm">{m.email}</td>
                <td className="px-4 py-3 text-gray-300 text-sm">{m.name || '—'}</td>
                <td className="px-4 py-3"><span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">{m.role}</span></td>
                <td className="px-4 py-3 text-gray-500 text-sm">{timeAgo(m.last_login_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-white font-semibold text-lg mb-3">Connected Shops ({customer.shops.length})</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead><tr className="border-b border-gray-800"><th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Shop</th><th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Status</th><th className="text-center px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Products</th><th className="text-center px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Orders</th></tr></thead>
          <tbody>
            {customer.shops.map(s => (
              <tr key={s.id} className="border-b border-gray-800/50">
                <td className="px-4 py-3 text-white text-sm font-medium">{s.display_name}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${s.status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>{s.status}</span></td>
                <td className="px-4 py-3 text-center text-gray-300 text-sm">{s.product_count}</td>
                <td className="px-4 py-3 text-center text-gray-300 text-sm">{s.order_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h2 className="text-red-400 font-semibold">Danger Zone</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">Permanently deletes ALL data. Customer must register from scratch.</p>
        <p className="text-gray-400 text-sm mb-2">Type <span className="text-white font-mono">{ownerEmail}</span> to confirm:</p>
        <div className="flex gap-3">
          <input value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)}
            placeholder={ownerEmail}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
          />
          <button onClick={handleDelete}
            disabled={confirmEmail !== ownerEmail || deleting}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap">
            {deleting ? 'Deleting...' : 'Delete Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
