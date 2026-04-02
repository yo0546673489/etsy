'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cpApi, type Customer } from '@/lib/cp-api';
import { Search, Trash2, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

const AccessBadge = ({ status }: { status: string }) =>
  status === 'approved'
    ? <CheckCircle className="w-4 h-4 text-green-400" />
    : <XCircle className="w-4 h-4 text-gray-600" />;

export default function CPCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    cpApi.getCustomers()
      .then(setCustomers)
      .catch(() => router.push('/control-panel'));
  }, [router]);

  const filtered = customers.filter(c =>
    c.org_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget || confirmEmail !== deleteTarget.email) return;
    setDeleting(true);
    try {
      await cpApi.deleteCustomer(deleteTarget.tenant_id);
      setCustomers(p => p.filter(c => c.tenant_id !== deleteTarget.tenant_id));
      setDeleteTarget(null);
      setConfirmEmail('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <span className="text-gray-500 text-sm">{customers.length} total</span>
      </div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Org</th>
              <th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Email</th>
              <th className="text-center px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Shops</th>
              <th className="text-center px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Msg</th>
              <th className="text-center px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Disc</th>
              <th className="text-center px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Auto</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.tenant_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <p className="text-white font-medium text-sm">{c.org_name}</p>
                  <p className="text-gray-500 text-xs">{c.status}</p>
                </td>
                <td className="px-4 py-3 text-gray-300 text-sm">{c.email}</td>
                <td className="px-4 py-3 text-center text-white text-sm">{c.shop_count}</td>
                <td className="px-4 py-3 text-center"><AccessBadge status={c.messaging_access} /></td>
                <td className="px-4 py-3 text-center"><AccessBadge status={c.discounts_access} /></td>
                <td className="px-4 py-3 text-center"><AccessBadge status={c.automations_access} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => router.push(`/control-panel/customers/${c.tenant_id}`)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setDeleteTarget(c); setConfirmEmail(''); }}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-2">Delete {deleteTarget.org_name}?</h2>
            <p className="text-gray-400 text-sm mb-4">This will permanently delete ALL data. Type the email to confirm:</p>
            <input value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)}
              placeholder={deleteTarget.email}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleDelete}
                disabled={confirmEmail !== deleteTarget.email || deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
