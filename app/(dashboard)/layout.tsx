'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { isAuthenticated, getUser } from '@/lib/auth';
import { Search } from 'lucide-react';
import NotificationBell from '@/components/ui/NotificationBell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('Admin');
  const [userRole, setUserRole] = useState('Administrator');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = getUser();
    if (user) {
      setUserName(user.name || user.email || 'Admin');
      setUserRole(user.role === 'super_admin' ? 'Super Admin' : 'Administrator');
      
      if (user.role === 'checkin') {
        router.push('/checkin');
        return;
      }
    }
  }, [router, pathname]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <Sidebar />

      <main className="flex-1 lg:ml-72">
        {/* Enhanced Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 lg:px-8 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="lg:ml-0 ml-12 flex-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {getPageTitle(pathname)}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {getPageDescription(pathname)}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Search Bar (Optional) */}
              <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400 w-full"
                />
              </div>

              {/* Notifications */}
              <NotificationBell />

              {/* User Info */}
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">
                    {userName}
                  </p>
                  <p className="text-xs text-slate-500">{userRole}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
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

  const routes: Record<string, string> = {
    '/': 'Dashboard',
    '/events': 'Events',
    '/notifications': 'Notifications',
    '/scan': 'QR Scanner',
    '/illuminate': 'Illuminate Life Gala',
    '/bookings': 'Bookings',
    '/illuminate-attendees': 'Illuminate Attendees',
    '/sponsors': 'Sponsors',
    '/seats': 'Seat Management',
    '/attendees': 'Attendees',
    '/invites': 'Invites',
    '/generate-tokens': 'Generate Tokens',
    '/check-in': 'Check-In',
    '/analytics': 'Analytics',
    '/attendee-sheet': 'Attendee Sheet',
  };

  for (const [path, title] of Object.entries(routes)) {
    if (pathname === path || (path !== '/' && pathname.startsWith(path))) {
      return title;
    }
  }

  return 'Dashboard';
}

function getPageDescription(pathname: string | null): string {
  if (!pathname) return 'Overview of all events and activities';

  const descriptions: Record<string, string> = {
    '/': 'Overview of all events and activities',
    '/events': 'Manage and create events',
    '/notifications': 'View and manage all notifications',
    '/scan': 'Scan QR codes for RSVP events and Illuminate Life Gala',
    '/illuminate': 'Overview of bookings, revenue, seats, and activity for the Illuminate Life Gala',
    '/bookings': 'Manage ticket bookings and reservations',
    '/illuminate-attendees': 'View confirmed ticket holders for the Illuminate Life Gala',
    '/sponsors': 'Manage sponsorship inquiries and partnerships',
    '/seats': 'Assign and manage event seating',
    '/attendees': 'View and manage event attendees',
    '/invites': 'Send and track event invitations',
    '/generate-tokens': 'Generate access tokens for invites',
    '/check-in': 'Check-in attendees at the event',
    '/analytics': 'View detailed analytics and reports',
    '/attendee-sheet': 'Export attendee information',
  };

  for (const [path, description] of Object.entries(descriptions)) {
    if (pathname === path || (path !== '/' && pathname.startsWith(path))) {
      return description;
    }
  }

  return 'Overview of all events and activities';
}
