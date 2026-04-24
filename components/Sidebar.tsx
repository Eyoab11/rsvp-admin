'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Mail,
  LogOut,
  Menu,
  X,
  BarChart3,
  QrCode,
  Sheet,
  Key,
  Calendar,
  Ticket,
  Award,
  MapPin,
  Bell,
  ScanLine,
} from 'lucide-react';
import { useState } from 'react';
import { clearAuthToken } from '@/lib/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  section?: 'main' | 'illuminate' | 'rsvp';
}

const navItems: NavItem[] = [
  // Main Navigation
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, section: 'main' },
  { label: 'Events', href: '/events', icon: Calendar, section: 'main' },
  { label: 'Notifications', href: '/notifications', icon: Bell, section: 'main' },
  { label: 'QR Scanner', href: '/scan', icon: ScanLine, section: 'main' },
  
  // Illuminate Life Event Management
  { label: 'Gala Dashboard', href: '/illuminate', icon: LayoutDashboard, section: 'illuminate' },
  { label: 'Bookings', href: '/bookings', icon: Ticket, section: 'illuminate' },
  { label: 'Attendees', href: '/illuminate-attendees', icon: Users, section: 'illuminate' },
  { label: 'Sponsors', href: '/sponsors', icon: Award, section: 'illuminate' },
  { label: 'Seat Management', href: '/seats', icon: MapPin, section: 'illuminate' },
  
  // RSVP Event Management
  { label: 'Attendees', href: '/attendees', icon: Users, section: 'rsvp' },
  { label: 'Invites', href: '/invites', icon: Mail, section: 'rsvp' },
  { label: 'Generate Tokens', href: '/generate-tokens', icon: Key, section: 'rsvp' },
  { label: 'Check-In', href: '/check-in', icon: QrCode, section: 'rsvp' },
  { label: 'Attendee Sheet', href: '/attendee-sheet', icon: Sheet, section: 'rsvp' },
  
  // Analytics & Settings
  { label: 'Analytics', href: '/analytics', icon: BarChart3, section: 'main' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const renderNavSection = (title: string, section: string, items: NavItem[]) => {
    const isCollapsed = collapsedSections.includes(section);
    
    return (
      <div key={section} className="mb-4">
        <button
          onClick={() => toggleSection(section)}
          className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-300 transition-colors"
        >
          <span>{title}</span>
          <X
            className={`w-4 h-4 transition-transform ${
              isCollapsed ? 'rotate-45' : 'rotate-0'
            }`}
          />
        </button>
        {!isCollapsed && (
          <div className="space-y-1 mt-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all
                    ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const mainItems = navItems.filter(item => item.section === 'main');
  const illuminateItems = navItems.filter(item => item.section === 'illuminate');
  const rsvpItems = navItems.filter(item => item.section === 'rsvp');

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-slate-700" />
        ) : (
          <Menu className="w-6 h-6 text-slate-700" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 shadow-2xl
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Event Manager</h1>
                <p className="text-xs text-slate-400 mt-0.5">Admin Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            {renderNavSection('Main', 'main', mainItems)}
            {renderNavSection('Illuminate Life', 'illuminate', illuminateItems)}
            {renderNavSection('RSVP Events', 'rsvp', rsvpItems)}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-slate-700/50">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-all border border-transparent hover:border-red-600/30"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  );
}
