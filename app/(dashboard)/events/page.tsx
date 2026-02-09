'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Calendar, MapPin, Users, Trash2, Edit } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Event } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

type SortField = 'eventName' | 'eventDate' | 'capacity' | 'currentRegistrations';
type SortOrder = 'asc' | 'desc';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('eventDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toasts, closeToast, success, error: showError } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterAndSortEvents();
  }, [events, searchQuery, sortField, sortOrder]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Event[]>(endpoints.events.list());
      setEvents(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortEvents = () => {
    let filtered = [...events];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.eventName.toLowerCase().includes(query) ||
          event.venueName.toLowerCase().includes(query) ||
          event.venueCity.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'eventDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredEvents(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (id: string, eventName: string) => {
    setEventToDelete({ id, name: eventName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    try {
      setDeleting(true);
      await api.delete(endpoints.events.delete(eventToDelete.id));
      setEvents(events.filter((e) => e.id !== eventToDelete.id));
      success('Event Deleted', `"${eventToDelete.name}" has been deleted successfully.`);
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      showError('Failed to Delete Event', errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const getEventStatus = (eventDate: string): 'upcoming' | 'ongoing' | 'past' => {
    const now = new Date();
    const date = new Date(eventDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (eventDay > today) return 'upcoming';
    if (eventDay.getTime() === today.getTime()) return 'ongoing';
    return 'past';
  };

  const getCapacityColor = (current: number, total: number): string => {
    const utilization = (current / total) * 100;
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  if (loading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchEvents} />;
  }

  return (
    <div className="p-4 md:p-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setEventToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={
          <div>
            <p>Are you sure you want to delete <strong>"{eventToDelete?.name}"</strong>?</p>
            <p className="mt-2 text-xs">This action cannot be undone. All associated data will be permanently removed.</p>
          </div>
        }
        confirmText="Delete Event"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Manage your RSVP events</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/events/new')}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Create Event</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  onClick={() => handleSort('eventName')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Event Name
                    {sortField === 'eventName' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('eventDate')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortField === 'eventDate' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th
                  onClick={() => handleSort('capacity')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Capacity
                    {sortField === 'capacity' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('currentRegistrations')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Attendees
                    {sortField === 'currentRegistrations' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery ? 'No events found matching your search.' : 'No events yet. Create your first event!'}
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const status = getEventStatus(event.eventDate);
                  const capacityColor = getCapacityColor(event.currentRegistrations, event.capacity);
                  const utilization = Math.round((event.currentRegistrations / event.capacity) * 100);

                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">{event.eventName}</div>
                            <div className="text-sm text-gray-500">{event.eventStartTime} - {event.eventEndTime}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(event.eventDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-900">{event.venueName}</div>
                            <div className="text-xs text-gray-500">
                              {event.venueCity}, {event.venueState}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {event.capacity}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          <div>
                            <div className={`text-sm font-medium ${capacityColor}`}>
                              {event.currentRegistrations} / {event.capacity}
                            </div>
                            <div className="text-xs text-gray-500">{utilization}% full</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === 'upcoming'
                              ? 'bg-blue-100 text-blue-800'
                              : status === 'ongoing'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/events/${event.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit event"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(event.id, event.eventName)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete event"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-gray-200">
          {paginatedEvents.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              {searchQuery ? 'No events found matching your search.' : 'No events yet. Create your first event!'}
            </div>
          ) : (
            paginatedEvents.map((event) => {
              const status = getEventStatus(event.eventDate);
              const capacityColor = getCapacityColor(event.currentRegistrations, event.capacity);
              const utilization = Math.round((event.currentRegistrations / event.capacity) * 100);

              return (
                <div key={event.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{event.eventName}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Calendar size={14} />
                        <span>
                          {new Date(event.eventDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin size={14} />
                        <span>{event.venueName}, {event.venueCity}</span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800'
                          : status === 'ongoing'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-400" />
                      <span className={`text-sm font-medium ${capacityColor}`}>
                        {event.currentRegistrations} / {event.capacity}
                      </span>
                      <span className="text-xs text-gray-500">({utilization}% full)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/events/${event.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id, event.eventName)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
              ))}
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
