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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  const cards = [
    { label: 'Total Tenants', value: stats.total_tenants, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active', value: stats.active_tenants, icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Connected Shops', value: stats.total_shops, icon: Store, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Users', value: stats.total_users, icon: Users, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  const features = [
    { label: 'Messages', value: stats.features.messaging, icon: MessageSquare, color: 'text-blue-400' },
    { label: 'Discounts', value: stats.features.discounts, icon: Tag, color: 'text-yellow-400' },
    { label: 'Automations', value: stats.features.automations, icon: Zap, color: 'text-green-400' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{c.value}</p>
            <p className="text-gray-500 text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      <h2 className="text-lg font-semibold text-white mb-4">Feature Access</h2>
      <div className="grid grid-cols-3 gap-4">
        {features.map(f => (
          <div key={f.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <f.icon className={`w-5 h-5 ${f.color}`} />
              <p className="text-white font-semibold">{f.label}</p>
            </div>
            <p className="text-3xl font-bold text-white">{f.value}</p>
            <p className="text-gray-500 text-sm mt-1">of {stats.total_tenants} tenants</p>
          </div>
        ))}
      </div>
    </div>
  );
}
