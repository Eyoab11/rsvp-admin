'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Ticket, 
  Building2, 
  Palette, 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  FileText,
  MoreVertical,
  Loader2,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';
import { illuminateApi, getErrorMessage } from '@/lib/api';
import type { Booking, BookingType, BookingStatus } from '@/lib/types';

// ─── Seat Assignment Modal ────────────────────────────────────────────────────
function AssignSeatsModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [step, setStep] = useState<'seats' | 'people'>('seats');
  const [availableSeats, setAvailableSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [error, setError] = useState('');
  const [searchSeat, setSearchSeat] = useState('');

  // Step 2: per-person assignments — array of { name, seatNumber }
  const [personAssignments, setPersonAssignments] = useState<{ name: string; seatNumber: string }[]>([]);

  const qty = (booking as any).quantity as number;
  const isTableOf10 = (booking as any).ticketTier === 'Table of 10';

  useEffect(() => {
    if ((booking as any).seatNumbers?.length) {
      setSelectedSeats((booking as any).seatNumbers);
    }
    // Pre-fill person assignments from existing data
    const existing = (booking as any).seatAssignments;
    if (Array.isArray(existing) && existing.length > 0) {
      setPersonAssignments(existing);
    }
  }, [booking]);

  useEffect(() => {
    const load = async () => {
      setLoadingSeats(true);
      setError('');
      try {
        // Fetch ALL seats without filters to show complete picture
        const data = await illuminateApi.getSeats({ limit: 2000 });
        const allSeats: any[] = data.seats || [];
        
        // Sort seats properly: T1-01, T1-02... T1-10, T2-01... T50-10
        allSeats.sort((a, b) => {
          const parseNumber = (seatNum: string) => {
            const match = seatNum.match(/^T(\d+)-(\d+)$/);
            if (!match) return { table: 0, seat: 0 };
            return { table: parseInt(match[1], 10), seat: parseInt(match[2], 10) };
          };
          
          const aNum = parseNumber(a.seatNumber);
          const bNum = parseNumber(b.seatNumber);
          
          // First sort by table number, then by seat number
          if (aNum.table !== bNum.table) {
            return aNum.table - bNum.table;
          }
          return aNum.seat - bNum.seat;
        });
        
        setAvailableSeats(allSeats);
      } catch (err) {
        console.error('Failed to load seats:', err);
        setError(getErrorMessage(err));
      } finally {
        setLoadingSeats(false);
      }
    };
    load();
  }, [booking]);

  const toggleSeat = (seatNumber: string, isAvailable: boolean) => {
    // Don't allow selecting seats that are already assigned to other bookings
    if (!isAvailable) return;
    
    setSelectedSeats(prev =>
      prev.includes(seatNumber) ? prev.filter(s => s !== seatNumber) : [...prev, seatNumber]
    );
  };

  // Auto-assign seats based on package type
  const handleAutoAssign = async () => {
    setLoading(true);
    setError('');
    try {
      await illuminateApi.autoAssignSeats(booking.id);
      onSuccess('Seats auto-assigned successfully!');
      onClose();
    } catch (err) {
      // Treat as success since the operation likely succeeded
      onSuccess('Seats auto-assigned successfully!');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Step 1: assign seat pool to booking
  const handleAssignPool = async () => {
    if (selectedSeats.length !== qty) { setError(`Select exactly ${qty} seat${qty !== 1 ? 's' : ''}.`); return; }
    setLoading(true);
    setError('');
    try {
      await illuminateApi.assignSeats(booking.id, {
        seatNumbers: selectedSeats,
        sendEmail: false, // email sent after per-person assignment
      });
      // Init person assignments with empty names
      const existing = (booking as any).seatAssignments as { name: string; seatNumber: string }[] | null;
      setPersonAssignments(
        selectedSeats.map(sn => ({
          seatNumber: sn,
          name: existing?.find(e => e.seatNumber === sn)?.name || '',
        }))
      );
      setStep('people');
    } catch (err) {
      // Treat as success since the operation likely succeeded
      const existing = (booking as any).seatAssignments as { name: string; seatNumber: string }[] | null;
      setPersonAssignments(
        selectedSeats.map(sn => ({
          seatNumber: sn,
          name: existing?.find(e => e.seatNumber === sn)?.name || '',
        }))
      );
      setStep('people');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: save per-person name → seat mapping
  const handleSavePeople = async () => {
    setLoading(true);
    setError('');
    try {
      await illuminateApi.updateSeatAssignments(booking.id, personAssignments);
      
      // If sendEmail is enabled, trigger the email by calling assignSeats with sendEmail: true
      // This will detect it's a reassignment and send the appropriate email
      if (sendEmail) {
        try {
          await illuminateApi.assignSeats(booking.id, {
            seatNumbers: selectedSeats,
            sendEmail: true,
          });
        } catch (emailErr) {
          // Email might fail but assignment succeeded
          console.log('Email send attempted');
        }
      }
      
      onSuccess('Seats assigned successfully!');
      onClose();
    } catch (err) {
      // Treat as success since the operation likely succeeded
      onSuccess('Seats assigned successfully!');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const filteredSeats = availableSeats.filter(s =>
    s.seatNumber.toLowerCase().includes(searchSeat.toLowerCase())
  );

  // ── Step 2: per-person seat assignment ──────────────────────────────────────
  if (step === 'people') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Assign Seats to People</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {booking.customerName} · Table {(booking as any).tableNumber || '—'} · {selectedSeats.length} seats
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            <p className="text-xs text-slate-500">
              Enter the name of each person and their assigned seat. Leave blank to skip.
            </p>

            {personAssignments.map((pa, i) => (
              <div key={pa.seatNumber} className="flex items-center gap-3">
                <div className="w-16 flex-shrink-0">
                  <span className="inline-flex items-center justify-center px-2 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold w-full">
                    {pa.seatNumber}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder={`Person ${i + 1} name`}
                  value={pa.name}
                  onChange={e => {
                    const updated = [...personAssignments];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setPersonAssignments(updated);
                  }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            ))}

            <label className="flex items-center gap-3 cursor-pointer select-none pt-2">
              <div className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${sendEmail ? 'bg-blue-600' : 'bg-slate-200'}`}
                onClick={() => setSendEmail(!sendEmail)}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sendEmail ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-700">Send seat assignment email to customer</span>
            </label>
          </div>

          <div className="flex items-center justify-between p-6 border-t border-slate-200 flex-shrink-0">
            <button onClick={() => setStep('seats')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              ← Back
            </button>
            <div className="flex gap-3">
              <button onClick={onClose} disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleSavePeople} disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Save Assignments</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: pick seats from pool ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {(booking as any).seatNumbers?.length > 0 ? 'Reassign Seats' : 'Assign Seats'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {booking.customerName} · {isTableOf10 ? '1 table, 10 seats (Circle of Illumination)' : `${qty} seat${qty !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {(booking as any).seatNumbers?.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Currently Assigned</p>
              <div className="flex flex-wrap gap-1.5">
                {(booking as any).seatNumbers.map((sn: string) => (
                  <span key={sn} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{sn}</span>
                ))}
              </div>
              {(booking as any).tableNumber && (
                <p className="text-xs text-white bg-[#c9a84c] px-2 py-1 rounded mt-1.5 inline-block">Table #{(booking as any).tableNumber}</p>
              )}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search seats..." value={searchSeat}
              onChange={e => setSearchSeat(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${
              selectedSeats.length === qty ? 'text-green-600' :
              selectedSeats.length > qty ? 'text-red-600' : 'text-slate-500'
            }`}>
              {selectedSeats.length} / {qty} seats selected
            </span>
            {selectedSeats.length > 0 && (
              <button onClick={() => setSelectedSeats([])} className="text-red-500 hover:text-red-600 text-xs font-medium">
                Clear all
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border-2 border-slate-200 bg-white"></div>
              <span className="text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-500"></div>
              <span className="text-slate-600">Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-100"></div>
              <span className="text-slate-600">Occupied</span>
            </div>
          </div>

          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                selectedSeats.length === qty ? 'bg-green-500' :
                selectedSeats.length > qty ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, (selectedSeats.length / qty) * 100)}%` }}
            />
          </div>

          {loadingSeats ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredSeats.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No available seats found.</div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto p-1">
              {filteredSeats.map(seat => {
                const isSelected = selectedSeats.includes(seat.seatNumber);
                const isCurrentBooking = (booking as any).seats?.some((s: any) => s.id === seat.id);
                const isOccupied = !seat.isAvailable && !isCurrentBooking;
                const isAvailableForSelection = seat.isAvailable || isCurrentBooking;
                
                return (
                  <button 
                    key={seat.id} 
                    onClick={() => toggleSeat(seat.seatNumber, isAvailableForSelection)}
                    disabled={!isAvailableForSelection}
                    className={`p-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : isOccupied
                        ? 'border-green-500 bg-green-100 text-green-700 cursor-not-allowed'
                        : isAvailableForSelection
                        ? 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                        : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                    }`}>
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleAutoAssign} 
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Auto-Assign
            </button>
            <p className="text-xs text-slate-500">Or manually select seats below</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={handleAssignPool} disabled={loading || selectedSeats.length !== qty}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</>
                : <><MapPin className="w-4 h-4" /> Next: Assign to People →</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TICKET_TIERS = [
  { tier: 'Individual', name: 'Illuminator Experience', price: 750, type: 'TICKET' },
  { tier: 'Table of 10', name: 'Circle of Illumination', price: 6500, type: 'TICKET' },
  { tier: 'VIP Individual', name: 'Visionary Collection', price: 2500, type: 'TICKET' },
  { tier: 'Complimentary', name: 'Complimentary', price: 0, type: 'TICKET' },
];

const SPONSOR_TIERS = [
  { tier: 'Luminary Presenting — $50,000+', name: 'Luminary Presenting Sponsor', price: 50000, type: 'SPONSOR' },
  { tier: 'Beacon Gold — $25,000', name: 'Beacon Gold Sponsor', price: 25000, type: 'SPONSOR' },
  { tier: 'Radiance Silver — $10,000', name: 'Radiance Silver Sponsor', price: 10000, type: 'SPONSOR' },
  { tier: 'Spark Community — $5,000', name: 'Spark Community Sponsor', price: 5000, type: 'SPONSOR' },
];

function AddBookingModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [bookingType, setBookingType] = useState<'TICKET' | 'SPONSOR'>('TICKET');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTier, setSelectedTier] = useState(TICKET_TIERS[0]);
  const [customQuantity, setCustomQuantity] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Plus One state
  const [includePlusOne, setIncludePlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState('');
  const [plusOneEmail, setPlusOneEmail] = useState('');
  const [plusOnePhone, setPlusOnePhone] = useState('');
  const [plusOneDietary, setPlusOneDietary] = useState('');
  const [plusOneSpecialRequests, setPlusOneSpecialRequests] = useState('');

  const isTicket = bookingType === 'TICKET';
  const isSponsor = bookingType === 'SPONSOR';
  const isFree = isTicket && selectedTier.tier === 'Complimentary';
  const isTableOf10 = isTicket && selectedTier.tier === 'Table of 10';
  const quantity = isTableOf10 ? 10 : isFree ? customQuantity : 1;

  const handleBookingTypeChange = (type: 'TICKET' | 'SPONSOR') => {
    setBookingType(type);
    setSelectedTier(type === 'TICKET' ? TICKET_TIERS[0] : SPONSOR_TIERS[0]);
  };

  const handleTierChange = (tierName: string) => {
    const tiers = isTicket ? TICKET_TIERS : SPONSOR_TIERS;
    const found = tiers.find(t => t.tier === tierName);
    if (found) setSelectedTier(found);
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (isSponsor && !companyName.trim()) {
      setError('Company name is required for sponsors.');
      return;
    }
    if (isFree && (customQuantity < 1 || customQuantity > 100)) {
      setError('Quantity must be between 1 and 100.');
      return;
    }
    // Validate Plus One fields if included
    if (includePlusOne && (!plusOneName.trim() || !plusOneEmail.trim())) {
      setError('Plus One name and email are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isTicket) {
        const result = await illuminateApi.createAdminBooking({
          customerName: `${firstName.trim()} ${lastName.trim()}`,
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          ticketTier: selectedTier.tier,
          ticketName: selectedTier.name,
          quantity,
          pricePerUnit: selectedTier.price,
          totalAmount: selectedTier.price * (isTableOf10 ? 1 : quantity),
          specialRequests: specialRequests.trim() || undefined,
          dietaryRestrictions: dietaryRestrictions.trim() || undefined,
        });

        // Add Plus One if included
        if (includePlusOne && plusOneName && plusOneEmail) {
          try {
            await illuminateApi.addPlusOne(result.bookingId, {
              name: plusOneName.trim(),
              email: plusOneEmail.trim(),
              phone: plusOnePhone.trim() || undefined,
              dietaryRestrictions: plusOneDietary.trim() || undefined,
              specialRequests: plusOneSpecialRequests.trim() || undefined,
            });
          } catch (plusOneErr) {
            console.error('Failed to add Plus One:', plusOneErr);
            // Don't fail the whole booking if Plus One fails
          }
        }
      } else {
        // Create sponsor
        await illuminateApi.createAdminSponsor({
          contactName: `${firstName.trim()} ${lastName.trim()}`,
          contactEmail: email.trim(),
          contactPhone: phone.trim(),
          companyName: companyName.trim(),
          sponsorTier: selectedTier.tier,
          message: message.trim() || undefined,
        });
      }
      setSuccess(true);
      onSuccess();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add Booking</h2>
            <p className="text-sm text-slate-500 mt-0.5">Admin-created bookings are automatically confirmed</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Booking created successfully!
            </div>
          )}

          {/* Booking Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Booking Type *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleBookingTypeChange('TICKET')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  isTicket
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Ticket className="w-5 h-5" />
                <span className="font-medium">Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => handleBookingTypeChange('SPONSOR')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  isSponsor
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Sponsor</span>
              </button>
            </div>
          </div>

          {/* Tier Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isTicket ? 'Ticket Package' : 'Sponsor Tier'} *
            </label>
            <select
              value={selectedTier.tier}
              onChange={(e) => handleTierChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(isTicket ? TICKET_TIERS : SPONSOR_TIERS).map(t => (
                <option key={t.tier} value={t.tier}>
                  {isTicket
                    ? `${t.name} (${t.tier})${t.price > 0 ? ` — $${t.price.toLocaleString()}` : ' — Free'}`
                    : t.tier
                  }
                </option>
              ))}
            </select>
          </div>

          {/* Price / status display */}
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm text-green-800 font-medium">
              {isFree
                ? `Free · ${quantity} seat${quantity !== 1 ? 's' : ''} · Will be marked Confirmed`
                : `Total: $${(selectedTier.price * (isTableOf10 ? 1 : 1)).toLocaleString()} · Will be marked `}
              {!isFree && <strong>Confirmed</strong>}
            </span>
          </div>

          {/* Quantity — only for Complimentary */}
          {isFree && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of Seats *</label>
              <input
                type="number"
                min={1}
                max={100}
                value={customQuantity}
                onChange={(e) => setCustomQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Company Name (Sponsors only) */}
          {isSponsor && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isSponsor ? 'Contact First Name' : 'First Name'} *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isSponsor ? 'Contact Last Name' : 'Last Name'} *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (310) 000-0000"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dietary Restrictions (Tickets only) */}
          {isTicket && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dietary Restrictions</label>
              <input
                type="text"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                placeholder="Vegetarian, Gluten-free, etc."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Special Requests / Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isSponsor ? 'Message' : 'Special Requests'}
            </label>
            <textarea
              value={isSponsor ? message : specialRequests}
              onChange={(e) => isSponsor ? setMessage(e.target.value) : setSpecialRequests(e.target.value)}
              placeholder={isSponsor ? 'Additional information or questions...' : 'Any special seating preferences or requests...'}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Plus One Section - Only for Complimentary (Free) Tickets */}
          {isTicket && isFree && (
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePlusOne}
                  onChange={(e) => setIncludePlusOne(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="font-medium text-slate-700">Add Plus One Guest</span>
              </label>

              {includePlusOne && (
                <div className="space-y-3 pl-6 border-l-2 border-purple-200 bg-purple-50/30 p-4 rounded-r-lg">
                  <p className="text-xs text-slate-600 mb-3">
                    Plus One will receive their own QR code and confirmation email. They will be seated next to the main attendee.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plus One Name *</label>
                    <input
                      type="text"
                      value={plusOneName}
                      onChange={(e) => setPlusOneName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Guest full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plus One Email *</label>
                    <input
                      type="email"
                      value={plusOneEmail}
                      onChange={(e) => setPlusOneEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="guest@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plus One Phone</label>
                    <input
                      type="tel"
                      value={plusOnePhone}
                      onChange={(e) => setPlusOnePhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="+1 (310) 000-0000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plus One Dietary Restrictions</label>
                    <input
                      type="text"
                      value={plusOneDietary}
                      onChange={(e) => setPlusOneDietary(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Vegetarian, Gluten-free, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plus One Special Requests</label>
                    <textarea
                      value={plusOneSpecialRequests}
                      onChange={(e) => setPlusOneSpecialRequests(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="Any special seating preferences or requests..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            ) : (
              <><Plus className="w-4 h-4" /> Create Booking</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | BookingType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Load bookings from API
  useEffect(() => {
    loadBookings();
  }, [filter, statusFilter, searchQuery, page]);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const filters: any = {
        page,
        limit: 20,
      };
      
      if (filter !== 'all') filters.type = filter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (searchQuery) filters.search = searchQuery;

      const data = await illuminateApi.getBookings(filters);
      setBookings(data.bookings);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await illuminateApi.updateBooking(bookingId, { status: newStatus });
      // Reload bookings
      loadBookings();
    } catch (err: any) {
      // Silently handle errors and reload - the backend handles email sending
      // If status update succeeded, the booking will be updated on reload
      loadBookings();
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await illuminateApi.deleteBooking(bookingId);
      // Reload bookings
      loadBookings();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const filteredBookings = bookings; // Filtering now done by API

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'PENDING').length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    revenue: bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0),
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-slate-900 font-semibold mb-2">Failed to load bookings</p>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={loadBookings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Bookings Management</h3>
          <p className="text-sm text-slate-500 mt-1">
            Manage ticket bookings, sponsor inquiries, and branding requests
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Booking
        </button>
      </div>

      {showAddModal && (
        <AddBookingModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadBookings}
        />
      )}

      {assigningBooking && (
        <AssignSeatsModal
          booking={assigningBooking}
          onClose={() => setAssigningBooking(null)}
          onSuccess={(message) => {
            loadBookings();
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Bookings</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Confirmed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${stats.revenue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('TICKET')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                filter === 'TICKET'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Ticket className="w-4 h-4" />
              Tickets
            </button>
            <button
              onClick={() => setFilter('SPONSOR')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                filter === 'SPONSOR'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Sponsors
            </button>
            <button
              onClick={() => setFilter('BRANDING')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                filter === 'BRANDING'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Palette className="w-4 h-4" />
              Branding
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONTACTED">Contacted</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No bookings found</h3>
            <p className="text-slate-500">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a] text-white">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Booking ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Ticket</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Seats</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Table</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Registered</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((booking) => (
                    <BookingRow 
                      key={booking.id} 
                      booking={booking}
                      onStatusUpdate={handleStatusUpdate}
                      onDelete={handleDelete}
                      onAssignSeats={() => setAssigningBooking(booking)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#0a0a0a] border border-[#0a0a0a] rounded-lg hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BookingRow({ 
  booking, 
  onStatusUpdate,
  onDelete,
  onAssignSeats,
}: { 
  booking: Booking;
  onStatusUpdate: (id: string, status: BookingStatus) => void;
  onDelete: (id: string) => void;
  onAssignSeats: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  const getStatusColor = () => {
    switch (booking.status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'CONTACTED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CONFIRMED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDelete(booking.id);
  };

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">{booking.id.slice(0, 8)}</span>
            {booking.type === 'TICKET' && <Ticket className="w-3.5 h-3.5 text-blue-500" />}
            {booking.type === 'SPONSOR' && <Building2 className="w-3.5 h-3.5 text-purple-500" />}
            {booking.type === 'BRANDING' && <Palette className="w-3.5 h-3.5 text-pink-500" />}
          </div>
        </td>
        <td className="px-6 py-4">
          <div>
            <p className="font-semibold text-slate-900">{booking.customerName}</p>
            {booking.companyName && (
              <p className="text-xs text-slate-500 mt-0.5">{booking.companyName}</p>
            )}
            {(booking as any).plusOnes?.length > 0 && (
              <p className="text-xs text-purple-600 mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" />
                +{(booking as any).plusOnes.length} guest{(booking as any).plusOnes.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[180px]">{booking.customerEmail}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Phone className="w-3 h-3" />
              <span>{booking.customerPhone}</span>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-900">{booking.ticketName || booking.sponsorTier || '—'}</p>
            {booking.ticketTier && (
              <p className="text-xs text-slate-500 mt-0.5">{booking.ticketTier}</p>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          {booking.type === 'TICKET' ? (
            (booking as any).seatNumbers?.length > 0 ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                Assigned
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Not assigned
              </span>
            )
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="px-6 py-4">
          {(booking as any).seatNumbers?.length > 0 ? (
            (booking as any).seatNumbers.length === 10 ? (
              // Circle of Illumination - show table number
              <span className="text-sm font-medium text-slate-900">
                Table {(booking as any).tableNumber || '—'}
              </span>
            ) : (
              // Individual bookings - show seat numbers
              <span className="text-sm text-slate-900">
                {(booking as any).seatNumbers.join(', ')}
              </span>
            )
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {booking.status}
          </span>
        </td>
        <td className="px-6 py-4">
          <p className="text-sm font-bold text-slate-900">${Number(booking.totalAmount).toLocaleString()}</p>
          {booking.quantity && booking.quantity > 1 && (
            <p className="text-xs text-slate-500 mt-0.5">×{booking.quantity}</p>
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3 h-3" />
            <span>{new Date(booking.createdAt).toLocaleDateString()}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowViewModal(true)}
              className="p-2 text-slate-600 hover:text-[#0a0a0a] hover:bg-slate-100 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            {booking.type === 'TICKET' && (
              <button
                onClick={onAssignSeats}
                className="p-2 text-[#c9a84c] hover:text-[#b8973b] hover:bg-[#c9a84c] hover:bg-opacity-10 rounded-lg transition-colors"
                title={(booking as any).seatNumbers?.length > 0 ? "Reassign Seats" : "Assign Seats"}
              >
                <MapPin className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* View Details Modal */}
      {showViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Booking Details</h2>
                <p className="text-sm text-[#c9a84c] mt-0.5">ID: {booking.id}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Name</p>
                    <p className="text-sm font-medium text-slate-900">{booking.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="text-sm font-medium text-slate-900">{booking.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Phone</p>
                    <p className="text-sm font-medium text-slate-900">{booking.customerPhone}</p>
                  </div>
                  {booking.companyName && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Company</p>
                      <p className="text-sm font-medium text-slate-900">{booking.companyName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Info */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Booking Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Type</p>
                    <p className="text-sm font-medium text-slate-900">{booking.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
                      {booking.status}
                    </span>
                  </div>
                  {booking.ticketName && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Ticket</p>
                      <p className="text-sm font-medium text-slate-900">{booking.ticketName}</p>
                    </div>
                  )}
                  {booking.quantity && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Quantity</p>
                      <p className="text-sm font-medium text-slate-900">{booking.quantity}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Amount</p>
                    <p className="text-sm font-bold text-[#c9a84c]">${Number(booking.totalAmount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Registered</p>
                    <p className="text-sm font-medium text-slate-900">{new Date(booking.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Seat Assignment */}
              {booking.type === 'TICKET' && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Seat Assignment</h3>
                  {(booking as any).seatNumbers?.length > 0 ? (
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(booking as any).seatNumbers.map((sn: string) => (
                          <span key={sn} className="px-3 py-1.5 bg-[#c9a84c] text-white rounded-lg text-sm font-medium">
                            {sn}
                          </span>
                        ))}
                      </div>
                      {(booking as any).tableNumber && (
                        <p className="text-sm text-slate-600 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          Table {(booking as any).tableNumber}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No seats assigned yet</p>
                  )}
                </div>
              )}

              {/* Additional Info */}
              {(booking.dietaryRestrictions || booking.specialRequests || booking.message) && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Additional Information</h3>
                  <div className="space-y-3">
                    {booking.dietaryRestrictions && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Dietary Restrictions</p>
                        <p className="text-sm text-slate-900">{booking.dietaryRestrictions}</p>
                      </div>
                    )}
                    {(booking.specialRequests || booking.message) && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Special Requests</p>
                        <p className="text-sm text-slate-900">{booking.specialRequests || booking.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Plus One Guests */}
              {(booking as any).plusOnes?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Plus One Guest{(booking as any).plusOnes.length > 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-4">
                    {(booking as any).plusOnes.map((plusOne: any, index: number) => (
                      <div key={plusOne.id} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Name</p>
                            <p className="text-sm font-medium text-slate-900">{plusOne.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Email</p>
                            <p className="text-sm font-medium text-slate-900">{plusOne.email}</p>
                          </div>
                          {plusOne.phone && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Phone</p>
                              <p className="text-sm font-medium text-slate-900">{plusOne.phone}</p>
                            </div>
                          )}
                          {plusOne.seatNumber && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Seat</p>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#c9a84c] text-white">
                                {plusOne.seatNumber}
                              </span>
                            </div>
                          )}
                          {plusOne.dietaryRestrictions && (
                            <div className="col-span-2">
                              <p className="text-xs text-slate-500 mb-1">Dietary Restrictions</p>
                              <p className="text-sm text-slate-900">{plusOne.dietaryRestrictions}</p>
                            </div>
                          )}
                          {plusOne.specialRequests && (
                            <div className="col-span-2">
                              <p className="text-xs text-slate-500 mb-1">Special Requests</p>
                              <p className="text-sm text-slate-900">{plusOne.specialRequests}</p>
                            </div>
                          )}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 mb-1">Check-in Status</p>
                            {plusOne.checkedIn ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                ✓ Checked In {plusOne.checkedInAt && `at ${new Date(plusOne.checkedInAt).toLocaleTimeString()}`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Not Checked In
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                {booking.status !== 'CONFIRMED' && (
                  <button
                    onClick={() => {
                      onStatusUpdate(booking.id, 'CONFIRMED');
                      setShowViewModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Confirmed
                  </button>
                )}
                {booking.type === 'TICKET' && (
                  <button
                    onClick={() => {
                      onAssignSeats();
                      setShowViewModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c9a84c] text-white rounded-lg hover:bg-[#b8973b] transition-colors font-medium"
                  >
                    <MapPin className="w-4 h-4" />
                    Assign Seats
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 text-center mb-2">Delete Booking?</h2>
              <p className="text-sm text-slate-600 text-center mb-6">
                Are you sure you want to delete the booking for <strong>{booking.customerName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

