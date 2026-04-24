'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Ticket, 
  Building2, 
  Palette,
  CheckCircle,
  Trash2,
  Filter,
  Search,
} from 'lucide-react';
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

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'NEW_BOOKING' | 'NEW_SPONSOR' | 'NEW_BRANDING' | 'STATUS_UPDATE'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, sponsorsRes, brandingRes] = await Promise.all([
        illuminateApi.getBookings({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }),
        illuminateApi.getSponsors({ limit: 20 }),
        illuminateApi.getBranding({ limit: 20 }),
      ]);

      const allBookings = [
        ...(bookingsRes.bookings || []),
        ...(sponsorsRes.sponsors?.map((s: any) => ({ ...s, type: 'SPONSOR' })) || []),
        ...(brandingRes.branding?.map((b: any) => ({ ...b, type: 'BRANDING' })) || []),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const currentReadIds = getReadIds();
      const notifs = bookingsToNotifications(allBookings).map((n) => ({
        ...n,
        isRead: currentReadIds.has(n.id),
      }));

      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'unread' ? !notification.isRead :
      notification.type === filter;
    
    const matchesSearch = searchQuery === '' || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    saveReadIds(allIds);
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Extract a search term from the notification message (first word(s) = company/person name)
    // Message format: "John Smith booked..." or "TechCorp Inc interested in..."
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
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_BOOKING': return <Ticket className="w-5 h-5 text-blue-600" />;
      case 'NEW_SPONSOR': return <Building2 className="w-5 h-5 text-purple-600" />;
      case 'NEW_BRANDING': return <Palette className="w-5 h-5 text-pink-600" />;
      case 'STATUS_UPDATE': return <CheckCircle className="w-5 h-5 text-green-600" />;
      default: return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'NEW_BOOKING': return 'bg-blue-100 text-blue-700';
      case 'NEW_SPONSOR': return 'bg-purple-100 text-purple-700';
      case 'NEW_BRANDING': return 'bg-pink-100 text-pink-700';
      case 'STATUS_UPDATE': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">All Notifications</h3>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading...' : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{notifications.length}</p>
            </div>
            <Bell className="w-8 h-8 text-slate-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Unread</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{unreadCount}</p>
            </div>
            <Bell className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Bookings</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {notifications.filter(n => n.type === 'NEW_BOOKING').length}
              </p>
            </div>
            <Ticket className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Sponsors</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {notifications.filter(n => n.type === 'NEW_SPONSOR').length}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filter === 'unread'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('NEW_BOOKING')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                filter === 'NEW_BOOKING'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Ticket className="w-4 h-4" />
              Bookings
            </button>
            <button
              onClick={() => setFilter('NEW_SPONSOR')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                filter === 'NEW_SPONSOR'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Sponsors
            </button>
            <button
              onClick={() => setFilter('NEW_BRANDING')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                filter === 'NEW_BRANDING'
                  ? 'bg-pink-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Palette className="w-4 h-4" />
              Branding
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No notifications found</h3>
            <p className="text-slate-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-6 hover:bg-slate-50 transition-colors cursor-pointer ${
                  !notification.isRead ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-lg flex-shrink-0 ${getTypeColor(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-semibold text-slate-900">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                      </div>
                      <span className="text-sm text-slate-500 flex-shrink-0">
                        {getTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                        {notification.type.replace('_', ' ')}
                      </span>
                      {notification.entityType && (
                        <span className="text-xs text-slate-500">
                          • {notification.entityType}
                        </span>
                      )}
                      <span className="text-xs text-blue-500 font-medium ml-1">
                        View →
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
