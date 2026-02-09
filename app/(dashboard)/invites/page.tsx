'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Mail, Eye, Send, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Invite, Event, InviteType } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

type SortField = 'email' | 'inviteType' | 'createdAt' | 'expiresAt';
type SortOrder = 'asc' | 'desc';
type InviteStatus = 'pending' | 'accepted' | 'expired';

export default function InvitesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredInvites, setFilteredInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InviteStatus | 'ALL'>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<InviteType | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [inviteToResend, setInviteToResend] = useState<{ id: string; email: string } | null>(null);
  const { toasts, closeToast, success, error: showError } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAndSortInvites();
  }, [invites, searchQuery, statusFilter, eventFilter, typeFilter, sortField, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all events first
      const eventsData = await api.get<Event[]>(endpoints.events.list());
      setEvents(eventsData);

      // Fetch invites for all events
      const allInvites: Invite[] = [];
      for (const event of eventsData) {
        try {
          const eventInvites = await api.get<Invite[]>(
            endpoints.invites.list(event.id)
          );
          // Add event info to each invite
          const invitesWithEvent = eventInvites.map(inv => ({
            ...inv,
            event: {
              eventName: event.eventName,
              eventDate: event.eventDate,
            }
          }));
          allInvites.push(...invitesWithEvent);
        } catch (err) {
          console.error(`Failed to fetch invites for event ${event.id}:`, err);
        }
      }
      
      setInvites(allInvites);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getInviteStatus = (invite: Invite): InviteStatus => {
    if (invite.isUsed) return 'accepted';
    if (new Date(invite.expiresAt) < new Date()) return 'expired';
    return 'pending';
  };

  const filterAndSortInvites = () => {
    let filtered = [...invites];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (invite) =>
          invite.email.toLowerCase().includes(query) ||
          invite.token.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((invite) => getInviteStatus(invite) === statusFilter);
    }

    // Apply event filter
    if (eventFilter !== 'ALL') {
      filtered = filtered.filter((invite) => invite.eventId === eventFilter);
    }

    // Apply type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((invite) => invite.inviteType === typeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'createdAt' || sortField === 'expiresAt') {
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

    setFilteredInvites(filtered);
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

  const handleResend = async (inviteId: string, email: string) => {
    setInviteToResend({ id: inviteId, email });
    setResendDialogOpen(true);
  };

  const confirmResend = async () => {
    if (!inviteToResend) return;

    try {
      setResendingId(inviteToResend.id);
      await api.post(endpoints.invites.resend(inviteToResend.id));
      success('Invitation Resent', `Invitation email sent to ${inviteToResend.email}`);
      setResendDialogOpen(false);
      setInviteToResend(null);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      showError('Failed to Resend Invitation', errorMsg);
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyInviteUrl = (token: string) => {
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/rsvp?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    success('Copied!', 'Invite URL copied to clipboard');
    setTimeout(() => setCopiedToken(null), 2000);
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
        return <CheckCircle size={16} />;
      case 'expired':
        return <XCircle size={16} />;
      case 'pending':
        return <Clock size={16} />;
    }
  };

  const getTypeBadgeColor = (type: InviteType): string => {
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
  const totalPages = Math.ceil(filteredInvites.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedInvites = filteredInvites.slice(startIndex, endIndex);

  if (loading) {
    return <LoadingSpinner message="Loading invites..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  return (
    <div className="p-4 md:p-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      <ConfirmDialog
        isOpen={resendDialogOpen}
        onClose={() => {
          setResendDialogOpen(false);
          setInviteToResend(null);
        }}
        onConfirm={confirmResend}
        title="Resend Invitation"
        message={
          <div>
            <p>Resend invitation email to <strong>{inviteToResend?.email}</strong>?</p>
            <p className="mt-2 text-xs">A new invitation email will be sent to this address.</p>
          </div>
        }
        confirmText="Resend"
        cancelText="Cancel"
        variant="info"
        loading={resendingId === inviteToResend?.id}
      />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Invites</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Manage event invitations</p>
        </div>
        <button
          onClick={() => router.push('/invites/new')}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Create Invite</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by email or token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="ALL">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.eventName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InviteStatus | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as InviteType | 'ALL')}
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
            Showing {filteredInvites.length} invite{filteredInvites.length !== 1 ? 's' : ''}
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

      {/* Invites Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  onClick={() => handleSort('email')}
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Email
                    {sortField === 'email' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Event
                </th>
                <th
                  onClick={() => handleSort('inviteType')}
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Type
                    {sortField === 'inviteType' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th
                  onClick={() => handleSort('createdAt')}
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Sent
                    {sortField === 'createdAt' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('expiresAt')}
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Expires
                    {sortField === 'expiresAt' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedInvites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 md:px-6 py-12 text-center text-gray-500 text-sm">
                    {searchQuery || statusFilter !== 'ALL' || eventFilter !== 'ALL' || typeFilter !== 'ALL'
                      ? 'No invites found matching your filters.'
                      : 'No invites yet. Create your first invite!'}
                  </td>
                </tr>
              ) : (
                paginatedInvites.map((invite) => {
                  const status = getInviteStatus(invite);
                  return (
                    <tr key={invite.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs md:text-sm text-gray-900">{invite.email}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-xs md:text-sm text-gray-900">{invite.event?.eventName}</div>
                          <div className="text-xs text-gray-500">
                            {invite.event?.eventDate && new Date(invite.event.eventDate).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(
                            invite.inviteType
                          )}`}
                        >
                          {invite.inviteType}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            status
                          )}`}
                        >
                          {getStatusIcon(status)}
                          {status}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-gray-500 whitespace-nowrap">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-gray-500 whitespace-nowrap">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyInviteUrl(invite.token)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy invite URL"
                          >
                            {copiedToken === invite.token ? (
                              <CheckCircle size={18} className="text-green-600" />
                            ) : (
                              <Copy size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleResend(invite.id, invite.email)}
                            disabled={resendingId === invite.id || status === 'accepted'}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Resend invitation"
                          >
                            {resendingId === invite.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              <Send size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => router.push(`/invites/${invite.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye size={18} />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredInvites.length)} of {filteredInvites.length} invites
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
