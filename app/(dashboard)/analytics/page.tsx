'use client';

import { useEffect, useState } from 'react';
import { Calendar, Users, Mail, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { DashboardStats, Event, Attendee } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [totalAttendeesWithPlusOnes, setTotalAttendeesWithPlusOnes] = useState<number>(0);
  const [confirmedAttendeesWithPlusOnes, setConfirmedAttendeesWithPlusOnes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard stats
      const data = await api.get<DashboardStats>(endpoints.admin.dashboardStats());
      setStats(data);
      
      // Fetch all events to get attendees with plus ones
      const events = await api.get<Event[]>(endpoints.events.list());
      let totalCount = 0;
      let confirmedCount = 0;
      
      for (const event of events) {
        try {
          const attendees = await api.get<Attendee[]>(`/admin/events/${event.id}/attendees`);
          
          // Count all attendees + their plus ones
          totalCount += attendees.length;
          totalCount += attendees.filter(a => a.plusOne).length;
          
          // Count confirmed attendees + their plus ones
          const confirmedAttendees = attendees.filter(a => a.status === 'CONFIRMED');
          confirmedCount += confirmedAttendees.length;
          confirmedCount += confirmedAttendees.filter(a => a.plusOne).length;
        } catch (err) {
          console.warn(`Failed to fetch attendees for event ${event.id}:`, err);
        }
      }
      
      setTotalAttendeesWithPlusOnes(totalCount);
      setConfirmedAttendeesWithPlusOnes(confirmedCount);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchStats} />;
  }

  if (!stats) {
    return <ErrorMessage message="No data available" onRetry={fetchStats} />;
  }

  const inviteAcceptanceRate = stats.totalInvites > 0 
    ? ((totalAttendeesWithPlusOnes / stats.totalInvites) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">View event statistics and insights</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">Total Events</div>
            <Calendar className="text-blue-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalEvents}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.upcomingEvents} upcoming
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">Total Attendees</div>
            <Users className="text-green-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-green-600">{totalAttendeesWithPlusOnes}</div>
          <div className="text-xs text-gray-500 mt-1">
            {confirmedAttendeesWithPlusOnes} confirmed (including plus ones)
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">Total Invites</div>
            <Mail className="text-purple-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-purple-600">{stats.totalInvites}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.usedInvites} accepted
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">Acceptance Rate</div>
            <TrendingUp className="text-orange-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-orange-600">{inviteAcceptanceRate}%</div>
          <div className="text-xs text-gray-500 mt-1">
            Invite to attendee ratio
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Attendee Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendee Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Confirmed</div>
                  <div className="text-xs text-gray-500">Ready to attend</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">{confirmedAttendeesWithPlusOnes}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="text-yellow-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Waitlisted</div>
                  <div className="text-xs text-gray-500">Waiting for spots</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.waitlistedAttendees}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="text-red-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Cancelled</div>
                  <div className="text-xs text-gray-500">No longer attending</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.cancelledAttendees}</div>
            </div>
          </div>
        </div>

        {/* Invite Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Mail className="text-purple-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Total Sent</div>
                  <div className="text-xs text-gray-500">All invitations</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalInvites}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Accepted</div>
                  <div className="text-xs text-gray-500">Used invites</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.usedInvites}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="text-gray-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Pending</div>
                  <div className="text-xs text-gray-500">Not yet used</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {stats.totalInvites - stats.usedInvites}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Overview</h2>
        <p className="text-gray-700">
          You have <strong>{stats.totalEvents}</strong> total events with{' '}
          <strong>{stats.upcomingEvents}</strong> upcoming. Out of{' '}
          <strong>{stats.totalInvites}</strong> invitations sent,{' '}
          <strong>{stats.usedInvites}</strong> have been accepted, resulting in{' '}
          <strong>{totalAttendeesWithPlusOnes}</strong> total attendees (including plus ones).
        </p>
        {confirmedAttendeesWithPlusOnes > 0 && (
          <p className="text-gray-700 mt-2">
            Currently, <strong>{confirmedAttendeesWithPlusOnes}</strong> attendees are confirmed (including plus ones),{' '}
            <strong>{stats.waitlistedAttendees}</strong> are waitlisted, and{' '}
            <strong>{stats.cancelledAttendees}</strong> have cancelled.
          </p>
        )}
      </div>
    </div>
  );
}
