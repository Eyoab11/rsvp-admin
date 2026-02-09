'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { eventSchema, EventFormData } from '@/lib/validation';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, closeToast, success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    mode: 'onChange',
    defaultValues: {
      eventName: '',
      description: '',
      eventDate: '',
      eventStartTime: '',
      eventEndTime: '',
      venueName: '',
      venueAddress: '',
      venueCity: '',
      venueState: '',
      venueZipCode: '',
      capacity: 100,
      waitlistEnabled: false,
      registrationOpen: true,
      dressCode: '',
    },
  });

  const onSubmit = async (data: EventFormData) => {
    setLoading(true);
    setError(null);

    try {
      await api.post(endpoints.events.create(), data);
      success('Event Created', 'The event has been created successfully.');
      setTimeout(() => router.push('/dashboard/events'), 1000);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      showError('Failed to Create Event', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Events
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
        <p className="text-gray-600 mt-1">Fill in the details to create a new event</p>
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
                placeholder="e.g., Annual Gala 2024"
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
                placeholder="Brief description of the event"
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
                placeholder="e.g., Business Casual, Black Tie"
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
                placeholder="e.g., Grand Ballroom"
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
                placeholder="Street address"
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
                  placeholder="e.g., CA"
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
                  placeholder="12345"
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={!isValid}
          >
            Create Event
          </Button>
        </div>
      </form>
    </div>
  );
}