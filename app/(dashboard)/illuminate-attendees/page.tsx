'use client';

import { useEffect, useState } from 'react';
import { Search, RefreshCw, Armchair, Loader2, Mail, X, AlertCircle } from 'lucide-react';
import { illuminateApi, getErrorMessage } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

type SortField = 'customerName' | 'customerEmail' | 'status' | 'createdAt' | 'ticketTier';
type SortOrder = 'asc' | 'desc';

interface BookingRow {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  ticketTier: string;
  ticketName: string;
  quantity: number;
  seatNumbers: string[];
  tableNumber: string | null;
  sectionName: string | null;
  status: string;
  totalAmount: number;
  dietaryRestrictions: string | null;
  specialRequests: string | null;
  createdAt: string;
  type: 'MAIN' | 'PLUSONE';
  primaryAttendeeName?: string;
  bookingId?: string;
  checkedIn?: boolean;
  checkedInAt?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONTACTED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function IlluminateAttendeesPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [filtered, setFiltered] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState<string | null>(null);
  const { toasts, closeToast, success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [rows, searchQuery, statusFilter, tierFilter, sortField, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all confirmed + pending ticket bookings (up to 500)
      const data = await illuminateApi.getBookings({ type: 'TICKET', limit: 500 });
      
      const allRows: BookingRow[] = [];
      
      (data.bookings as any[]).forEach((b) => {
        // Add main booking holder
        allRows.push({
          id: b.id,
          customerName: b.customerName,
          customerEmail: b.customerEmail,
          customerPhone: b.customerPhone,
          ticketTier: b.ticketTier || '',
          ticketName: b.ticketName || '',
          quantity: b.quantity,
          seatNumbers: b.seatNumbers || [],
          tableNumber: b.tableNumber || null,
          sectionName: b.sectionName || null,
          status: b.status,
          totalAmount: Number(b.totalAmount),
          dietaryRestrictions: b.dietaryRestrictions || null,
          specialRequests: b.specialRequests || null,
          createdAt: b.createdAt,
          type: 'MAIN',
          bookingId: b.id,
        });
        
        // Add Plus Ones as separate rows
        if (b.plusOnes && b.plusOnes.length > 0) {
          b.plusOnes.forEach((plusOne: any) => {
            allRows.push({
              id: `plusone-${plusOne.id}`,
              customerName: plusOne.name,
              customerEmail: plusOne.email,
              customerPhone: plusOne.phone || '',
              ticketTier: 'Plus One',
              ticketName: 'Plus One Guest',
              quantity: 1,
              seatNumbers: plusOne.seatNumber ? [plusOne.seatNumber] : [],
              tableNumber: b.tableNumber || null,
              sectionName: b.sectionName || null,
              status: b.status,
              totalAmount: 0,
              dietaryRestrictions: plusOne.dietaryRestrictions || null,
              specialRequests: plusOne.specialRequests || null,
              createdAt: b.createdAt,
              type: 'PLUSONE',
              primaryAttendeeName: b.customerName,
              bookingId: b.id,
              checkedIn: plusOne.checkedIn,
              checkedInAt: plusOne.checkedInAt,
            });
          });
        }
      });
      
      setRows(allRows);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...rows];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerEmail.toLowerCase().includes(q) ||
          r.customerPhone.includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.seatNumbers.some((s) => s.toLowerCase().includes(q)),
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (tierFilter !== 'ALL') {
      result = result.filter((r) => r.ticketTier === tierFilter);
    }

    result.sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];
      if (sortField === 'createdAt') {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      } else if (typeof av === 'string') {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
      }
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFiltered(result);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const handleAutoAssign = async (bookingId: string) => {
    setAssigningId(bookingId);
    try {
      const res = await illuminateApi.autoAssignSeats(bookingId);
      showSuccess(res.message || 'Seat assigned and email sent!');
      await fetchData();
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setAssigningId(null);
    }
  };

  const handleResendEmail = async (bookingId: string) => {
    setResendingId(bookingId);
    setShowResendConfirm(null);
    try {
      const res = await illuminateApi.autoAssignSeats(bookingId);
      showSuccess('Email resent successfully!');
      await fetchData();
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setResendingId(null);
    }
  };

  const exportCsv = () => {
    const headers = [
      'Booking ID', 'Name', 'Email', 'Phone', 'Ticket Type', 'Ticket Name',
      'Qty', 'Seat(s)', 'Table', 'Section', 'Status', 'Total Amount',
      'Dietary', 'Special Requests', 'Registered',
    ];
    const csvRows = filtered.map((r) => [
      r.id,
      r.customerName,
      r.customerEmail,
      r.customerPhone,
      r.ticketTier,
      r.ticketName,
      r.quantity,
      r.seatNumbers.join('; '),
      r.tableNumber || '',
      r.sectionName || '',
      r.status,
      r.totalAmount.toFixed(2),
      r.dietaryRestrictions || '',
      r.specialRequests || '',
      new Date(r.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...csvRows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `illuminate-attendees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueTiers = [...new Set(rows.map((r) => r.ticketTier).filter(Boolean))].sort();

  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  const stats = {
    total: rows.length,
    mainAttendees: rows.filter((r) => r.type === 'MAIN').length,
    plusOnes: rows.filter((r) => r.type === 'PLUSONE').length,
    confirmed: rows.filter((r) => r.status === 'CONFIRMED').length,
    pending: rows.filter((r) => r.status === 'PENDING').length,
    seatsAssigned: rows.filter((r) => r.seatNumbers.length > 0).length,
  };

  if (loading) return <LoadingSpinner message="Loading attendees..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Illuminate Attendees</h1>
            <p className="text-gray-500 mt-0.5 text-xs md:text-sm">Confirmed ticket holders for the Illuminate Life Gala</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats - Compact */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-900' },
            { label: 'Main', value: stats.mainAttendees, color: 'text-blue-600' },
            { label: 'Plus Ones', value: stats.plusOnes, color: 'text-purple-600' },
            { label: 'Confirmed', value: stats.confirmed, color: 'text-green-600' },
            { label: 'Seated', value: stats.seatsAssigned, color: 'text-amber-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <p className="text-[10px] text-slate-500 mb-0.5">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 bg-white border-b border-slate-200">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search name, email, phone, booking ID, seat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 min-w-[120px] px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="CONTACTED">Contacted</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="flex-1 min-w-[120px] px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 text-xs"
            >
              <option value="ALL">All Tiers</option>
              {uniqueTiers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="flex-1 min-w-[100px] px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 text-xs"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <div className="flex items-center text-xs text-gray-500 px-2">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 mb-6">
        {paginated.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
            No attendees found
          </div>
        ) : (
          paginated.map((row) => (
            <div
              key={row.id}
              className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-amber-500 p-3 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{row.customerName}</h3>
                    {row.type === 'PLUSONE' && (
                      <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                        Plus One
                      </span>
                    )}
                  </div>
                  {row.type === 'PLUSONE' && row.primaryAttendeeName && (
                    <p className="text-xs text-slate-500 mb-1">Guest of {row.primaryAttendeeName}</p>
                  )}
                  <p className="text-xs text-slate-500 truncate">{row.customerEmail}</p>
                </div>
                <span className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-700'}`}>
                  {row.status}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ticket:</span>
                  <span className="text-slate-900">{row.ticketName || row.ticketTier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Seat(s):</span>
                  <span className="font-medium text-slate-900">
                    {row.seatNumbers.length > 0 ? row.seatNumbers.join(', ') : '—'}
                  </span>
                </div>
                {row.tableNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Table:</span>
                    <span className="text-slate-900">Table {row.tableNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-slate-900">{row.customerPhone}</span>
                </div>
              </div>
              {row.status === 'CONFIRMED' && row.seatNumbers.length === 0 && (
                <button
                  onClick={() => handleAutoAssign(row.id)}
                  disabled={assigningId === row.id}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium disabled:opacity-60"
                >
                  {assigningId === row.id ? (
                    <><Loader2 size={12} className="animate-spin" /> Assigning…</>
                  ) : (
                    <><Armchair size={12} /> Assign Seat & Send Email</>
                  )}
                </button>
              )}
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-700 text-center mb-2">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 text-xs"
              >
                Prev
              </button>
              <span className="px-3 py-1 bg-amber-600 text-white rounded-md text-xs font-medium">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table - Scrollable */}
      <div className="flex-1 overflow-hidden px-4 md:px-6 pb-4">
        <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase whitespace-nowrap tracking-wider">
                    Booking ID
                  </th>
                  <th
                    onClick={() => handleSort('customerName')}
                    className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase cursor-pointer hover:bg-[#2a2a2a] whitespace-nowrap tracking-wider transition-colors"
                  >
                    Name {sortField === 'customerName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('customerEmail')}
                    className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase cursor-pointer hover:bg-[#2a2a2a] whitespace-nowrap tracking-wider transition-colors"
                  >
                    Email {sortField === 'customerEmail' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase whitespace-nowrap tracking-wider">
                    Phone
                  </th>
                  <th
                    onClick={() => handleSort('ticketTier')}
                    className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase cursor-pointer hover:bg-[#2a2a2a] whitespace-nowrap tracking-wider transition-colors"
                  >
                    Ticket {sortField === 'ticketTier' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase whitespace-nowrap tracking-wider">
                    Seat(s)
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase whitespace-nowrap tracking-wider">
                    Table
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase cursor-pointer hover:bg-[#2a2a2a] whitespace-nowrap tracking-wider transition-colors"
                  >
                    Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase whitespace-nowrap tracking-wider">
                    Amount
                  </th>
                  <th
                    onClick={() => handleSort('createdAt')}
                    className="px-6 py-4 text-left text-xs font-semibold text-[#c9a84c] uppercase cursor-pointer hover:bg-[#2a2a2a] whitespace-nowrap tracking-wider transition-colors"
                  >
                    Registered {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-[#c9a84c] uppercase whitespace-nowrap tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-slate-500 text-sm">
                      No attendees found
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {row.id.slice(0, 8)}…
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                          {row.customerName}
                          {row.type === 'PLUSONE' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                              Plus One
                            </span>
                          )}
                        </div>
                        {row.type === 'PLUSONE' && row.primaryAttendeeName && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Guest of {row.primaryAttendeeName}
                          </div>
                        )}
                        {row.dietaryRestrictions && (
                          <div className="text-xs text-amber-600 mt-0.5">
                            🍽 {row.dietaryRestrictions}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.customerEmail}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {row.customerPhone}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{row.ticketName || row.ticketTier}</div>
                        {row.quantity > 1 && (
                          <div className="text-xs text-slate-500 mt-0.5">×{row.quantity}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.seatNumbers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.seatNumbers.map((s) => (
                              <span
                                key={s}
                                className="px-2.5 py-1 bg-[#c9a84c] text-white rounded text-xs font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {row.tableNumber ? `Table ${row.tableNumber}` : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 whitespace-nowrap">
                        ${row.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span>{new Date(row.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: '2-digit',
                          })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {row.status === 'CONFIRMED' && row.seatNumbers.length === 0 && (
                            <button
                              onClick={() => handleAutoAssign(row.bookingId || row.id)}
                              disabled={assigningId === (row.bookingId || row.id)}
                              title="Auto-assign seat and send confirmation email"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#c9a84c] hover:bg-[#b8973b] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {assigningId === (row.bookingId || row.id) ? (
                                <><Loader2 size={12} className="animate-spin" /> Assigning…</>
                              ) : (
                                <><Armchair size={12} /> Assign Seat</>
                              )}
                            </button>
                          )}
                          {row.seatNumbers.length > 0 && (
                            <button
                              onClick={() => setShowResendConfirm(row.bookingId || row.id)}
                              disabled={resendingId === (row.bookingId || row.id)}
                              title="Resend confirmation email"
                              className="inline-flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-60"
                            >
                              {resendingId === (row.bookingId || row.id) ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Mail size={16} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="text-sm text-slate-700">
                Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)} of{' '}
                {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-[#0a0a0a] text-white border border-[#0a0a0a]'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0a0a0a] border border-[#0a0a0a] rounded-lg hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resend Email Confirmation Modal */}
      {showResendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mx-auto mb-4">
                <Mail className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 text-center mb-2">Resend Confirmation Email?</h2>
              <p className="text-sm text-slate-600 text-center mb-6">
                This will resend the confirmation email with seat assignment and QR code to the attendee.
              </p>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowResendConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResendEmail(showResendConfirm)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Resend Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
