'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Mail, Calendar, Clock, CheckCircle, XCircle, Copy, Send, Download, ExternalLink } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Invite } from '@/lib/types';

type InviteStatus = 'pending' | 'accepted' | 'expired';

export default function InviteDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const inviteId = params.id as string;

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchInviteDetails();
  }, [inviteId]);

  const fetchInviteDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all events to find the invite
      const events = await api.get<any[]>(endpoints.events.list());
      
      let foundInvite: Invite | null = null;
      for (const event of events) {
        try {
          const invites = await api.get<Invite[]>(endpoints.invites.list(event.id));
          const invite = invites.find(inv => inv.id === inviteId);
          if (invite) {
            foundInvite = {
              ...invite,
              event: {
                eventName: event.eventName,
                eventDate: event.eventDate,
              }
            };
            break;
          }
        } catch (err) {
          console.error(`Failed to fetch invites for event ${event.id}:`, err);
        }
      }

      if (!foundInvite) {
        setError('Invite not found');
        return;
      }

      setInvite(foundInvite);

      // Fetch QR code if invite is used (has attendee)
      if (foundInvite.isUsed && foundInvite.attendee) {
        try {
          const qrData = await api.get<{ qrCode: string }>(
            endpoints.qr.attendee(foundInvite.attendee.id)
          );
          setQrCodeUrl(qrData.qrCode);
        } catch (err) {
          console.error('Failed to fetch QR code:', err);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getInviteStatus = (): InviteStatus => {
    if (!invite) return 'pending';
    if (invite.isUsed) return 'accepted';
    if (new Date(invite.expiresAt) < new Date()) return 'expired';
    return 'pending';
  };

  const handleResend = async () => {
    if (!invite) return;

    if (!confirm(`Resend invitation to ${invite.email}?`)) {
      return;
    }

    try {
      setResending(true);
      await api.post(endpoints.invites.resend(invite.id));
      alert('Invitation email resent successfully!');
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const handleCopyUrl = () => {
    if (!invite) return;
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/rsvp?token=${invite.token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyToken = () => {
    if (!invite) return;
    navigator.clipboard.writeText(invite.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-code-${invite?.email}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInviteUrl = () => {
    if (!invite) return;
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/rsvp?token=${invite.token}`;
    window.open(inviteUrl, '_blank');
  };

  const getStatusBadgeColor = (status: InviteStatus): string => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: InviteStatus) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={20} />;
      case 'expired':
        return <XCircle size={20} />;
      case 'pending':
        return <Clock size={20} />;
    }
  };

  const getTypeBadgeColor = (type: string): string => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error || 'Invite not found'}
        </div>
        <button
          onClick={() => router.push('/invites')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={20} />
          Back to Invites
        </button>
      </div>
    );
  }

  const status = getInviteStatus();
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
  const inviteUrl = `${frontendUrl}/rsvp?token=${invite.token}`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/invites')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Invites
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invite Details</h1>
            <p className="text-gray-600 mt-1">{invite.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeColor(
                status
              )}`}
            >
              {getStatusIcon(status)}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invite Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-900">{invite.email}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Invite Type</label>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeBadgeColor(
                      invite.inviteType
                    )}`}
                  >
                    {invite.inviteType}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Sent Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-900">
                      {new Date(invite.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Expires</label>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-gray-900">
                      {new Date(invite.expiresAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {invite.event && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Event</label>
                  <div>
                    <div className="text-gray-900 font-medium">{invite.event.eventName}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(invite.event.eventDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Invite URL */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite URL</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">RSVP Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUrl}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Copy URL"
                  >
                    {copiedUrl ? <CheckCircle size={20} className="text-green-600" /> : <Copy size={20} />}
                  </button>
                  <button
                    onClick={handleOpenInviteUrl}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Token</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invite.token}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyToken}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Copy token"
                  >
                    {copiedToken ? <CheckCircle size={20} className="text-green-600" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Attendee Information (if accepted) */}
          {invite.attendee && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendee Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                  <span className="text-gray-900">{invite.attendee.name}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Company</label>
                  <span className="text-gray-900">{invite.attendee.company}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Title</label>
                  <span className="text-gray-900">{invite.attendee.title}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Registration ID</label>
                  <span className="text-gray-900 font-mono">{invite.attendee.registrationId}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      invite.attendee.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-800'
                        : invite.attendee.status === 'WAITLISTED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {invite.attendee.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={resending || status === 'accepted'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Resend Invitation
                  </>
                )}
              </button>
              {status === 'accepted' && (
                <p className="text-xs text-gray-500 text-center">
                  This invite has been accepted and cannot be resent
                </p>
              )}
            </div>
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code</h2>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-48 h-48 border border-gray-200 rounded-lg"
                  />
                </div>
                <button
                  onClick={handleDownloadQR}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download size={20} />
                  Download QR Code
                </button>
                <p className="text-xs text-gray-500 text-center">
                  Use this QR code for event check-in
                </p>
              </div>
            </div>
          )}

          {/* Status Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Used</span>
                <span className={`font-medium ${invite.isUsed ? 'text-green-600' : 'text-gray-900'}`}>
                  {invite.isUsed ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Expired</span>
                <span className={`font-medium ${status === 'expired' ? 'text-red-600' : 'text-gray-900'}`}>
                  {status === 'expired' ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Days Until Expiration</span>
                <span className="font-medium text-gray-900">
                  {Math.max(
                    0,
                    Math.ceil((new Date(invite.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
