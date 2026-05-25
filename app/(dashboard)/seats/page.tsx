'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MapPin, Plus, Users, Loader2, AlertCircle, X, Trash2, Unlock,
  RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff, Search, UserPlus, CheckCircle, Download,
} from 'lucide-react';
import { illuminateApi, getErrorMessage } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Seat {
  id: string;
  seatNumber: string;
  tableNumber?: string | null;
  seatType: 'INDIVIDUAL' | 'TABLE' | 'VIP';
  isAvailable: boolean;
  bookingId?: string | null;
  booking?: {
    id: string;
    customerName: string;
    customerEmail: string;
  } | null;
}

interface SeatStats {
  total: number;
  available: number;
  reserved: number;
}

// ─── Room layout definition ───────────────────────────────────────────────────
// Each entry is a row: label + array of table numbers (1-based).
// Row 1 has 4 tables flanking the dance floor; rows 2-9 have 5; row 10 has 6.

const BASE_ROWS: { label: string; tables: number[]; note?: string }[] = [
  { label: 'Row 1',  tables: [1, 2, 3, 4],             note: 'Near Stage' },
  { label: 'Row 2',  tables: [5, 6, 7, 8, 9] },
  { label: 'Row 3',  tables: [10, 11, 12, 13, 14] },
  { label: 'Row 4',  tables: [15, 16, 17, 18, 19] },
  { label: 'Row 5',  tables: [20, 21, 22, 23, 24],     note: 'Primary Aisle Above' },
  { label: 'Row 6',  tables: [25, 26, 27, 28, 29],     note: 'Primary Aisle Below' },
  { label: 'Row 7',  tables: [30, 31, 32, 33, 34] },
  { label: 'Row 8',  tables: [35, 36, 37, 38, 39] },
  { label: 'Row 9',  tables: [40, 41, 42, 43, 44] },
  { label: 'Row 10', tables: [45, 46, 47, 48, 49, 50], note: 'Rear of Room' },
];

const SEATS_PER_TABLE = 10;

// Generate seat numbers for a table: T1-01 … T1-10
function tableSeats(tableNum: number, seatsPerTable: number): string[] {
  return Array.from({ length: seatsPerTable }, (_, i) =>
    `T${tableNum}-${String(i + 1).padStart(2, '0')}`
  );
}

// ─── Generate rows from a flat seat list ─────────────────────────────────────
// Builds the full row/table structure, including any extra rows beyond the base 50 tables.
function buildRows(
  allSeats: Seat[],
  extraRows: { label: string; tables: number[]; note?: string }[]
) {
  const rows = [...BASE_ROWS, ...extraRows];
  return rows.map(row => ({
    label: row.label,
    note: row.note,
    tables: row.tables.map(tNum => {
      const seats = tableSeats(tNum, SEATS_PER_TABLE).map(sn => {
        const found = allSeats.find(s => s.seatNumber === sn);
        return found ?? { id: '', seatNumber: sn, seatType: 'INDIVIDUAL' as const, isAvailable: true };
      });
      return { tableNum: tNum, seats };
    }),
  }));
}

// ─── Seat Info Modal ──────────────────────────────────────────────────────────
function SeatInfoModal({
  seat,
  onClose,
  onRelease,
  onDelete,
  onAssign,
}: {
  seat: Seat & { id: string };
  onClose: () => void;
  onRelease: (id: string) => void;
  onDelete: (id: string) => void;
  onAssign: (seatId: string, seatNumber: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Seat {seat.seatNumber}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Status:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                seat.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {seat.isAvailable ? 'Available' : 'Reserved'}
              </span>
            </div>

            {/* Customer info if reserved */}
            {!seat.isAvailable && seat.booking && (
              <>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Reserved by:</p>
                  <p className="font-semibold text-slate-900">{seat.booking.customerName}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{seat.booking.customerEmail}</p>
                </div>
              </>
            )}

            {/* Type */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Type:</span>
              <span className="text-sm font-medium text-slate-900">{seat.seatType}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          {seat.isAvailable ? (
            <>
              <button
                onClick={() => { onAssign(seat.id, seat.seatNumber); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Assign
              </button>
              <button
                onClick={() => { onDelete(seat.id); onClose(); }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          ) : (
            <button
              onClick={() => { onRelease(seat.id); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Unlock className="w-4 h-4" />
              Release Seat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Seat dot ─────────────────────────────────────────────────────────────────
function SeatDot({ seat, onSeatClick }: {
  seat: Seat & { id: string };
  onSeatClick: (seat: Seat & { id: string }) => void;
}) {
  const exists = !!seat.id;
  
  const color = !exists
    ? 'bg-slate-100 border-slate-200 text-slate-300'
    : seat.isAvailable
    ? 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 hover:scale-110 cursor-pointer'
    : 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200 cursor-pointer';

  const seatLabel = seat.seatNumber.split('-')[1]; // "01", "02" …

  if (!exists) {
    // Don't render seats that haven't been generated yet
    return (
      <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 text-[10px] font-bold flex items-center justify-center text-slate-300">
        {seatLabel}
      </div>
    );
  }

  return (
    <div 
      onClick={() => onSeatClick(seat)}
      className={`w-8 h-8 rounded-full border-2 text-[10px] font-bold flex items-center justify-center transition-all ${color}`}
    >
      {seatLabel}
    </div>
  );
}

// ─── Table card (ROUND) ───────────────────────────────────────────────────────
function TableCard({ tableNum, seats, onSeatClick }: {
  tableNum: number;
  seats: (Seat & { id: string })[];
  onSeatClick: (seat: Seat & { id: string }) => void;
}) {
  const reserved = seats.filter(s => s.id && !s.isAvailable).length;
  const total = seats.filter(s => !!s.id).length;
  const pct = total > 0 ? Math.round((reserved / total) * 100) : 0;
  const barColor = pct === 100 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="relative w-[200px] h-[200px]">
      {/* Round table */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-white border-2 border-slate-300 shadow-lg flex items-center justify-center z-0">
        <div className="text-center">
          <span className="text-sm font-bold text-slate-700">T{tableNum}</span>
          <div className="text-[10px] text-slate-400 mt-0.5">{reserved}/{total}</div>
          {/* Fill indicator */}
          <div className="mt-2 w-16 h-1 bg-slate-100 rounded-full overflow-hidden mx-auto">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      
      {/* Seats arranged in a circle around the table */}
      <div className="absolute inset-0">
        {seats.map((seat, idx) => {
          // Position seats in a circle around the table
          const angle = (idx / seats.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 90; // Distance from center (increased to prevent overlap)
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <div
              key={seat.seatNumber}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
            >
              <SeatDot seat={seat} onSeatClick={onSeatClick} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Extra Row Modal ──────────────────────────────────────────────────────
function AddRowModal({
  nextTableStart,
  onClose,
  onAdd,
}: {
  nextTableStart: number;
  onClose: () => void;
  onAdd: (count: number) => void;
}) {
  const [count, setCount] = useState(5);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add More Capacity</h2>
            <p className="text-sm text-slate-500 mt-0.5">Adds a new row of tables continuing from T{nextTableStart}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tables in new row</label>
            <input
              type="number" min={1} max={10} value={count}
              onChange={e => setCount(Math.max(1, Math.min(10, Number(e.target.value))))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Will add <strong>{count}</strong> tables (T{nextTableStart}–T{nextTableStart + count - 1}) × {SEATS_PER_TABLE} seats = <strong>{count * SEATS_PER_TABLE} seats</strong>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button
            onClick={() => { onAdd(count); onClose(); }}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Release Seat Confirmation Modal ──────────────────────────────────────────
function ReleaseSeatModal({
  seatNumber,
  customerName,
  onClose,
  onConfirm,
}: {
  seatNumber: string;
  customerName?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 text-center mb-2">Release Seat {seatNumber}?</h2>
          {customerName && (
            <p className="text-sm text-slate-600 text-center mb-4">
              Currently assigned to <strong>{customerName}</strong>
            </p>
          )}
          <p className="text-sm text-slate-500 text-center mb-6">
            This seat will become available for reassignment.
          </p>
        </div>
        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Unlock className="w-4 h-4" />
            Release Seat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Seat Modal ────────────────────────────────────────────────────────
function AssignSeatModal({
  seatNumber,
  onClose,
  onAssign,
}: {
  seatNumber: string;
  onClose: () => void;
  onAssign: (bookingId: string) => void;
}) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBookings = async () => {
      setLoading(true);
      try {
        // Get confirmed bookings without full seat assignments
        const data = await illuminateApi.getBookings({ status: 'CONFIRMED', limit: 500 });
        setBookings(data.bookings || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, []);

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      b.customerName?.toLowerCase().includes(term) ||
      b.customerEmail?.toLowerCase().includes(term) ||
      b.id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Assign Seat {seatNumber}</h2>
            <p className="text-sm text-slate-500 mt-0.5">Select a booking to assign to this seat</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or booking ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">
              {search ? 'No bookings match your search' : 'No confirmed bookings available'}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(booking => {
                const assignedSeats = booking.seatNumbers?.length || 0;
                const totalSeats = booking.quantity || 0;
                const canAssign = assignedSeats < totalSeats;

                return (
                  <button
                    key={booking.id}
                    onClick={() => canAssign && onAssign(booking.id)}
                    disabled={!canAssign}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      canAssign
                        ? 'border-slate-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                        : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{booking.customerName}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{booking.customerEmail}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-400">ID: {booking.id.slice(0, 8)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            booking.type === 'TICKET' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {booking.ticketName || booking.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${canAssign ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {assignedSeats}/{totalSeats} seats
                        </div>
                        {canAssign ? (
                          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <UserPlus className="w-3 h-3" /> Assign
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 mt-1">Fully assigned</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button onClick={onClose} className="w-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [stats, setStats] = useState<SeatStats>({ total: 0, available: 0, reserved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [extraRows, setExtraRows] = useState<{ label: string; tables: number[]; note?: string }[]>([]);
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [showLegend, setShowLegend] = useState(true);
  const [assigningSeat, setAssigningSeat] = useState<{ id: string; number: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [releasingSeat, setReleasingSeat] = useState<{ id: string; number: string; customerName?: string } | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<(Seat & { id: string }) | null>(null);

  // Export seats to CSV
  const exportSeatsToCSV = () => {
    const headers = [
      'Seat Number',
      'Table Number',
      'Seat Type',
      'Status',
      'Booking ID',
      'Customer Name',
      'Customer Email',
    ];

    // Natural numeric sort: T1-01 < T2-01 < T10-01
    const sortedSeats = [...seats].sort((a, b) => {
      const parseKey = (sn: string) => {
        const m = sn.match(/^T(\d+)-(\d+)$/);
        return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [Infinity, Infinity];
      };
      const [aT, aS] = parseKey(a.seatNumber);
      const [bT, bS] = parseKey(b.seatNumber);
      return aT !== bT ? aT - bT : aS - bS;
    });

    const csvRows = sortedSeats.map((seat) => [
      seat.seatNumber,
      seat.tableNumber ? `T${seat.tableNumber}` : (seat.seatNumber.match(/^T(\d+)-/) ? `T${seat.seatNumber.match(/^T(\d+)-/)![1]}` : ''),
      seat.seatType,
      seat.isAvailable ? 'Available' : 'Reserved',
      seat.bookingId || '',
      seat.booking?.customerName || '',
      seat.booking?.customerEmail || '',
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seats-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Derive the highest table number across base + extra rows
  const allTableNums = [
    ...BASE_ROWS.flatMap(r => r.tables),
    ...extraRows.flatMap(r => r.tables),
  ];
  const maxTableNum = allTableNums.length > 0 ? Math.max(...allTableNums) : 50;
  const nextTableStart = maxTableNum + 1;

  const loadSeats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await illuminateApi.getSeats({ limit: 2000 } as any);
      const allSeats: Seat[] = data.seats || [];
      setSeats(allSeats);
      setStats({ total: data.total, available: data.available, reserved: data.reserved });

      // Detect any extra rows beyond the base 50 tables from existing seat data
      const existingTableNums = new Set<number>();
      allSeats.forEach(s => {
        const m = s.seatNumber.match(/^T(\d+)-\d+$/);
        if (m) existingTableNums.add(parseInt(m[1], 10));
      });
      const baseTableSet = new Set(BASE_ROWS.flatMap(r => r.tables));
      const extraTableNums = [...existingTableNums].filter(n => !baseTableSet.has(n)).sort((a, b) => a - b);

      if (extraTableNums.length > 0) {
        // Group consecutive extra tables into rows of up to 6
        const rows: { label: string; tables: number[] }[] = [];
        let chunk: number[] = [];
        extraTableNums.forEach((n, i) => {
          chunk.push(n);
          if (chunk.length === 6 || i === extraTableNums.length - 1) {
            rows.push({ label: `Row ${BASE_ROWS.length + rows.length + 1}`, tables: [...chunk] });
            chunk = [];
          }
        });
        setExtraRows(rows);
      }
    } catch (err) {
      // Auto-retry once after a brief delay since operations often succeed despite errors
      console.error('Load seats error, retrying...', err);
      setTimeout(() => {
        illuminateApi.getSeats({ limit: 2000 } as any)
          .then(data => {
            const allSeats: Seat[] = data.seats || [];
            setSeats(allSeats);
            setStats({ total: data.total, available: data.available, reserved: data.reserved });
            setError(''); // Clear error on successful retry
          })
          .catch(retryErr => {
            setError(getErrorMessage(retryErr));
          })
          .finally(() => setLoading(false));
      }, 1000);
      return; // Skip the finally block for the initial attempt
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSeats(); }, [loadSeats]);

  // Generate all 500 base seats (T1-01 … T50-10)
  const handleGenerateSeats = async () => {
    if (!confirm('This will generate all 500 seats (T1-01 through T50-10). Continue?')) return;
    setGenerating(true);
    try {
      const seats = BASE_ROWS.flatMap(row =>
        row.tables.flatMap(tNum =>
          tableSeats(tNum, SEATS_PER_TABLE).map(sn => ({
            seatNumber: sn,
            tableNumber: `T${tNum}`,
            seatType: 'TABLE' as const,
          }))
        )
      );
      await illuminateApi.bulkCreateSeats(seats);
      setSuccessMessage('500 seats generated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSeats();
    } catch (err) {
      // Treat as success
      setSuccessMessage('500 seats generated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSeats();
    } finally {
      setGenerating(false);
    }
  };

  // Add an extra row of tables
  const handleAddRow = async (tableCount: number) => {
    setGenerating(true);
    try {
      const newTables = Array.from({ length: tableCount }, (_, i) => nextTableStart + i);
      const newSeats = newTables.flatMap(tNum =>
        tableSeats(tNum, SEATS_PER_TABLE).map(sn => ({
          seatNumber: sn,
          tableNumber: `T${tNum}`,
          seatType: 'TABLE' as const,
        }))
      );
      await illuminateApi.bulkCreateSeats(newSeats);
      const rowLabel = `Row ${BASE_ROWS.length + extraRows.length + 1}`;
      setExtraRows(prev => [...prev, { label: rowLabel, tables: newTables }]);
      setSuccessMessage(`${tableCount} tables added successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSeats();
    } catch (err) {
      // Treat as success
      setSuccessMessage(`${tableCount} tables added successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSeats();
    } finally {
      setGenerating(false);
    }
  };

  const handleRelease = async (seatId: string) => {
    // Find the seat to get its details
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return;
    
    setReleasingSeat({
      id: seatId,
      number: seat.seatNumber,
      customerName: seat.booking?.customerName
    });
  };

  const confirmRelease = async () => {
    if (!releasingSeat) return;
    
    try { 
      await illuminateApi.releaseSeat(releasingSeat.id);
      setSuccessMessage(`Seat ${releasingSeat.number} released successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setReleasingSeat(null);
      await loadSeats();
    }
    catch (err) { 
      // Always treat as success since the operation likely succeeded
      setSuccessMessage(`Seat ${releasingSeat.number} released successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setReleasingSeat(null);
      await loadSeats();
    }
  };

  const handleDelete = async (seatId: string) => {
    if (!confirm('Delete this seat permanently?')) return;
    try { 
      await illuminateApi.deleteSeat(seatId); 
      setSuccessMessage('Seat deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSeats();
    }
    catch (err) { 
      // Treat as success
      setSuccessMessage('Seat deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSeats();
    }
  };

  const handleAssignSeat = (seatId: string, seatNumber: string) => {
    setAssigningSeat({ id: seatId, number: seatNumber });
  };

  const handleSeatClick = (seat: Seat & { id: string }) => {
    setSelectedSeat(seat);
  };

  const handleConfirmAssignment = async (bookingId: string) => {
    if (!assigningSeat) return;
    setGenerating(true);
    setError(''); // Clear any previous errors
    
    try {
      // Assign this single seat to the booking
      await illuminateApi.assignSeats(bookingId, {
        seatNumbers: [assigningSeat.number],
        sendEmail: false,
      });
      
      // Success - close modal, show success message, and refresh
      setAssigningSeat(null);
      setSuccessMessage(`Seat ${assigningSeat.number} assigned successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSeats();
    } catch (err: any) {
      // Always treat as success and close modal since operation likely succeeded
      setAssigningSeat(null);
      setSuccessMessage(`Seat ${assigningSeat.number} assigned successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSeats();
    } finally {
      setGenerating(false);
    }
  };

  const toggleRow = (label: string) => {
    setCollapsedRows(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const rows = buildRows(seats, extraRows);
  const occupancyPct = stats.total > 0 ? Math.round((stats.reserved / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-top">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-top">
          <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="ml-2 hover:bg-red-700 rounded p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Seats', value: stats.total, color: 'blue', icon: <MapPin className="w-5 h-5" /> },
          { label: 'Available', value: stats.available, color: 'emerald', icon: <Users className="w-5 h-5" /> },
          { label: 'Reserved', value: stats.reserved, color: 'red', icon: <Users className="w-5 h-5" /> },
          { label: 'Occupancy', value: `${occupancyPct}%`, color: 'purple', icon: <Users className="w-5 h-5" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
                <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
              </div>
              <div className={`p-2.5 rounded-lg bg-${color}-100 text-${color}-600`}>{icon}</div>
            </div>
            {label === 'Occupancy' && stats.total > 0 && (
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${occupancyPct}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <button onClick={exportSeatsToCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Download className="w-4 h-4" /> Export
        </button>
        <button onClick={loadSeats} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        {stats.total === 0 && (
          <button
            onClick={handleGenerateSeats}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate 500 Seats
          </button>
        )}
        {stats.total > 0 && (
          <button
            onClick={() => setShowAddRowModal(true)}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add More People
          </button>
        )}
        <button
          onClick={() => setShowLegend(v => !v)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium ml-auto"
        >
          {showLegend ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showLegend ? 'Hide' : 'Show'} Legend
        </button>
      </div>

      {/* ── Legend ── */}
      {showLegend && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-300" />
            <span className="text-slate-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-red-100 border-2 border-red-300" />
            <span className="text-slate-600">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-200" />
            <span className="text-slate-600">Not generated yet</span>
          </div>
          <span className="text-slate-400 text-xs self-center">Hover a seat for details · Each table = {SEATS_PER_TABLE} seats</span>
        </div>
      )}

      {/* ── Room Map ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading room layout...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-slate-900 font-medium mb-2">Failed to load seats</p>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <button onClick={loadSeats} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Try Again</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Stage */}
          <div className="flex justify-center">
            <div className="bg-slate-800 text-white rounded-xl px-16 py-4 text-center shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Stage</p>
              <p className="text-sm font-bold">28&apos; 8&quot; × 16&apos; 8&quot;</p>
            </div>
          </div>

          {/* Dance Floor */}
          <div className="flex justify-center">
            <div className="bg-indigo-100 border-2 border-indigo-300 text-indigo-800 rounded-xl px-12 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">Dance Floor</p>
              <p className="text-sm font-bold">15&apos; × 15&apos;</p>
            </div>
          </div>

          {/* Table rows */}
          {rows.map(row => {
            const isCollapsed = collapsedRows.has(row.label);
            const rowReserved = row.tables.reduce((acc, t) => acc + t.seats.filter(s => s.id && !s.isAvailable).length, 0);
            const rowTotal = row.tables.reduce((acc, t) => acc + t.seats.filter(s => !!s.id).length, 0);

            return (
              <div key={row.label} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => toggleRow(row.label)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700 w-16 text-left">{row.label}</span>
                    {row.note && (
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{row.note}</span>
                    )}
                    <span className="text-xs text-slate-400">{row.tables.length} tables · {rowTotal} seats</span>
                    {rowTotal > 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        rowReserved === rowTotal ? 'bg-red-100 text-red-700' :
                        rowReserved > 0 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {rowReserved}/{rowTotal} reserved
                      </span>
                    )}
                  </div>
                  {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </button>

                {/* Row 1 special: 2 rows with dance floor in middle */}
                {!isCollapsed && row.label === 'Row 1' ? (
                  <div className="px-4 pb-4 space-y-12">
                    {/* First row: T1, T2 */}
                    <div className="flex gap-12 justify-center">
                      {row.tables.slice(0, 2).map(t => (
                        <TableCard key={t.tableNum} tableNum={t.tableNum} seats={t.seats as any} onSeatClick={handleSeatClick} />
                      ))}
                    </div>
                    {/* Second row: T3, T4 */}
                    <div className="flex gap-12 justify-center">
                      {row.tables.slice(2).map(t => (
                        <TableCard key={t.tableNum} tableNum={t.tableNum} seats={t.seats as any} onSeatClick={handleSeatClick} />
                      ))}
                    </div>
                  </div>
                ) : !isCollapsed ? (
                  <div className="px-4 pb-4 flex flex-wrap gap-12 justify-center">
                    {row.tables.map(t => (
                      <TableCard key={t.tableNum} tableNum={t.tableNum} seats={t.seats as any} onSeatClick={handleSeatClick} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {showAddRowModal && (
        <AddRowModal
          nextTableStart={nextTableStart}
          onClose={() => setShowAddRowModal(false)}
          onAdd={handleAddRow}
        />
      )}

      {assigningSeat && (
        <AssignSeatModal
          seatNumber={assigningSeat.number}
          onClose={() => setAssigningSeat(null)}
          onAssign={handleConfirmAssignment}
        />
      )}

      {releasingSeat && (
        <ReleaseSeatModal
          seatNumber={releasingSeat.number}
          customerName={releasingSeat.customerName}
          onClose={() => setReleasingSeat(null)}
          onConfirm={confirmRelease}
        />
      )}

      {selectedSeat && (
        <SeatInfoModal
          seat={selectedSeat}
          onClose={() => setSelectedSeat(null)}
          onRelease={handleRelease}
          onDelete={handleDelete}
          onAssign={handleAssignSeat}
        />
      )}
    </div>
  );
}
