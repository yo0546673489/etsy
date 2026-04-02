'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cpApi, type Customer } from '@/lib/cp-api';
import { Search, Trash2, ChevronLeft, CheckCircle, XCircle } from 'lucide-react';

const AccessBadge = ({ status }: { status: string }) =>
  status === 'approved'
    ? <CheckCircle className="w-4 h-4" style={{ color: '#006d43' }} />
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
    <div className="p-8" style={{ direction: 'rtl' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">לקוחות</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{customers.length} חשבונות רשומים</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b7280' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או אימייל..."
          className="w-full rounded-lg pr-10 pl-4 py-2.5 text-white placeholder-gray-500 focus:outline-none text-right"
          style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.3)' }}
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.2)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,109,67,0.2)' }}>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>חשבון</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>אימייל</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>חנויות</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>הודעות</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>הנחות</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>אוטומציות</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.tenant_id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(0,109,67,0.1)' }}>
                <td className="px-4 py-3">
                  <p className="text-white font-medium text-sm">{c.org_name}</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>{c.status === 'active' ? 'פעיל' : c.status}</p>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: '#d1d5db' }}>{c.email}</td>
                <td className="px-4 py-3 text-center text-white text-sm">{c.shop_count}</td>
                <td className="px-4 py-3 text-center"><AccessBadge status={c.messaging_access} /></td>
                <td className="px-4 py-3 text-center"><AccessBadge status={c.discounts_access} /></td>
                <td className="px-4 py-3 text-center"><AccessBadge status={c.automations_access} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-start">
                    <button onClick={() => router.push(`/control-panel/customers/${c.tenant_id}`)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: '#6b7280' }}
                      title="פרטים">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setDeleteTarget(c); setConfirmEmail(''); }}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: '#6b7280' }}
                      title="מחיקה">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#6b7280' }}>לא נמצאו לקוחות</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#121a16', border: '1px solid rgba(255,50,50,0.3)', direction: 'rtl' }}>
            <h2 className="text-white font-bold text-lg mb-2">מחיקת {deleteTarget.org_name}?</h2>
            <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>פעולה זו תמחק לצמיתות את כל הנתונים. הקלד את האימייל לאישור:</p>
            <input value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)}
              placeholder={deleteTarget.email}
              className="w-full rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none mb-4 text-right"
              style={{ background: '#0a0f0d', border: '1px solid rgba(239,68,68,0.4)' }}
            />
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 text-white py-2.5 rounded-lg text-sm font-medium"
                style={{ background: '#1f2937' }}>
                ביטול
              </button>
              <button onClick={handleDelete}
                disabled={confirmEmail !== deleteTarget.email || deleting}
                className="flex-1 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ background: '#dc2626' }}>
                {deleting ? 'מוחק...' : 'מחיקה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
