'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { ArrowLeft, Calendar, MapPin, Users, Clock, FileText, Save, Sparkles } from 'lucide-react';

type EventType = 'rsvp' | 'illuminate' | 'hybrid';

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
    capacity: '',
    eventType: 'rsvp' as EventType,
    // Illuminate Life specific
    enableTicketing: false,
    enableSponsors: false,
    enableBranding: false,
    enableSeating: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const eventData = {
        name: formData.name,
        description: formData.description,
        date: new Date(`${formData.date}T${formData.time}`).toISOString(),
        location: formData.location,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        eventType: formData.eventType,
        settings: {
          enableTicketing: formData.enableTicketing,
          enableSponsors: formData.enableSponsors,
          enableBranding: formData.enableBranding,
          enableSeating: formData.enableSeating,
        },
      };

      await api.post(endpoints.events.create(), eventData);
      router.push('/events');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Event</h1>
          <p className="text-sm text-slate-500 mt-1">
            Set up a new event with custom settings
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Illuminate Life Gala 2026"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe your event..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time *
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder="e.g., Grand Ballroom, 123 Main St, City, State"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Capacity (Optional)
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                placeholder="e.g., 500"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Event Type */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Event Type & Features</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Event Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.eventType === 'rsvp'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="eventType"
                  value="rsvp"
                  checked={formData.eventType === 'rsvp'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="font-semibold text-slate-900 mb-1">RSVP Event</span>
                <span className="text-xs text-slate-500">
                  Traditional invitation-based event with check-in
                </span>
              </label>

              <label className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.eventType === 'illuminate'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="eventType"
                  value="illuminate"
                  checked={formData.eventType === 'illuminate'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="font-semibold text-slate-900 mb-1">Illuminate Life</span>
                <span className="text-xs text-slate-500">
                  Ticketing, sponsors, branding, and seating
                </span>
              </label>

              <label className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.eventType === 'hybrid'
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="eventType"
                  value="hybrid"
                  checked={formData.eventType === 'hybrid'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="font-semibold text-slate-900 mb-1">Hybrid</span>
                <span className="text-xs text-slate-500">
                  Combine features from both event types
                </span>
              </label>
            </div>
          </div>

          {/* Illuminate Life Features */}
          {(formData.eventType === 'illuminate' || formData.eventType === 'hybrid') && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Enable Features:
              </p>
              
              <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  name="enableTicketing"
                  checked={formData.enableTicketing}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">Ticketing System</span>
                  <p className="text-xs text-slate-500">Allow customers to book tickets online</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  name="enableSponsors"
                  checked={formData.enableSponsors}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">Sponsor Management</span>
                  <p className="text-xs text-slate-500">Manage sponsorship inquiries and partnerships</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  name="enableBranding"
                  checked={formData.enableBranding}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">Branding Opportunities</span>
                  <p className="text-xs text-slate-500">Handle branding requests and artwork</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  name="enableSeating"
                  checked={formData.enableSeating}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">Seat Management</span>
                  <p className="text-xs text-slate-500">Assign and manage event seating</p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
