'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Attendee, Event, AttendeeStatus } from '@/lib/types';
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
  createdAt: string;
  type: 'ATTENDEE' | 'PLUSONE';
  primaryAttendeeName?: string;
  plusOneName?: string;
  checkedInAt?: string | null;
}

export default function AttendeesPage() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeeRows, setAttendeeRows] = useState<AttendeeRow[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendeeStatus | 'ALL'>('ALL');
  const [attendeeTypeFilter, setAttendeeTypeFilter] = useState<AttendeeType>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { toasts, closeToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const rows: AttendeeRow[] = [];
    
    attendees.forEach(attendee => {
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
        createdAt: attendee.createdAt,
        type: 'ATTENDEE',
        plusOneName: attendee.plusOne?.name,
        checkedInAt: attendee.checkedInAt,
      });
      
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
          checkedInAt: attendee.plusOne.checkedInAt,
        });
      }
    });
    
    setAttendeeRows(rows);
  }, [attendees]);

  useEffect(() => {
    filterAndSortAttendees();
  }, [attendeeRows, searchQuery, statusFilter, attendeeTypeFilter, sortField, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const eventsData = await api.get<Event[]>(endpoints.events.list());

      const allAttendees: Attendee[] = [];
      for (const event of eventsData) {
        try {
          const eventAttendees = await api.get<Attendee[]>(
            `/admin/events/${event.id}/attendees`
          );
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

    if (attendeeTypeFilter !== 'ALL') {
      filtered = filtered.filter((row) => row.type === attendeeTypeFilter);
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((row) => row.status === statusFilter);
    }

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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendees</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Manage event attendees and registrations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-6">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
          <select
            value={attendeeTypeFilter}
            onChange={(e) => setAttendeeTypeFilter(e.target.value as AttendeeType)}
            className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-xs"
          >
            <option value="ALL">All</option>
            <option value="ATTENDEE">Attendees</option>
            <option value="PLUSONE">Plus Ones</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AttendeeStatus | 'ALL')}
            className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-xs"
          >
            <option value="ALL">Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="WAITLISTED">Waitlisted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-xs"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="text-xs text-gray-600">
          {filteredAttendees.length} result{filteredAttendees.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 mb-6">
        {paginatedAttendees.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm shadow-sm">
            No attendees found
          </div>
        ) : (
          paginatedAttendees.map((row) => (
            <div
              key={row.id}
              className={`bg-white rounded-lg border-l-4 border border-gray-200 p-3 shadow-sm ${
                row.type === 'PLUSONE' ? 'border-l-purple-500' : 'border-l-blue-500'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">{row.name}</h3>
                  <p className="text-xs text-slate-600 truncate">{row.email}</p>
                </div>
                <span
                  className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    row.type === 'ATTENDEE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {row.type === 'ATTENDEE' ? 'Attendee' : 'Plus One'}
                </span>
              </div>

              <div className="space-y-1 text-xs mb-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">ID:</span>
                  <span className="font-mono text-slate-900">{row.registrationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Company:</span>
                  <span className="text-slate-900 truncate ml-2">{row.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      row.status === 'PLUS_ONE' ? 'bg-purple-100 text-purple-800' : getStatusBadgeColor(row.status as AttendeeStatus)
                    }`}
                  >
                    {row.status === 'PLUS_ONE' ? 'Plus One' : row.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Checked In:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      row.checkedInAt ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {row.checkedInAt ? '✓ Yes' : 'No'}
                  </span>
                </div>
              </div>

              {row.type === 'ATTENDEE' && (
                <button
                  onClick={() => router.push(`/attendees/${row.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium"
                >
                  <Eye size={14} />
                  View
                </button>
              )}
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-700 text-center mb-2">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 text-xs"
              >
                Prev
              </button>
              <span className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Reg ID</th>
                <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100 whitespace-nowrap">
                  Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('email')} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100 whitespace-nowrap">
                  Email {sortField === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('status')} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100 whitespace-nowrap">
                  Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Checked In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Related</th>
                <th onClick={() => handleSort('createdAt')} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100 whitespace-nowrap">
                  Date {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedAttendees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500 text-sm">
                    No attendees found
                  </td>
                </tr>
              ) : (
                paginatedAttendees.map((row) => (
                  <tr key={row.id} className={`hover:bg-slate-50 ${row.type === 'PLUSONE' ? 'bg-purple-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${row.type === 'ATTENDEE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {row.type === 'ATTENDEE' ? 'Attendee' : 'Plus One'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-900 whitespace-nowrap">{row.registrationId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-slate-900">{row.name}</div>
                      <div className="text-xs text-slate-500">{row.title} at {row.company}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{row.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${row.status === 'PLUS_ONE' ? 'bg-purple-100 text-purple-800' : getStatusBadgeColor(row.status as AttendeeStatus)}`}>
                        {row.status === 'PLUS_ONE' ? 'Plus One' : row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${row.checkedInAt ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {row.checkedInAt ? '✓ Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.type === 'PLUSONE' && row.primaryAttendeeName ? (
                        <div>
                          <div className="text-xs font-medium text-blue-600">Guest of:</div>
                          <div className="text-xs text-slate-700">{row.primaryAttendeeName}</div>
                        </div>
                      ) : row.type === 'ATTENDEE' && row.plusOneName ? (
                        <div>
                          <div className="text-xs font-medium text-purple-600">Has guest:</div>
                          <div className="text-xs text-slate-700">{row.plusOneName}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.type === 'ATTENDEE' && (
                        <button
                          onClick={() => router.push(`/attendees/${row.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredAttendees.length)} of {filteredAttendees.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 text-sm"
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
                    className={`px-3 py-1 rounded-md text-sm ${
                      currentPage === page ? 'bg-blue-600 text-white' : 'border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 text-sm"
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
