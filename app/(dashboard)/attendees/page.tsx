'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Eye, Filter } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Attendee, Event, AttendeeStatus, InviteType } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

type SortField = 'name' | 'email' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type AttendeeType = 'ALL' | 'ATTENDEE' | 'PLUSONE';

interface AttendeeRow {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  status: string;
  registrationId: string;
  eventId: string;
  event?: {
    eventName: string;
    eventDate: string;
  };
  invite?: {
    inviteType: InviteType;
  };
  createdAt: string;
  type: 'ATTENDEE' | 'PLUSONE';
  primaryAttendeeName?: string; // For plus-ones
  plusOneName?: string; // For attendees with plus-ones
}

export default function AttendeesPage() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeeRows, setAttendeeRows] = useState<AttendeeRow[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendeeStatus | 'ALL'>('ALL');
  const [attendeeTypeFilter, setAttendeeTypeFilter] = useState<AttendeeType>('ALL');
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
    // Convert attendees to rows (including plus-ones as separate rows)
    const rows: AttendeeRow[] = [];
    
    attendees.forEach(attendee => {
      // Add main attendee
      rows.push({
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        company: attendee.company,
        title: attendee.title,
        status: attendee.status,
        registrationId: attendee.registrationId,
        eventId: attendee.eventId,
        event: attendee.event,
        invite: attendee.invite,
        createdAt: attendee.createdAt,
        type: 'ATTENDEE',
        plusOneName: attendee.plusOne?.name,
      });
      
      // Add plus-one as separate row if exists
      if (attendee.plusOne) {
        rows.push({
          id: `plusone-${attendee.plusOne.id}`,
          name: attendee.plusOne.name,
          email: attendee.plusOne.email,
          company: attendee.plusOne.company,
          title: attendee.plusOne.title,
          status: 'PLUS_ONE',
          registrationId: (attendee.plusOne as any).registrationId || `${attendee.registrationId}-P1`,
          eventId: attendee.eventId,
          event: attendee.event,
          createdAt: attendee.createdAt,
          type: 'PLUSONE',
          primaryAttendeeName: attendee.name,
        });
      }
    });
    
    setAttendeeRows(rows);
  }, [attendees]);

  useEffect(() => {
    filterAndSortAttendees();
  }, [attendeeRows, searchQuery, statusFilter, attendeeTypeFilter, inviteTypeFilter, sortField, sortOrder]);

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
    let filtered = [...attendeeRows];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.name.toLowerCase().includes(query) ||
          row.email.toLowerCase().includes(query) ||
          row.registrationId.toLowerCase().includes(query) ||
          row.company.toLowerCase().includes(query) ||
          (row.primaryAttendeeName && row.primaryAttendeeName.toLowerCase().includes(query))
      );
    }

    // Apply attendee type filter
    if (attendeeTypeFilter !== 'ALL') {
      filtered = filtered.filter((row) => row.type === attendeeTypeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((row) => row.status === statusFilter);
    }

    // Apply invite type filter (only for attendees, not plus-ones)
    if (inviteTypeFilter !== 'ALL') {
      filtered = filtered.filter((row) => 
        row.type === 'PLUSONE' || row.invite?.inviteType === inviteTypeFilter
      );
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
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendees</h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">Manage event attendees and registrations</p>
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
            value={attendeeTypeFilter}
            onChange={(e) => setAttendeeTypeFilter(e.target.value as AttendeeType)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
          >
            <option value="ALL">All</option>
            <option value="ATTENDEE">Attendees</option>
            <option value="PLUSONE">Plus Ones</option>
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
            Showing {filteredAttendees.length} {attendeeTypeFilter === 'ALL' ? 'record' : attendeeTypeFilter === 'ATTENDEE' ? 'attendee' : 'plus one'}{filteredAttendees.length !== 1 ? 's' : ''}
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
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reg ID
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortField === 'name' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('email')}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Email
                    {sortField === 'email' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'status' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invite
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Related
                </th>
                <th
                  onClick={() => handleSort('createdAt')}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortField === 'createdAt' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAttendees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                    {searchQuery || statusFilter !== 'ALL' || attendeeTypeFilter !== 'ALL' || inviteTypeFilter !== 'ALL'
                      ? 'No records found matching your filters.'
                      : 'No attendees yet.'}
                  </td>
                </tr>
              ) : (
                paginatedAttendees.map((row) => (
                  <tr key={row.id} className={`hover:bg-gray-50 ${row.type === 'PLUSONE' ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          row.type === 'ATTENDEE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {row.type === 'ATTENDEE' ? 'Attendee' : 'Plus One'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs font-mono text-gray-900">
                      {row.registrationId}
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-[200px]">
                        <div className="font-medium text-sm text-gray-900 truncate">{row.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {row.title} at {row.company}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <div className="max-w-[180px] truncate">{row.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          row.status === 'PLUS_ONE'
                            ? 'bg-purple-100 text-purple-800'
                            : getStatusBadgeColor(row.status as AttendeeStatus)
                        }`}
                      >
                        {row.status === 'PLUS_ONE' ? 'Plus One' : row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {row.type === 'ATTENDEE' && row.invite ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getInviteTypeBadgeColor(
                            row.invite.inviteType
                          )}`}
                        >
                          {row.invite.inviteType}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.type === 'PLUSONE' && row.primaryAttendeeName ? (
                        <div className="max-w-[120px]">
                          <div className="text-xs font-medium text-blue-600">Guest of:</div>
                          <div className="text-xs text-gray-700 truncate">{row.primaryAttendeeName}</div>
                        </div>
                      ) : row.type === 'ATTENDEE' && row.plusOneName ? (
                        <div className="max-w-[120px]">
                          <div className="text-xs font-medium text-purple-600">Has guest:</div>
                          <div className="text-xs text-gray-700 truncate">{row.plusOneName}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.type === 'ATTENDEE' && (
                        <button
                          onClick={() => router.push(`/attendees/${row.id}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                      )}
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

