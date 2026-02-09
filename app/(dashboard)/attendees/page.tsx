'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Eye, Download, Filter } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Attendee, Event, AttendeeStatus, InviteType } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

type SortField = 'name' | 'email' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function AttendeesPage() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendeeStatus | 'ALL'>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [inviteTypeFilter, setInviteTypeFilter] = useState<InviteType | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { toasts, closeToast, success, error: showError } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAndSortAttendees();
  }, [attendees, searchQuery, statusFilter, eventFilter, inviteTypeFilter, sortField, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all events first
      const eventsData = await api.get<Event[]>(endpoints.events.list());
      setEvents(eventsData);

      // Fetch attendees for all events
      const allAttendees: Attendee[] = [];
      for (const event of eventsData) {
        try {
          const eventAttendees = await api.get<Attendee[]>(
            `/admin/events/${event.id}/attendees`
          );
          // Add event info to each attendee
          const attendeesWithEvent = eventAttendees.map(a => ({
            ...a,
            event: {
              eventName: event.eventName,
              eventDate: event.eventDate,
            }
          }));
          allAttendees.push(...attendeesWithEvent);
        } catch (err) {
          console.error(`Failed to fetch attendees for event ${event.id}:`, err);
        }
      }
      
      setAttendees(allAttendees);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortAttendees = () => {
    let filtered = [...attendees];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (attendee) =>
          attendee.name.toLowerCase().includes(query) ||
          attendee.email.toLowerCase().includes(query) ||
          attendee.registrationId.toLowerCase().includes(query) ||
          attendee.company.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((attendee) => attendee.status === statusFilter);
    }

    // Apply event filter
    if (eventFilter !== 'ALL') {
      filtered = filtered.filter((attendee) => attendee.eventId === eventFilter);
    }

    // Apply invite type filter
    if (inviteTypeFilter !== 'ALL') {
      filtered = filtered.filter((attendee) => attendee.invite?.inviteType === inviteTypeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredAttendees(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleExport = async () => {
    if (eventFilter === 'ALL') {
      alert('Please select a specific event to export attendees.');
      return;
    }

    try {
      const csv = await api.get<string>(`/admin/events/${eventFilter}/export`);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendees-${eventFilter}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const getStatusBadgeColor = (status: AttendeeStatus): string => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'WAITLISTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInviteTypeBadgeColor = (type: InviteType): string => {
    switch (type) {
      case 'VIP':
        return 'bg-purple-100 text-purple-800';
      case 'PARTNER':
        return 'bg-blue-100 text-blue-800';
      case 'GENERAL':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredAttendees.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAttendees = filteredAttendees.slice(startIndex, endIndex);

  if (loading) {
    return <LoadingSpinner message="Loading attendees..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  return (
    <div className="p-4 md:p-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendees</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Manage event attendees and registrations</p>
        </div>
        <button
          onClick={handleExport}
          disabled={eventFilter === 'ALL'}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <Download size={20} />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search attendees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="ALL">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.eventName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AttendeeStatus | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="WAITLISTED">Waitlisted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={inviteTypeFilter}
            onChange={(e) => setInviteTypeFilter(e.target.value as InviteType | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="ALL">All Types</option>
            <option value="VIP">VIP</option>
            <option value="PARTNER">Partner</option>
            <option value="GENERAL">General</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {filteredAttendees.length} attendee{filteredAttendees.length !== 1 ? 's' : ''}
          </div>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Registration ID
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Name
                    {sortField === 'name' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('email')}
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Email
                    {sortField === 'email' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Event
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortField === 'status' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Type
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Plus One
                </th>
                <th
                  onClick={() => handleSort('createdAt')}
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Registered
                    {sortField === 'createdAt' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAttendees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 md:px-6 py-12 text-center text-gray-500 text-sm">
                    {searchQuery || statusFilter !== 'ALL' || eventFilter !== 'ALL' || inviteTypeFilter !== 'ALL'
                      ? 'No attendees found matching your filters.'
                      : 'No attendees yet.'}
                  </td>
                </tr>
              ) : (
                paginatedAttendees.map((attendee) => (
                  <tr key={attendee.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-mono text-gray-900 whitespace-nowrap">
                      {attendee.registrationId}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{attendee.name}</div>
                        <div className="text-xs text-gray-500">
                          {attendee.title} at {attendee.company}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-gray-900 whitespace-nowrap">
                      {attendee.email}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{attendee.event?.eventName}</div>
                        <div className="text-xs text-gray-500">
                          {attendee.event?.eventDate && new Date(attendee.event.eventDate).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          attendee.status
                        )}`}
                      >
                        {attendee.status}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInviteTypeBadgeColor(
                          attendee.invite?.inviteType || 'GENERAL'
                        )}`}
                      >
                        {attendee.invite?.inviteType || 'GENERAL'}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      {attendee.plusOne ? (
                        <div>
                          <div className="text-sm font-medium text-green-600">{attendee.plusOne.name}</div>
                          <div className="text-xs text-gray-500">{attendee.plusOne.company}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No</span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-gray-500 whitespace-nowrap">
                      {new Date(attendee.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/attendees/${attendee.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs md:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                        <span className="hidden sm:inline">View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredAttendees.length)} of {filteredAttendees.length} attendees
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
