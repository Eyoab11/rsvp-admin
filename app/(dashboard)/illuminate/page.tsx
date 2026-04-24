'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Award,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Armchair,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { illuminateApi, getErrorMessage } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface IlluminateStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  revenueByType: {
    tickets: number;
    sponsors: number;
    branding: number;
  };
  ticketsSold: {
    individual: number;
    table: number;
    vip: number;
    total: number;
  };
  sponsorInquiries: number;
  seatInventory: {
    total: number;
    available: number;
    reserved: number;
    percentageAvailable: number;
  };
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    timestamp: string;
    userName: string;
    details: any;
  }[];
}

const ACTION_LABELS: Record<string, string> = {
  booking_created: 'New booking submitted',
  admin_booking_created: 'Booking added by admin',
  booking_updated: 'Booking updated',
  booking_deleted: 'Booking deleted',
  seats_assigned: 'Seats assigned',
  seats_auto_assigned: 'Seats auto-assigned',
  seats_manually_auto_assigned: 'Seats manually assigned',
  seat_assignments_updated: 'Seat assignments updated',
  sponsor_inquiry_created: 'New sponsor inquiry',
  branding_inquiry_created: 'New branding inquiry',
  seat_created: 'Seat created',
  seats_bulk_created: 'Seats bulk created',
  seat_released: 'Seat released',
};

function formatAction(action: string, details: any): string {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ');
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 transition-all' : ''
      }`}
    >
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl flex-shrink-0 ${color}`}>{icon}</div>
    </div>
  );
}

export default function IlluminateDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<IlluminateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await illuminateApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading Illuminate dashboard..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-slate-600">{error}</p>
        <button
          onClick={() => fetchStats()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const confirmedPct =
    stats.totalBookings > 0
      ? Math.round((stats.confirmedBookings / stats.totalBookings) * 100)
      : 0;

  const seatFillPct =
    stats.seatInventory.total > 0
      ? Math.round((stats.seatInventory.reserved / stats.seatInventory.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-widest">
              Illuminate Life Gala
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Event Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">June 7, 2026 · Black Tie</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Bookings"
          value={stats.totalBookings}
          sub={`${confirmedPct}% confirmed`}
          icon={<Ticket className="w-5 h-5 text-amber-600" />}
          color="bg-amber-50"
          onClick={() => router.push('/bookings')}
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmedBookings}
          sub={`${stats.pendingBookings} pending`}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          color="bg-green-50"
          onClick={() => router.push('/bookings?status=CONFIRMED')}
        />
        <StatCard
          label="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          sub="Confirmed + contacted"
          icon={<DollarSign className="w-5 h-5 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Pending Review"
          value={stats.pendingBookings}
          sub={`${stats.cancelledBookings} cancelled`}
          icon={<Clock className="w-5 h-5 text-orange-500" />}
          color="bg-orange-50"
          onClick={() => router.push('/bookings?status=PENDING')}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Ticket breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Tickets Sold</h3>
            <button
              onClick={() => router.push('/illuminate-attendees')}
              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              View attendees <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Individual (Illuminator)', value: stats.ticketsSold.individual, color: 'bg-amber-500' },
              { label: 'Table of 10 (Circle)', value: stats.ticketsSold.table, color: 'bg-blue-500' },
              { label: 'VIP (Visionary)', value: stats.ticketsSold.vip, color: 'bg-purple-500' },
            ].map((tier) => {
              const pct = stats.ticketsSold.total > 0
                ? Math.round((tier.value / stats.ticketsSold.total) * 100)
                : 0;
              return (
                <div key={tier.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">{tier.label}</span>
                    <span className="font-semibold text-slate-900">{tier.value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tier.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Total seats sold</span>
              <span className="font-bold text-slate-900">{stats.ticketsSold.total}</span>
            </div>
          </div>
        </div>

        {/* Revenue breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Revenue by Type</h3>
          <div className="space-y-3">
            {[
              { label: 'Ticket Sales', value: stats.revenueByType.tickets, icon: <Ticket size={14} />, color: 'text-amber-600 bg-amber-50' },
              { label: 'Sponsorships', value: stats.revenueByType.sponsors, icon: <Award size={14} />, color: 'text-blue-600 bg-blue-50' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${item.color}`}>{item.icon}</span>
                  <span className="text-sm text-slate-700">{item.label}</span>
                </div>
                <span className="font-semibold text-slate-900 text-sm">
                  ${item.value.toLocaleString()}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Total</span>
              <span className="font-bold text-slate-900">${stats.totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Seat inventory */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Seat Inventory</h3>
            <button
              onClick={() => router.push('/seats')}
              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              Manage <ChevronRight size={12} />
            </button>
          </div>

          {stats.seatInventory.total === 0 ? (
            <div className="text-center py-4">
              <Armchair className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No seats in inventory yet</p>
              <button
                onClick={() => router.push('/seats')}
                className="mt-2 text-xs text-amber-600 hover:underline"
              >
                Add seats →
              </button>
            </div>
          ) : (
            <>
              {/* Donut-style fill bar */}
              <div className="relative mb-4">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      seatFillPct >= 90 ? 'bg-red-500' : seatFillPct >= 70 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${seatFillPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 text-right">{seatFillPct}% filled</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Total', value: stats.seatInventory.total, color: 'text-slate-900' },
                  { label: 'Reserved', value: stats.seatInventory.reserved, color: 'text-red-600' },
                  { label: 'Available', value: stats.seatInventory.available, color: 'text-green-600' },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-2">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row: sponsors + branding + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Sponsors */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900 text-sm">Partnerships</h3>
          <div
            onClick={() => router.push('/sponsors')}
            className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Sponsors</p>
                <p className="text-xs text-slate-500">Inquiries received</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">{stats.sponsorInquiries}</span>
              <ChevronRight size={14} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* Booking status breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Booking Status</h3>
          <div className="space-y-2">
            {[
              { label: 'Confirmed', value: stats.confirmedBookings, color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Pending', value: stats.pendingBookings, color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Cancelled', value: stats.cancelledBookings, color: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50' },
            ].map((s) => {
              const pct = stats.totalBookings > 0 ? Math.round((s.value / stats.totalBookings) * 100) : 0;
              return (
                <div key={s.label} className={`flex items-center gap-3 p-2.5 rounded-lg ${s.bg}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.color}`} />
                  <span className={`text-sm font-medium flex-1 ${s.text}`}>{s.label}</span>
                  <span className={`text-sm font-bold ${s.text}`}>{s.value}</span>
                  <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => router.push('/bookings')}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors font-medium"
            >
              Manage all bookings <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Recent Activity</h3>
          {stats.recentActivity.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">No activity yet</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {stats.recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800 font-medium leading-snug">
                      {formatAction(log.action, log.details)}
                    </p>
                    {log.details?.customerName && (
                      <p className="text-xs text-slate-500 truncate">{log.details.customerName}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                    {timeAgo(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-700 rounded-xl p-5">
        <p className="text-amber-200 text-xs font-semibold uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Add Booking', icon: <Ticket size={16} />, href: '/bookings' },
            { label: 'View Attendees', icon: <Users size={16} />, href: '/illuminate-attendees' },
            { label: 'Manage Seats', icon: <Armchair size={16} />, href: '/seats' },
            { label: 'QR Scanner', icon: <Activity size={16} />, href: '/scan' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
