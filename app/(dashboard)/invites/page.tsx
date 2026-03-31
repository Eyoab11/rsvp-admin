'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Mail, Eye, Send, Copy, CheckCircle, XCircle, Clock, Pencil, Trash2, UserPlus } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Invite, Event, PlusOne, Attendee } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

type SortField = 'email' | 'createdAt' | 'expiresAt';
type SortOrder = 'asc' | 'desc';
type InviteStatus = 'pending' | 'accepted' | 'expired';

interface EditInviteForm {
  email: string;
  expiresAt: string;
}

interface PlusOneForm {
  name: string;
  company: string;
  title: string;
  email: string;
}

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
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Resend dialog
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [inviteToResend, setInviteToResend] = useState<{ id: string; email: string } | null>(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<Invite | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inviteToEdit, setInviteToEdit] = useState<Invite | null>(null);
  const [editForm, setEditForm] = useState<EditInviteForm>({ email: '', expiresAt: '' });
  const [saving, setSaving] = useState(false);

  // Plus one modal
  const [plusOneModalOpen, setPlusOneModalOpen] = useState(false);
  const [inviteForPlusOne, setInviteForPlusOne] = useState<Invite | null>(null);
  const [plusOneForm, setPlusOneForm] = useState<PlusOneForm>({ name: '', company: '', title: '', email: '' });
  const [savingPlusOne, setSavingPlusOne] = useState(false);

  // Edit plus one modal
  const [editPlusOneModalOpen, setEditPlusOneModalOpen] = useState(false);
  const [plusOneToEdit, setPlusOneToEdit] = useState<PlusOne | null>(null);
  const [editPlusOneForm, setEditPlusOneForm] = useState<PlusOneForm>({ name: '', company: '', title: '', email: '' });
  const [savingEditPlusOne, setSavingEditPlusOne] = useState(false);

  // Delete plus one dialog
  const [deletePlusOneDialogOpen, setDeletePlusOneDialogOpen] = useState(false);
  const [plusOneToDelete, setPlusOneToDelete] = useState<{ id: string; name: string; attendeeId: string } | null>(null);
  const [deletingPlusOne, setDeletingPlusOne] = useState(false);

  const { toasts, closeToast, success, error: showError } = useToast();

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { filterAndSortInvites(); }, [invites, searchQuery, statusFilter, eventFilter, sortField, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const eventsData = await api.get<Event[]>(endpoints.events.list());
      setEvents(eventsData);
      const allInvites: Invite[] = [];
      for (const event of eventsData) {
        try {
          const eventInvites = await api.get<Invite[]>(endpoints.invites.list(event.id));
          allInvites.push(...eventInvites.map(inv => ({
            ...inv,
            event: { eventName: event.eventName, eventDate: event.eventDate },
          })));
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
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv => inv.email.toLowerCase().includes(query) || inv.token.toLowerCase().includes(query));
    }
    if (statusFilter !== 'ALL') filtered = filtered.filter(inv => getInviteStatus(inv) === statusFilter);
    if (eventFilter !== 'ALL') filtered = filtered.filter(inv => inv.eventId === eventFilter);
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
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const handleResend = (inviteId: string, email: string) => {
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
      showError('Failed to Resend', getErrorMessage(err));
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyInviteUrl = (token: string) => {
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    navigator.clipboard.writeText(`${frontendUrl}/rsvp?token=${token}`);
    setCopiedToken(token);
    success('Copied!', 'Invite URL copied to clipboard');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // --- Edit ---
  const handleEdit = (invite: Invite) => {
    setInviteToEdit(invite);
    setEditForm({
      email: invite.email,
      expiresAt: new Date(invite.expiresAt).toISOString().slice(0, 10),
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!inviteToEdit) return;
    setSaving(true);
    try {
      await api.patch(endpoints.invites.update(inviteToEdit.id), {
        email: editForm.email,
        expiresAt: new Date(editForm.expiresAt).toISOString(),
      });
      success('Invite Updated', 'Invite details saved successfully');
      setEditModalOpen(false);
      setInviteToEdit(null);
      await fetchData();
    } catch (err) {
      showError('Update Failed', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // --- Delete invite ---
  const handleDelete = (invite: Invite) => {
    setInviteToDelete(invite);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!inviteToDelete) return;
    setDeleting(true);
    try {
      await api.delete(endpoints.invites.delete(inviteToDelete.id));
      success('Invite Deleted', `Invite for ${inviteToDelete.email} has been deleted`);
      setDeleteDialogOpen(false);
      setInviteToDelete(null);
      setInvites(prev => prev.filter(i => i.id !== inviteToDelete.id));
    } catch (err) {
      showError('Delete Failed', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // --- Plus one ---
  const handleAddPlusOne = (invite: Invite) => {
    setInviteForPlusOne(invite);
    setPlusOneForm({ name: '', company: '', title: '', email: '' });
    setPlusOneModalOpen(true);
  };

  const handleSavePlusOne = async () => {
    if (!inviteForPlusOne?.attendee?.id) return;
    setSavingPlusOne(true);
    try {
      await api.post(endpoints.plusOnes.add(inviteForPlusOne.attendee.id), plusOneForm);
      success('Plus One Added', `${plusOneForm.name} has been added as a plus one`);
      setPlusOneModalOpen(false);
      setInviteForPlusOne(null);
      await fetchData();
    } catch (err) {
      showError('Failed to Add Plus One', getErrorMessage(err));
    } finally {
      setSavingPlusOne(false);
    }
  };

  const handleDeletePlusOne = (plusOne: PlusOne) => {
    setPlusOneToDelete({ id: plusOne.id, name: plusOne.name, attendeeId: plusOne.attendeeId });
    setDeletePlusOneDialogOpen(true);
  };

  const confirmDeletePlusOne = async () => {
    if (!plusOneToDelete) return;
    setDeletingPlusOne(true);
    try {
      await api.delete(endpoints.plusOnes.delete(plusOneToDelete.id));
      success('Plus One Removed', `${plusOneToDelete.name} has been removed`);
      setDeletePlusOneDialogOpen(false);
      setPlusOneToDelete(null);
      await fetchData();
    } catch (err) {
      showError('Failed to Remove Plus One', getErrorMessage(err));
    } finally {
      setDeletingPlusOne(false);
    }
  };

  const handleEditPlusOne = (plusOne: PlusOne) => {
    setPlusOneToEdit(plusOne);
    setEditPlusOneForm({ name: plusOne.name, company: plusOne.company, title: plusOne.title, email: plusOne.email });
    setEditPlusOneModalOpen(true);
  };

  const handleSaveEditPlusOne = async () => {
    if (!plusOneToEdit) return;
    setSavingEditPlusOne(true);
    try {
      await api.patch(endpoints.plusOnes.update(plusOneToEdit.id), editPlusOneForm);
      success('Plus One Updated', `${editPlusOneForm.name}'s details have been saved`);
      setEditPlusOneModalOpen(false);
      setPlusOneToEdit(null);
      await fetchData();
    } catch (err) {
      showError('Update Failed', getErrorMessage(err));
    } finally {
      setSavingEditPlusOne(false);
    }
  };

  const getStatusBadgeColor = (status: InviteStatus): string => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: InviteStatus) => {
    switch (status) {
      case 'accepted': return <CheckCircle size={16} />;
      case 'expired': return <XCircle size={16} />;
      case 'pending': return <Clock size={16} />;
    }
  };

  const totalPages = Math.ceil(filteredInvites.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInvites = filteredInvites.slice(startIndex, startIndex + pageSize);

  if (loading) return <LoadingSpinner message="Loading invites..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return (
    <div className="p-4 md:p-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Resend Dialog */}
      <ConfirmDialog
        isOpen={resendDialogOpen}
        onClose={() => { setResendDialogOpen(false); setInviteToResend(null); }}
        onConfirm={confirmResend}
        title="Resend Invitation"
        message={<div><p>Resend invitation email to <strong>{inviteToResend?.email}</strong>?</p></div>}
        confirmText="Resend"
        cancelText="Cancel"
        variant="info"
        loading={resendingId === inviteToResend?.id}
      />

      {/* Delete Invite Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setInviteToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete Invite"
        message={
          <div>
            <p>Delete the invite for <strong>{inviteToDelete?.email}</strong>?</p>
            {inviteToDelete?.isUsed && (
              <p className="mt-2 text-xs text-red-600">This invite has been used. Deleting it will also remove the attendee registration and free up their capacity slot.</p>
            )}
            <p className="mt-2 text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />

      {/* Delete Plus One Dialog */}
      <ConfirmDialog
        isOpen={deletePlusOneDialogOpen}
        onClose={() => { setDeletePlusOneDialogOpen(false); setPlusOneToDelete(null); }}
        onConfirm={confirmDeletePlusOne}
        title="Remove Plus One"
        message={<p>Remove <strong>{plusOneToDelete?.name}</strong> as a plus one? This will free up one capacity slot.</p>}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        loading={deletingPlusOne}
      />

      {/* Edit Invite Modal */}
      {editModalOpen && inviteToEdit && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Edit Invite</h2>
              <p className="text-sm text-gray-500 mt-1">{inviteToEdit.email}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={inviteToEdit.isUsed}
                />
                {inviteToEdit.isUsed && <p className="text-xs text-gray-400 mt-1">Email cannot be changed on a used invite</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editForm.expiresAt}
                  onChange={e => setEditForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Plus one section if invite is accepted */}
              {inviteToEdit.isUsed && inviteToEdit.attendee && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Plus One</h3>
                    {!inviteToEdit.attendee.plusOne && (
                      <button
                        onClick={() => { setEditModalOpen(false); handleAddPlusOne(inviteToEdit); }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <UserPlus size={14} /> Add Plus One
                      </button>
                    )}
                  </div>
                  {inviteToEdit.attendee.plusOne ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inviteToEdit.attendee.plusOne.name}</p>
                        <p className="text-xs text-gray-500">{inviteToEdit.attendee.plusOne.email}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditModalOpen(false); handleEditPlusOne(inviteToEdit.attendee!.plusOne!); }}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit plus one"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeletePlusOne(inviteToEdit.attendee!.plusOne!)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove plus one"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No plus one registered</p>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setEditModalOpen(false); setInviteToEdit(null); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Plus One Modal */}
      {plusOneModalOpen && inviteForPlusOne && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Plus One</h2>
              <p className="text-sm text-gray-500 mt-1">For {inviteForPlusOne.attendee?.name || inviteForPlusOne.email}</p>
            </div>
            <div className="p-6 space-y-4">
              {(['name', 'email', 'company', 'title'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={plusOneForm[field]}
                    onChange={e => setPlusOneForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={`Enter ${field}`}
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setPlusOneModalOpen(false); setInviteForPlusOne(null); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlusOne}
                disabled={savingPlusOne || !plusOneForm.name || !plusOneForm.email}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingPlusOne && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />}
                Add Plus One
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plus One Modal */}
      {editPlusOneModalOpen && plusOneToEdit && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Edit Plus One</h2>
              <p className="text-sm text-gray-500 mt-1">{plusOneToEdit.name}</p>
            </div>
            <div className="p-6 space-y-4">
              {(['name', 'email', 'company', 'title'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={editPlusOneForm[field]}
                    onChange={e => setEditPlusOneForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setEditPlusOneModalOpen(false); setPlusOneToEdit(null); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditPlusOne}
                disabled={savingEditPlusOne || !editPlusOneForm.name || !editPlusOneForm.email}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingEditPlusOne && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by email or token..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
            <option value="ALL">All Events</option>
            {events.map(event => <option key={event.id} value={event.id}>{event.eventName}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as InviteStatus | 'ALL')} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
            <option value="ALL">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">Showing {filteredInvites.length} invite{filteredInvites.length !== 1 ? 's' : ''}</div>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
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
                <th onClick={() => handleSort('email')} className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap">
                  <div className="flex items-center gap-2">Email {sortField === 'email' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Event</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Plus One</th>
                <th onClick={() => handleSort('createdAt')} className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap">
                  <div className="flex items-center gap-2">Sent {sortField === 'createdAt' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                </th>
                <th onClick={() => handleSort('expiresAt')} className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap">
                  <div className="flex items-center gap-2">Expires {sortField === 'expiresAt' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                </th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedInvites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 md:px-6 py-12 text-center text-gray-500 text-sm">
                    {searchQuery || statusFilter !== 'ALL' || eventFilter !== 'ALL' ? 'No invites found matching your filters.' : 'No invites yet. Create your first invite!'}
                  </td>
                </tr>
              ) : (
                paginatedInvites.map(invite => {
                  const status = getInviteStatus(invite);
                  const attendee = (invite as any).attendee as Attendee | null | undefined;
                  const plusOne = attendee?.plusOne;
                  return (
                    <tr key={invite.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs md:text-sm text-gray-900">{invite.email}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs md:text-sm text-gray-900">{invite.event?.eventName}</div>
                        <div className="text-xs text-gray-500">{invite.event?.eventDate && new Date(invite.event.eventDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(status)}`}>
                          {getStatusIcon(status)}{status}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        {status === 'accepted' && (
                          plusOne ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-700">{plusOne.name}</span>
                              <button onClick={() => handleEditPlusOne(plusOne)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit plus one">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => handleDeletePlusOne(plusOne)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove plus one">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleAddPlusOne(invite)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                              <UserPlus size={13} /> Add
                            </button>
                          )
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-gray-500 whitespace-nowrap">{new Date(invite.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-gray-500 whitespace-nowrap">{new Date(invite.expiresAt).toLocaleDateString()}</td>
                      <td className="px-4 md:px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleCopyInviteUrl(invite.token)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Copy invite URL">
                            {copiedToken === invite.token ? <CheckCircle size={18} className="text-green-600" /> : <Copy size={18} />}
                          </button>
                          <button onClick={() => handleResend(invite.id, invite.email)} disabled={resendingId === invite.id || status === 'accepted'} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Resend invitation">
                            {resendingId === invite.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" /> : <Send size={18} />}
                          </button>
                          <button onClick={() => handleEdit(invite)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Edit invite">
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => router.push(`/invites/${invite.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View details">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => handleDelete(invite)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete invite">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredInvites.length)} of {filteredInvites.length} invites</div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm">Previous</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded-lg text-sm ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>{page}</button>
                );
              })}
              <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

