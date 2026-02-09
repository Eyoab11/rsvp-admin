'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Event } from '@/lib/types';
import { eventSchema, EventFormData } from '@/lib/validation';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const event = await api.get<Event>(endpoints.events.get(eventId));
      
      // Convert event data to form data
      reset({
        eventName: event.eventName,
        description: event.description || '',
        eventDate: event.eventDate.split('T')[0], // Extract date part
        eventStartTime: event.eventStartTime,
        eventEndTime: event.eventEndTime,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        venueCity: event.venueCity,
        venueState: event.venueState,
        venueZipCode: event.venueZipCode,
        capacity: event.capacity,
        waitlistEnabled: event.waitlistEnabled,
        registrationOpen: event.registrationOpen,
        dressCode: event.dressCode,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    setSaving(true);
    setError(null);

    try {
      await api.put(endpoints.events.update(eventId), data);
      router.push('/events');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/events')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Events
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
        <p className="text-gray-600 mt-1">Update event details</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Event Details Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                id="eventName"
                {...register('eventName')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.eventName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.eventName && (
                <p className="mt-1 text-sm text-red-600">{errors.eventName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Date *
                </label>
                <input
                  type="date"
                  id="eventDate"
                  {...register('eventDate')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.eventDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.eventDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.eventDate.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="eventStartTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  id="eventStartTime"
                  {...register('eventStartTime')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.eventStartTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.eventStartTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.eventStartTime.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="eventEndTime" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  id="eventEndTime"
                  {...register('eventEndTime')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.eventEndTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.eventEndTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.eventEndTime.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="dressCode" className="block text-sm font-medium text-gray-700 mb-1">
                Dress Code *
              </label>
              <input
                type="text"
                id="dressCode"
                {...register('dressCode')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.dressCode ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.dressCode && (
                <p className="mt-1 text-sm text-red-600">{errors.dressCode.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Venue Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Venue Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="venueName" className="block text-sm font-medium text-gray-700 mb-1">
                Venue Name *
              </label>
              <input
                type="text"
                id="venueName"
                {...register('venueName')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.venueName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.venueName && (
                <p className="mt-1 text-sm text-red-600">{errors.venueName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="venueAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                id="venueAddress"
                {...register('venueAddress')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.venueAddress ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.venueAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.venueAddress.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="venueCity" className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  id="venueCity"
                  {...register('venueCity')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.venueCity ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.venueCity && (
                  <p className="mt-1 text-sm text-red-600">{errors.venueCity.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="venueState" className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  id="venueState"
                  {...register('venueState')}
                  maxLength={2}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.venueState ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.venueState && (
                  <p className="mt-1 text-sm text-red-600">{errors.venueState.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="venueZipCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code *
                </label>
                <input
                  type="text"
                  id="venueZipCode"
                  {...register('venueZipCode')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.venueZipCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.venueZipCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.venueZipCode.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Capacity & Settings Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Capacity & Settings</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Event Capacity *
              </label>
              <input
                type="number"
                id="capacity"
                {...register('capacity', { valueAsNumber: true })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.capacity ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('waitlistEnabled')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable Waitlist</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('registrationOpen')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Registration Open</span>
              </label>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !isValid}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
