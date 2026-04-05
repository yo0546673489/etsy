'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cpApi } from '@/lib/cp-api';
import { Lock } from 'lucide-react';

export default function ControlPanelLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await cpApi.login(password);
      router.push('/control-panel/dashboard');
    } catch {
      setError('סיסמה שגויה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0f0d', direction: 'rtl' }}>
      <div className="rounded-2xl p-8 w-full max-w-sm" style={{ background: '#121a16', border: '1px solid rgba(0,109,67,0.3)' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(0,109,67,0.15)' }}>
            <Lock className="w-7 h-7" style={{ color: '#006d43' }} />
          </div>
          <h1 className="text-white text-xl font-bold">לוח בקרה — Profix</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>ניהול פנימי של המערכת</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="סיסמה"
            className="w-full rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none text-right"
            style={{ background: '#0a0f0d', border: '1px solid rgba(0,109,67,0.4)' }}
            autoFocus
          />
          {error && <p className="text-red-400 text-sm text-right">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
            style={{ background: '#006d43' }}>
            {loading ? 'בודק...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}
