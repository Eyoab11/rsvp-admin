'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { isAuthenticated, getUser } from '@/lib/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    // Check if user is authenticated (only on client side)
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Get user name after component mounts to avoid hydration mismatch
    const user = getUser();
    if (user) {
      setUserName(user.name || user.email || 'Admin');
    }
  }, [router, pathname]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="lg:ml-0 ml-12">
              <h2 className="text-2xl font-bold text-slate-900">
                {getPageTitle(pathname)}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {userName}
                </p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'Dashboard';

  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
  if (pathname.startsWith('/attendees')) return 'Attendees';
  if (pathname.startsWith('/invites')) return 'Invites';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/emails')) return 'Emails';

  return 'Dashboard';
}
