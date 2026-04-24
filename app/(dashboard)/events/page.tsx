'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Event } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Edit, 
  Trash2,
  Eye,
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    
    if (filter === 'upcoming') return eventDate >= now;
    if (filter === 'past') return eventDate < now;
    return true;
  });

  if (loading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error) {
    return <ErrorMessage title="Failed to load events" message={error} onRetry={fetchEvents} />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">All Events</h3>
          <p className="text-sm text-slate-500 mt-1">
            Manage your events and create new ones
          </p>
        </div>
        <button
          onClick={() => router.push('/events/create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Event
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            filter === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          All Events ({events.length})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            filter === 'upcoming'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Upcoming ({events.filter(e => new Date(e.eventDate) >= new Date()).length})
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            filter === 'past'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Past ({events.filter(e => new Date(e.eventDate) < new Date()).length})
        </button>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No events found
          </h3>
          <p className="text-slate-500 mb-6">
            Get started by creating your first event
          </p>
          <button
            onClick={() => router.push('/events/create')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} onRefresh={fetchEvents} />
          ))}
        </div>
      )}
    </div>
  );
}

interface EventCardProps {
  event: Event;
  onRefresh: () => void;
}

function EventCard({ event, onRefresh }: EventCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const eventDate = new Date(event.eventDate);
  const isPast = eventDate < new Date();
  const isToday = eventDate.toDateString() === new Date().toDateString();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await api.delete(endpoints.events.delete(event.id));
      onRefresh();
    } catch (err) {
      alert('Failed to delete event: ' + getErrorMessage(err));
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:shadow-xl transition-all overflow-hidden group">
      {/* Event Header with Status Badge */}
      <div className="relative p-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-slate-900 line-clamp-2 flex-1">
            {event.eventName}
          </h3>
          <div className="flex-shrink-0">
            {isPast ? (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                Past
              </span>
            ) : isToday ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Today
              </span>
            ) : (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Upcoming
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-slate-900 font-medium">
                {eventDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {event.eventStartTime}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-sm">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-slate-600 line-clamp-2">{event.venueName}</p>
          </div>

          {event.capacity && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className="text-slate-600">
                Capacity: <span className="font-medium text-slate-900">{event.capacity}</span>
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
          <button
            onClick={() => router.push(`/attendees?eventId=${event.id}`)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
          >
            <Users className="w-4 h-4" />
            Attendees
          </button>
          <button
            onClick={() => router.push(`/events/${event.id}`)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <button
            onClick={() => router.push(`/events/${event.id}/edit`)}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-medium text-sm"
          >
            <Edit className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-slate-600" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20">
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Event
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
