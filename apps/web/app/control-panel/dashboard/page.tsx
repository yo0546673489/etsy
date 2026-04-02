'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cpApi, type DashboardStats } from '@/lib/cp-api';
import { Users, Store, Building2, UserCheck, MessageSquare, Tag, Zap } from 'lucide-react';

export default function CPDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const router = useRouter();

  useEffect(() => {
    cpApi.getDashboard()
      .then(setStats)
      .catch(() => router.push('/control-panel'));
  }, [router]);

  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#006d43' }} />
    </div>
  );

  const cards = [
    { label: 'סה"כ חשבונות', value: stats.total_tenants, icon: Building2 },
    { label: 'פעילים', value: stats.active_tenants, icon: UserCheck },
    { label: 'חנויות מחוברות', value: stats.total_shops, icon: Store },
    { label: 'משתמשים', value: stats.total_users, icon: Users },
  ];

  const features = [
    { label: 'אוטומציות', value: stats.features.automations, icon: Zap },
    { label: 'הנחות', value: stats.features.discounts, icon: Tag },
    { label: 'הודעות', value: stats.features.messaging, icon: MessageSquare },
  ];

  return (
    <div className="p-8" style={{ direction: 'rtl' }}>
      <h1 className="text-2xl font-bold text-white mb-2">דשבורד</h1>
      <p className="text-sm mb-8" style={{ color: '#6b7280' }}>סקירה כללית של המערכת</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-5" style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.2)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(0,109,67,0.12)' }}>
              <c.icon className="w-5 h-5" style={{ color: '#006d43' }} />
            </div>
            <p className="text-3xl font-bold text-white">{c.value}</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{c.label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">גישה לתכונות</h2>
      <div className="grid grid-cols-3 gap-4">
        {features.map(f => (
          <div key={f.label} className="rounded-xl p-5" style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <f.icon className="w-5 h-5" style={{ color: '#006d43' }} />
              <p className="text-white font-semibold">{f.label}</p>
            </div>
            <p className="text-3xl font-bold text-white">{f.value}</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>מתוך {stats.total_tenants} חשבונות</p>
          </div>
        ))}
      </div>
    </div>
  );
}
