'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, Send, Plus, X } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Event, InviteType } from '@/lib/types';
import { inviteSchema, InviteFormData } from '@/lib/validation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

interface BulkInvite {
  email: string;
  inviteType: InviteType;
}

export default function NewInvitePage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const { toasts, closeToast, success, error: showError } = useToast();
  
  // Single invite form with React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      eventId: '',
      inviteType: 'GENERAL',
      sendEmail: true,
    },
  });

  // Bulk invite form
  const [bulkEventId, setBulkEventId] = useState('');
  const [bulkSendEmails, setBulkSendEmails] = useState(true);
  const [bulkInvites, setBulkInvites] = useState<BulkInvite[]>([
    { email: '', inviteType: 'GENERAL' }
  ]);
  const [bulkErrors, setBulkErrors] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await api.get<Event[]>(endpoints.events.list());
      setEvents(data);
      
      // Set first event as default if available
      if (data.length > 0) {
        setValue('eventId', data[0].id);
        setBulkEventId(data[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSingle = async (data: InviteFormData) => {
    try {
      setSubmitting(true);
      setError(null);

      await api.post(endpoints.invites.create(), data);
      
      success('Invite Created', 'The invitation has been sent successfully.');
      setTimeout(() => router.push('/invites'), 1000);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      showError('Failed to Create Invite', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const validateBulkForm = (): boolean => {
    if (!bulkEventId) {
      setBulkErrors('Please select an event');
      return false;
    }

    const validInvites = bulkInvites.filter(inv => inv.email.trim());
    if (validInvites.length === 0) {
      setBulkErrors('Please add at least one email address');
      return false;
    }

    // Check for invalid emails
    const invalidEmails = validInvites.filter(
      inv => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email)
    );
    if (invalidEmails.length > 0) {
      setBulkErrors(`Invalid email format: ${invalidEmails[0].email}`);
      return false;
    }

    return true;
  };

  const handleBulkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateBulkForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setBulkErrors(null);

      // Filter out empty emails
      const validInvites = bulkInvites.filter(inv => inv.email.trim());

      const response = await api.post<{ created: number; failed: number }>('/invite/bulk-create', {
        eventId: bulkEventId,
        sendEmails: bulkSendEmails,
        invites: validInvites,
      });

      success('Invites Created', `Successfully created ${response.created} invites. ${response.failed} failed.`);
      setTimeout(() => router.push('/invites'), 1000);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setBulkErrors(errorMsg);
      showError('Failed to Create Invites', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const addBulkInvite = () => {
    setBulkInvites([...bulkInvites, { email: '', inviteType: 'GENERAL' }]);
  };

  const removeBulkInvite = (index: number) => {
    setBulkInvites(bulkInvites.filter((_, i) => i !== index));
  };

  const updateBulkInvite = (index: number, field: keyof BulkInvite, value: string) => {
    const updated = [...bulkInvites];
    updated[index] = { ...updated[index], [field]: value };
    setBulkInvites(updated);
  };

  if (loading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (events.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          No events available. Please create an event first before creating invites.
        </div>
        <button
          onClick={() => router.push('/events/new')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Event
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/invites')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Invites
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create Invite</h1>
        <p className="text-gray-600 mt-1">Send invitations to your guests</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Mode Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'single'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Single Invite
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'bulk'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bulk Invites
          </button>
        </div>
      </div>

      {/* Single Invite Form */}
      {mode === 'single' && (
        <form onSubmit={handleSubmit(onSubmitSingle)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  id="email"
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="guest@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Event */}
            <div>
              <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-2">
                Event <span className="text-red-500">*</span>
              </label>
              <select
                id="eventId"
                {...register('eventId')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.eventId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName} - {new Date(event.eventDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {errors.eventId && (
                <p className="mt-1 text-sm text-red-600">{errors.eventId.message}</p>
              )}
            </div>

            {/* Invite Type */}
            <div>
              <label htmlFor="inviteType" className="block text-sm font-medium text-gray-700 mb-2">
                Invite Type <span className="text-red-500">*</span>
              </label>
              <select
                id="inviteType"
                {...register('inviteType')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.inviteType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="GENERAL">General</option>
                <option value="VIP">VIP</option>
                <option value="PARTNER">Partner</option>
              </select>
              {errors.inviteType && (
                <p className="mt-1 text-sm text-red-600">{errors.inviteType.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                VIP: High-priority guests | Partner: Business partners | General: Regular attendees
              </p>
            </div>

            {/* Send Email */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sendEmail"
                {...register('sendEmail')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="sendEmail" className="text-sm font-medium text-gray-700">
                Send invitation email immediately
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/invites')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={!isValid}
              icon={<Send size={20} />}
            >
              Create Invite
            </Button>
          </div>
        </form>
      )}

      {/* Bulk Invite Form */}
      {mode === 'bulk' && (
        <form onSubmit={handleBulkSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {bulkErrors && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {bulkErrors}
            </div>
          )}
          
          <div className="space-y-6">
            {/* Event */}
            <div>
              <label htmlFor="bulkEventId" className="block text-sm font-medium text-gray-700 mb-2">
                Event <span className="text-red-500">*</span>
              </label>
              <select
                id="bulkEventId"
                value={bulkEventId}
                onChange={(e) => setBulkEventId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName} - {new Date(event.eventDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Send Emails */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="bulkSendEmails"
                checked={bulkSendEmails}
                onChange={(e) => setBulkSendEmails(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="bulkSendEmails" className="text-sm font-medium text-gray-700">
                Send invitation emails immediately
              </label>
            </div>

            {/* Bulk Invites List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Invites <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addBulkInvite}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} />
                  Add Another
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {bulkInvites.map((invite, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={invite.email}
                        onChange={(e) => updateBulkInvite(index, 'email', e.target.value)}
                        placeholder="guest@example.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={invite.inviteType}
                      onChange={(e) => updateBulkInvite(index, 'inviteType', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="GENERAL">General</option>
                      <option value="VIP">VIP</option>
                      <option value="PARTNER">Partner</option>
                    </select>
                    {bulkInvites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBulkInvite(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Add multiple email addresses to send invites in bulk. Empty rows will be ignored.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/invites')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              icon={<Send size={20} />}
            >
              Create {bulkInvites.filter(inv => inv.email.trim()).length} Invites
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
