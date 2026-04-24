'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, CheckCircle, Ticket, Building2, Palette } from 'lucide-react';
import { illuminateApi } from '@/lib/api';

type NotificationType = 'NEW_BOOKING' | 'NEW_SPONSOR' | 'NEW_BRANDING' | 'STATUS_UPDATE';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
}

// Convert bookings from the API into notification objects
function bookingsToNotifications(bookings: any[]): Notification[] {
  return bookings.map((b) => {
    let type: NotificationType;
    let title: string;
    let message: string;
    let entityType: string;

    if (b.type === 'TICKET') {
      type = 'NEW_BOOKING';
      title = 'New Ticket Booking';
      const amount = Number(b.totalAmount) > 0
        ? ` ($${Number(b.totalAmount).toLocaleString()})`
        : '';
      message = `${b.customerName} booked ${b.quantity} ${b.ticketName || b.ticketTier || 'ticket'}${b.quantity !== 1 ? 's' : ''}${amount}`;
      entityType = 'booking';
    } else if (b.type === 'SPONSOR') {
      type = 'NEW_SPONSOR';
      title = 'New Sponsor Inquiry';
      message = `${b.companyName || b.customerName} interested in ${b.sponsorTier || 'sponsorship'}`;
      entityType = 'sponsor';
    } else {
      type = 'NEW_BRANDING';
      title = 'New Branding Request';
      message = `${b.companyName || b.customerName} submitted ${b.brandingType || 'branding'} request`;
      entityType = 'branding';
    }

    return {
      id: b.id,
      type,
      title,
      message,
      entityType,
      entityId: b.id,
      isRead: false,
      createdAt: b.createdAt,
    };
  });
}

const READ_KEY = 'illuminate_read_notifications';

function getReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(READ_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {}
}

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const [bookingsRes, sponsorsRes, brandingRes] = await Promise.all([
        illuminateApi.getBookings({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
        illuminateApi.getSponsors({ limit: 5 }),
        illuminateApi.getBranding({ limit: 5 }),
      ]);

      const allBookings = [
        ...(bookingsRes.bookings || []),
        ...(sponsorsRes.sponsors?.map((s: any) => ({ ...s, type: 'SPONSOR' })) || []),
        ...(brandingRes.branding?.map((b: any) => ({ ...b, type: 'BRANDING' })) || []),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 15);

      const currentReadIds = getReadIds();
      setReadIds(currentReadIds);

      const notifs = bookingsToNotifications(allBookings).map((n) => ({
        ...n,
        isRead: currentReadIds.has(n.id),
      }));

      setNotifications(notifs);
    } catch (err) {
      // Silently fail — bell just shows 0 if API is unavailable
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    saveReadIds(updated);
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    const updated = new Set(notifications.map(n => n.id));
    setReadIds(updated);
    saveReadIds(updated);
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);

    const searchTerm = notification.message.split(' ').slice(0, 2).join(' ');

    switch (notification.entityType) {
      case 'booking':
        router.push(`/bookings?search=${encodeURIComponent(searchTerm)}`);
        break;
      case 'sponsor':
        router.push(`/sponsors?search=${encodeURIComponent(searchTerm)}`);
        break;
      case 'branding':
        router.push(`/branding?search=${encodeURIComponent(searchTerm)}`);
        break;
      default:
        router.push('/notifications');
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_BOOKING': return <Ticket className="w-5 h-5 text-blue-600" />;
      case 'NEW_SPONSOR': return <Building2 className="w-5 h-5 text-purple-600" />;
      case 'NEW_BRANDING': return <Palette className="w-5 h-5 text-pink-600" />;
      default: return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Notifications</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {unreadCount} unread
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group ${
                        !notification.isRead ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-slate-400">
                              {getTimeAgo(notification.createdAt)}
                            </p>
                            <span className="text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              View →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-200">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/notifications');
                  }}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
