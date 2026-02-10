'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Briefcase,
  Calendar,
  MapPin,
  QrCode,
  Download,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Attendee, AttendeeStatus } from '@/lib/types';

export default function AttendeeDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const attendeeId = params.id as string;

  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchAttendeeDetails();
  }, [attendeeId]);

  const fetchAttendeeDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch attendee details from RSVP endpoint
      const data = await api.get<any>(endpoints.rsvp.attendee(attendeeId));
      
      // The endpoint returns a registration response with attendee, plusOne, and event
      const attendeeData = {
        ...data.attendee,
        plusOne: data.plusOne || null,
        event: data.event || null,
        invite: data.attendee?.invite || null,
      };
      
      setAttendee(attendeeData);

      // Fetch QR code
      try {
        const qrData = await api.get<{ qrCodeImage: string }>(
          endpoints.qr.attendee(attendeeId)
        );
        setQrCodeUrl(qrData.qrCodeImage);
      } catch (qrErr) {
        console.error('Failed to fetch QR code:', qrErr);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAttendee = async () => {
    if (!attendee) return;

    const confirmed = confirm(
      `Are you sure you want to cancel the registration for ${attendee.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setCancelling(true);
      await api.delete(`/admin/attendees/${attendeeId}`);
      alert('Attendee cancelled successfully');
      router.push('/attendees');
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;

    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `qr-${attendee?.registrationId || attendeeId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !attendee) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Attendee not found'}
        </div>
        <button
          onClick={() => router.push('/attendees')}
          className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={20} />
          Back to Attendees
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/attendees')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Attendees
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{attendee.name}</h1>
            <p className="text-gray-600 mt-1">Registration ID: {attendee.registrationId}</p>
          </div>
          <div className="flex items-center gap-2">
            {attendee.status !== 'CANCELLED' && (
              <button
                onClick={handleCancelAttendee}
                disabled={cancelling}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={20} />
                {cancelling ? 'Cancelling...' : 'Cancel Registration'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendee Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendee Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="text-gray-400 mt-1" size={20} />
                <div>
                  <div className="text-sm text-gray-500">Full Name</div>
                  <div className="font-medium text-gray-900">{attendee.name}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="text-gray-400 mt-1" size={20} />
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium text-gray-900">{attendee.email}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="text-gray-400 mt-1" size={20} />
                <div>
                  <div className="text-sm text-gray-500">Company</div>
                  <div className="font-medium text-gray-900">{attendee.company}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="text-gray-400 mt-1" size={20} />
                <div>
                  <div className="text-sm text-gray-500">Title</div>
                  <div className="font-medium text-gray-900">{attendee.title}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="text-gray-400 mt-1" size={20} />
                <div>
                  <div className="text-sm text-gray-500">Event Name</div>
                  <div className="font-medium text-gray-900">
                    {attendee.event?.eventName || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="text-gray-400 mt-1" size={20} />
                <div>
                  <div className="text-sm text-gray-500">Event Date</div>
                  <div className="font-medium text-gray-900">
                    {attendee.event?.eventDate
                      ? new Date(attendee.event.eventDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Plus One Information */}
          {attendee.plusOne && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserPlus size={24} />
                Plus One Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="text-gray-400 mt-1" size={20} />
                  <div>
                    <div className="text-sm text-gray-500">Full Name</div>
                    <div className="font-medium text-gray-900">{attendee.plusOne.name}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="text-gray-400 mt-1" size={20} />
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium text-gray-900">{attendee.plusOne.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase className="text-gray-400 mt-1" size={20} />
                  <div>
                    <div className="text-sm text-gray-500">Company</div>
                    <div className="font-medium text-gray-900">{attendee.plusOne.company}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase className="text-gray-400 mt-1" size={20} />
                  <div>
                    <div className="text-sm text-gray-500">Title</div>
                    <div className="font-medium text-gray-900">{attendee.plusOne.title}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500 mb-1">RSVP Status</div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                    attendee.status
                  )}`}
                >
                  {attendee.status}
                </span>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-1">Plus One</div>
                <div className="font-medium text-gray-900">
                  {attendee.plusOne ? 'Yes' : 'No'}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-1">Registered</div>
                <div className="font-medium text-gray-900">
                  {new Date(attendee.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <QrCode size={20} />
              QR Code
            </h2>
            {qrCodeUrl ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src={qrCodeUrl}
                    alt="Attendee QR Code"
                    className="w-48 h-48 border border-gray-200 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <QrCode size={18} />
                    View Full Size
                  </button>
                  <button
                    onClick={handleDownloadQR}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Download size={18} />
                    Download QR Code
                  </button>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  QR Code: {attendee.qrCode}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                QR code not available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && qrCodeUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">QR Code</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <img
                src={qrCodeUrl}
                alt="Attendee QR Code"
                className="w-full max-w-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">
                Registration ID: {attendee.registrationId}
              </div>
              <div className="text-xs text-gray-500 font-mono">
                {attendee.qrCode}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
