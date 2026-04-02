'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Shield, LogOut } from 'lucide-react';

const navItems = [
  { href: '/control-panel/dashboard', label: 'דשבורד', icon: LayoutDashboard },
  { href: '/control-panel/customers', label: 'לקוחות', icon: Users },
  { href: '/control-panel/permissions', label: 'הרשאות', icon: Shield },
];

export default function ControlPanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/control-panel') {
    return <div className="min-h-screen" style={{ background: '#0a0f0d' }}>{children}</div>;
  }

  const handleLogout = async () => {
    await fetch('/api/cp/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/control-panel');
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0f0d', direction: 'rtl' }}>
      <aside className="w-56 flex flex-col" style={{ background: '#121a16', borderLeft: '1px solid #006d43/20', borderLeftColor: 'rgba(0,109,67,0.2)' }}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(0,109,67,0.2)' }}>
          <p className="text-white font-bold text-lg">Profitly</p>
          <p className="text-sm mt-0.5" style={{ color: '#006d43' }}>לוח בקרה</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: isActive ? '#006d43' : 'transparent',
                  color: isActive ? '#ffffff' : '#9ca3af',
                }}>
                <Icon className="w-4 h-4" />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(0,109,67,0.2)' }}>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors"
            style={{ color: '#9ca3af' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
            <LogOut className="w-4 h-4" />התנתקות
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
