'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Search,
  Upload,
  Edit,
  CheckCircle,
  XCircle,
  Globe,
  Mail,
  Phone,
  Star,
  Loader2,
  AlertCircle,
  Save,
  X,
  MessageSquare,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import { illuminateApi, getErrorMessage } from '@/lib/api';
import type { Sponsor } from '@/lib/types';

const STATUS_OPTIONS = ['INQUIRY', 'NEGOTIATING', 'CONFIRMED', 'ACTIVE', 'INACTIVE'] as const;

// ── Confirmation dialog ──────────────────────────────────────────────────────
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | typeof STATUS_OPTIONS[number]>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadSponsors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters: any = { page, limit: 20 };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (searchQuery) filters.search = searchQuery;
      const data = await illuminateApi.getSponsors(filters);
      setSponsors(data.sponsors);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => { loadSponsors(); }, [loadSponsors]);

  const stats = {
    total: sponsors.length,
    active: sponsors.filter((s) => s.status === 'ACTIVE').length,
    pending: sponsors.filter((s) => s.status === 'INQUIRY' || s.status === 'NEGOTIATING').length,
    revenue: sponsors
      .filter((s) => s.status === 'ACTIVE' || s.status === 'CONFIRMED')
      .reduce((sum, s) => {
        // Extract amount from tier string (e.g., "Beacon Gold — $25,000" -> 25000)
        const match = s.tier?.match(/\$([0-9,]+)/);
        if (match) {
          return sum + parseInt(match[1].replace(/,/g, ''), 10);
        }
        return sum;
      }, 0),
  };

  if (loading && sponsors.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading sponsors...</p>
        </div>
      </div>
    );
  }

  if (error && sponsors.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-slate-900 font-semibold mb-2">Failed to load sponsors</p>
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={loadSponsors} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Sponsor Management</h3>
        <p className="text-sm text-slate-500 mt-1">Manage sponsor inquiries and partnerships</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sponsors', value: stats.total, icon: <Building2 className="w-8 h-8 text-blue-500" />, color: 'text-slate-900' },
          { label: 'Active', value: stats.active, icon: <CheckCircle className="w-8 h-8 text-green-500" />, color: 'text-green-600' },
          { label: 'Pending', value: stats.pending, icon: <Star className="w-8 h-8 text-orange-500" />, color: 'text-orange-600' },
          { label: 'Revenue', value: `$${stats.revenue.toLocaleString()}`, icon: <Briefcase className="w-8 h-8 text-purple-500" />, color: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sponsors..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sponsors.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No sponsors found</h3>
            <p className="text-slate-500">Try adjusting your filters</p>
          </div>
        ) : (
          sponsors.map((sponsor) => (
            <SponsorCard
              key={sponsor.id}
              sponsor={sponsor}
              onRefresh={loadSponsors}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50">
            Previous
          </button>
          <span className="px-4 py-2 text-slate-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sponsor Card ──────────────────────────────────────────────────────────────
function SponsorCard({ sponsor, onRefresh }: { sponsor: Sponsor; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editWebsite, setEditWebsite] = useState(sponsor.websiteUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  // Local logo preview — starts from what the server has, updates instantly on upload
  const [localLogoUrl, setLocalLogoUrl] = useState<string | undefined>(sponsor.logoUrl);

  // Confirmation dialogs
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteLogo, setConfirmDeleteLogo] = useState(false);

  // Pull org + message from the nested booking relation
  const organization = (sponsor as any).booking?.companyName ?? sponsor.companyName;
  const message = (sponsor as any).booking?.message;

  const hasLogo = !!localLogoUrl;
  const isConfirmedOrActive = sponsor.status === 'CONFIRMED' || sponsor.status === 'ACTIVE';
  const canUploadLogo = isConfirmedOrActive;

  const statusColor = {
    INQUIRY: 'bg-blue-100 text-blue-700',
    NEGOTIATING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-purple-100 text-purple-700',
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-slate-100 text-slate-700',
  }[sponsor.status] ?? 'bg-slate-100 text-slate-700';

  const handleSave = async () => {
    setSaving(true);
    try {
      await illuminateApi.updateSponsor(sponsor.id, {
        websiteUrl: editWebsite || undefined,
      });
      setEditing(false);
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLogo = async () => {
    setDeletingLogo(true);
    try {
      await illuminateApi.updateSponsor(sponsor.id, { logoUrl: '' });
      setLocalLogoUrl(undefined);
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setDeletingLogo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if sponsor is confirmed
    if (!canUploadLogo) {
      alert('Please confirm this sponsor before uploading a logo. Click the "Confirm" button first.');
      return;
    }

    // Show instant local preview from the selected file
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setLocalLogoUrl(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const result = await illuminateApi.uploadSponsorLogo(sponsor.id, file);
      // Update preview with the URL stored by the server (base64 data URL)
      if (result?.logoUrl) {
        setLocalLogoUrl(result.logoUrl);
      }
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
      // Revert preview on failure
      setLocalLogoUrl(sponsor.logoUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleApproveConfirmed = async () => {
    setConfirmApprove(false);
    try {
      await illuminateApi.updateSponsor(sponsor.id, { status: 'ACTIVE', isActive: true });
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteConfirmed = async () => {
    setConfirmDelete(false);
    try {
      await illuminateApi.deleteSponsor(sponsor.id);
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <>
      {/* Approve confirmation */}
      {confirmApprove && (
        <ConfirmDialog
          title="Approve Sponsor"
          message={`Approve ${sponsor.companyName} as an ACTIVE sponsor? Their logo will appear on the public website.`}
          confirmLabel="Yes, Approve"
          confirmClass="bg-green-600 hover:bg-green-700"
          onConfirm={handleApproveConfirmed}
          onCancel={() => setConfirmApprove(false)}
        />
      )}

      {/* Delete logo confirmation */}
      {confirmDeleteLogo && (
        <ConfirmDialog
          title="Delete Logo"
          message={`Remove the logo for ${sponsor.companyName}? You can upload a new one at any time.`}
          confirmLabel="Yes, Delete Logo"
          confirmClass="bg-orange-600 hover:bg-orange-700"
          onConfirm={async () => {
            setConfirmDeleteLogo(false);
            setDeletingLogo(true);
            try {
              await illuminateApi.updateSponsor(sponsor.id, { logoUrl: '' });
              setLocalLogoUrl(undefined);
              onRefresh();
            } catch (err) {
              alert(getErrorMessage(err));
            } finally {
              setDeletingLogo(false);
            }
          }}
          onCancel={() => setConfirmDeleteLogo(false)}
        />
      )}

      {/* Delete sponsor confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          title="Remove Sponsor"
          message={`Are you sure you want to permanently remove ${sponsor.companyName}? This cannot be undone.`}
          confirmLabel="Yes, Remove"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div className="bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all">
        <div className="p-6">

          {/* Logo + name header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                {localLogoUrl ? (
                  <img src={localLogoUrl} alt={sponsor.companyName} className="w-full h-full object-contain p-1" />
                ) : (
                  <Building2 className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{sponsor.companyName}</h3>
                <p className="text-sm text-slate-500">{sponsor.tier}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${statusColor}`}>
                  {sponsor.status}
                </span>
              </div>
            </div>
            {sponsor.isActive && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex-shrink-0">
                <CheckCircle className="w-3 h-3" />
                Active
              </div>
            )}
          </div>

          {/* Contact + extra fields */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">{sponsor.contactEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">{sponsor.contactPhone}</span>
            </div>
            {organization && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-600">{organization}</span>
              </div>
            )}
            {sponsor.websiteUrl && !editing && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate">
                  {sponsor.websiteUrl}
                </a>
              </div>
            )}
          </div>

          {/* Message from inquiry */}
          {message && !editing && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Message</p>
              </div>
              <p className="text-sm text-amber-900">{message}</p>
            </div>
          )}

          {/* Actions */}

          {/* Warning when not confirmed yet */}
          {!isConfirmedOrActive && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">Confirm this sponsor before uploading a logo.</p>
            </div>
          )}

          {/* No-logo warning when confirmed but no logo */}
          {isConfirmedOrActive && !hasLogo && sponsor.status !== 'ACTIVE' && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-700">Upload a logo before approving this sponsor.</p>
            </div>
          )}

          {/* Edit panel — website URL only */}
          {editing && (
            <div className="mb-4 space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Website URL</label>
                <input type="url" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button onClick={() => setEditing(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium">
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                {/* Upload / Edit logo - disabled until confirmed */}
                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  canUploadLogo
                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading…' : hasLogo ? 'Edit Logo' : 'Upload Logo'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleLogoUpload} 
                    disabled={uploading || !canUploadLogo}
                  />
                </label>

                {/* Delete logo — 2-step, only shown when a logo exists */}
                {hasLogo && (
                  <button
                    onClick={() => setConfirmDeleteLogo(true)}
                    disabled={deletingLogo}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 text-sm font-medium disabled:opacity-60"
                    title="Delete logo"
                  >
                    {deletingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  </button>
                )}

                {/* Edit website */}
                <button onClick={() => setEditing(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-medium">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>

                {/* Confirm sponsor - before ACTIVE */}
                {(sponsor.status === 'INQUIRY' || sponsor.status === 'NEGOTIATING') && (
                  <button
                    onClick={async () => {
                      try {
                        await illuminateApi.updateSponsor(sponsor.id, { status: 'CONFIRMED' });
                        onRefresh();
                      } catch (err) {
                        alert(getErrorMessage(err));
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 text-sm font-medium"
                    title="Confirm sponsor (allows logo upload)"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm
                  </button>
                )}

                {/* Approve — blocked without logo, only for CONFIRMED sponsors */}
                {sponsor.status === 'CONFIRMED' && (
                  <button
                    onClick={() => {
                      if (!hasLogo) {
                        alert('Please upload a logo before approving this sponsor.');
                        return;
                      }
                      setConfirmApprove(true);
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      hasLogo
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    title={hasLogo ? 'Approve sponsor (make live)' : 'Upload a logo first'}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                )}

                {/* Delete sponsor */}
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                  title="Remove sponsor">
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
