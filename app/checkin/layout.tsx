'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import { QrCode, LogOut } from 'lucide-react';

export default function CheckinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('Check-in Staff');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Check if user is authenticated (only on client side)
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Get user info and verify role
    const user = getUser();
    if (user) {
      setUserName(user.name || user.email || 'Check-in Staff');
      setUserRole(user.role);
      
      // Only allow checkin and admin roles
      if (user.role !== 'checkin' && user.role !== 'admin') {
        router.push('/login');
        return;
      }
    }
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <QrCode className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Event Check-In</h1>
              <p className="text-sm text-slate-600">Staff Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}