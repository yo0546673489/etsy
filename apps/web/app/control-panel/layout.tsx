'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Shield, LogOut } from 'lucide-react';

const navItems = [
  { href: '/control-panel/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/control-panel/customers', label: 'Customers', icon: Users },
  { href: '/control-panel/permissions', label: 'Permissions', icon: Shield },
];

export default function ControlPanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/control-panel') {
    return <div className="min-h-screen bg-gray-950">{children}</div>;
  }

  const handleLogout = async () => {
    await fetch('/api/cp/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/control-panel');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <p className="text-white font-bold text-lg">Profitly</p>
          <p className="text-gray-500 text-xs mt-0.5">Control Panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                <Icon className="w-4 h-4" />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
