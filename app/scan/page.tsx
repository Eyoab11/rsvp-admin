'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';
import {
  Camera,
  CheckCircle,
  XCircle,
  User,
  Clock,
  AlertCircle,
  QrCode,
  MapPin,
} from 'lucide-react';
import { api, illuminateApi, getErrorMessage } from '@/lib/api';
import { Event } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { getUser } from '@/lib/auth';

type EventMode = 'rsvp' | 'illuminate';

interface CheckInResult {
  valid?: boolean;
  success?: boolean;
  attendee?: {
    id: string;
    name: string;
    company?: string;
    title?: string;
    registrationId?: string;
    status: string;
    eventId?: string;
    checkedInAt?: string;
    alreadyCheckedIn?: boolean;
    email?: string;
    event?: Event;
    plusOne?: {
      name: string;
      company: string;
      title: string;
      email?: string;
    };
    // Illuminate fields
    seatNumbers?: string[];
    tableNumber?: string;
    sectionName?: string;
    ticketName?: string;
    ticketTier?: string;
  };
  message?: string;
  alreadyCheckedIn?: boolean;
}

export default function ScanPage() {
  const [mode, setMode] = useState<EventMode>('rsvp');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('checkin');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const { toasts, closeToast, success, error: showError } = useToast();

  useEffect(() => {
    const user = getUser();
    if (user) setUserRole(user.role);
    fetchEvents();
    return () => stopScanning();
  }, []);

  useEffect(() => {
    if (scanning) startScanning();
    else stopScanning();
  }, [scanning]);

  const fetchEvents = async () => {
    try {
      const eventsData = await api.get<Event[]>('/event');
      setEvents(eventsData);
      if (eventsData.length > 0) setSelectedEvent(eventsData[0].id);
    } catch {
      showError('Failed to load events');
    }
  };

  const startScanning = async () => {
    try {
      setCameraError(null);
      const codeReader = new BrowserQRCodeReader();
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        setCameraError('No camera found');
        setScanning(false);
        return;
      }

      let selectedDeviceId = videoInputDevices[0].deviceId;
      const backCamera = videoInputDevices.find(
        (d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('rear'),
      );
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      } else if (videoInputDevices.length > 1) {
        selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
      }

      if (videoRef.current) {
        codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (res, err) => {
          if (res) {
            const qrCode = res.getText();
            if (qrCode) {
              setScanning(false);
              handleScan(qrCode);
            }
          }
          if (err && err.name !== 'NotFoundException') {
            console.error('QR Scanner Error:', err);
          }
        });
      }
    } catch (err: any) {
      setCameraError(err.message || 'Failed to access camera');
      setScanning(false);
      showError('Camera access denied');
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
  };

  // ── RSVP check-in ──────────────────────────────────────────────────────────
  const handleRsvpCheckIn = async (qrCode: string) => {
    if (!selectedEvent) return;

    const validateResponse = await api.get<CheckInResult>(`/qr/validate-checkin/${qrCode}`);

    if (!validateResponse.valid || !validateResponse.attendee) {
      setResult({ valid: false, message: validateResponse.message || 'Invalid QR code' });
      showError('Invalid QR code');
      return;
    }

    if (validateResponse.attendee.eventId !== selectedEvent) {
      setResult({ valid: false, message: 'This QR code is for a different event' });
      showError('Wrong event');
      return;
    }

    if (validateResponse.attendee.alreadyCheckedIn) {
      setResult({
        valid: true,
        attendee: validateResponse.attendee,
        message: 'Already checked in',
        alreadyCheckedIn: true,
      });
      showError('This person is already checked in');
      return;
    }

    const checkInResponse = await api.post<CheckInResult>(`/qr/check-in-secure/${qrCode}`);
    if (!checkInResponse.success) {
      setResult({ valid: false, message: checkInResponse.message || 'Check-in failed' });
      showError(checkInResponse.message || 'Check-in failed');
      return;
    }

    setResult({ valid: true, attendee: checkInResponse.attendee });
    success('Check-in successful!');
  };

  // ── Illuminate check-in (booking ID encoded in QR) ─────────────────────────
  const handleIlluminateCheckIn = async (qrCode: string) => {
    // The QR code encodes the booking ID
    const booking = await illuminateApi.getBooking(qrCode).catch(() => null);

    if (!booking) {
      setResult({ valid: false, message: 'Booking not found for this QR code' });
      showError('Invalid QR code');
      return;
    }

    const b = (booking as any).booking ?? booking;

    if (b.status === 'CANCELLED') {
      setResult({ valid: false, message: 'This booking has been cancelled' });
      showError('Booking cancelled');
      return;
    }

    if (b.status !== 'CONFIRMED') {
      setResult({ valid: false, message: `Booking is not confirmed (status: ${b.status})` });
      showError('Booking not confirmed');
      return;
    }

    setResult({
      valid: true,
      attendee: {
        id: b.id,
        name: b.customerName,
        email: b.customerEmail,
        status: b.status,
        seatNumbers: b.seatNumbers,
        tableNumber: b.tableNumber,
        sectionName: b.sectionName,
        ticketName: b.ticketName,
        ticketTier: b.ticketTier,
      },
    });
    success('Booking verified!');
  };

  const handleScan = async (qrCode: string) => {
    setLoading(true);
    try {
      if (mode === 'rsvp') {
        await handleRsvpCheckIn(qrCode);
      } else {
        await handleIlluminateCheckIn(qrCode);
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setResult({ valid: false, message: msg });
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  const resetScanner = () => {
    setResult(null);
    setManualCode('');
  };

  const selectedEventData = events.find((e) => e.id === selectedEvent);

  return (
    <div className="max-w-4xl mx-auto">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Mode Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Select Event Type</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setMode('rsvp'); setResult(null); }}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
              mode === 'rsvp'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <QrCode size={18} />
            RSVP Event
          </button>
          <button
            onClick={() => { setMode('illuminate'); setResult(null); }}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
              mode === 'illuminate'
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <MapPin size={18} />
            Illuminate Life Gala
          </button>
        </div>
      </div>

      {/* RSVP: Event selector */}
      {mode === 'rsvp' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.eventName} —{' '}
                {new Date(event.eventDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
              </option>
            ))}
          </select>
          {selectedEventData && (
            <p className="mt-2 text-sm text-gray-500">
              Capacity: {selectedEventData.currentRegistrations} / {selectedEventData.capacity}
            </p>
          )}
        </div>
      )}

      {/* Illuminate: info banner */}
      {mode === 'illuminate' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800 font-medium">Illuminate Life Gala — Booking Check-In</p>
          <p className="text-xs text-amber-700 mt-1">
            Scan the QR code from the guest's confirmation email to verify their booking.
          </p>
        </div>
      )}

      {/* Scanner */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {!scanning && !result && (
          <div className="text-center">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Scan</h2>
            <p className="text-gray-600 mb-6">Click the button below to start scanning QR codes</p>
            {cameraError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {cameraError}
              </div>
            )}
            <button
              onClick={() => setScanning(true)}
              className={`text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 ${
                mode === 'illuminate'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Camera size={20} />
              Start Scanning
            </button>
          </div>
        )}

        {scanning && (
          <div>
            <div
              className="mb-4 relative bg-black rounded-lg overflow-hidden"
              style={{ paddingTop: '75%' }}
            >
              <video
                ref={videoRef}
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
              <div
                className={`absolute inset-0 border-4 pointer-events-none ${
                  mode === 'illuminate' ? 'border-amber-500' : 'border-blue-500'
                }`}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg" />
              </div>
            </div>
            <button
              onClick={() => setScanning(false)}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Stop Scanning
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Status banner */}
            <div
              className={`p-4 rounded-lg border-2 ${
                result.alreadyCheckedIn
                  ? 'bg-yellow-50 border-yellow-500'
                  : result.valid
                  ? 'bg-green-50 border-green-500'
                  : 'bg-red-50 border-red-500'
              }`}
            >
              <div className="flex items-center gap-3">
                {result.alreadyCheckedIn ? (
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                ) : result.valid ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <h3
                    className={`text-lg font-semibold ${
                      result.alreadyCheckedIn
                        ? 'text-yellow-900'
                        : result.valid
                        ? 'text-green-900'
                        : 'text-red-900'
                    }`}
                  >
                    {result.alreadyCheckedIn
                      ? 'Already Checked In'
                      : result.valid
                      ? mode === 'illuminate'
                        ? 'Booking Verified'
                        : 'Check-In Successful'
                      : 'Invalid QR Code'}
                  </h3>
                  {result.message && (
                    <p
                      className={
                        result.alreadyCheckedIn
                          ? 'text-yellow-700'
                          : result.valid
                          ? 'text-green-700'
                          : 'text-red-700'
                      }
                    >
                      {result.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Guest details */}
            {result.valid && result.attendee && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg">
                  <User size={20} />
                  {mode === 'illuminate' ? 'Booking Information' : 'Attendee Information'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{result.attendee.name}</p>
                  </div>
                  {(userRole === 'admin' || userRole === 'super_admin') && result.attendee.email && (
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{result.attendee.email}</p>
                    </div>
                  )}
                  {result.attendee.company && (
                    <div>
                      <p className="text-sm text-gray-500">Company</p>
                      <p className="font-medium text-gray-900">{result.attendee.company}</p>
                    </div>
                  )}
                  {result.attendee.title && (
                    <div>
                      <p className="text-sm text-gray-500">Title</p>
                      <p className="font-medium text-gray-900">{result.attendee.title}</p>
                    </div>
                  )}
                  {result.attendee.registrationId && (
                    <div>
                      <p className="text-sm text-gray-500">Registration ID</p>
                      <p className="font-medium text-gray-900 font-mono">
                        {result.attendee.registrationId}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.attendee.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : result.attendee.status === 'WAITLISTED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {result.attendee.status}
                    </span>
                  </div>
                </div>

                {/* Illuminate seat info */}
                {mode === 'illuminate' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Seat Assignment</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Ticket</p>
                        <p className="font-medium text-gray-900">
                          {result.attendee.ticketName || result.attendee.ticketTier || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Seat(s)</p>
                        <p className="font-medium text-gray-900">
                          {result.attendee.seatNumbers?.join(', ') || 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Table</p>
                        <p className="font-medium text-gray-900">
                          {result.attendee.tableNumber
                            ? `Table ${result.attendee.tableNumber}`
                            : 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* RSVP plus-one */}
                {mode === 'rsvp' && result.attendee.plusOne && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Plus One</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium text-gray-900">{result.attendee.plusOne.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Company</p>
                        <p className="font-medium text-gray-900">
                          {result.attendee.plusOne.company}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Check-in time */}
                {result.attendee.checkedInAt && (
                  <div
                    className={`flex items-center gap-2 text-sm mt-3 p-3 rounded-lg ${
                      result.alreadyCheckedIn
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-green-100 text-green-800 border border-green-300'
                    }`}
                  >
                    <Clock size={16} />
                    <span className="font-medium">
                      {result.alreadyCheckedIn ? 'Previously checked in at:' : 'Checked in at:'}
                    </span>
                    <span>{new Date(result.attendee.checkedInAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={resetScanner}
              className={`w-full text-white px-4 py-2 rounded-lg transition-colors ${
                mode === 'illuminate'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Scan Next
            </button>
          </div>
        )}
      </div>

      {/* Manual entry */}
      {!scanning && !result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manual Entry</h3>
          <p className="text-sm text-gray-500 mb-4">
            {mode === 'illuminate'
              ? 'Enter the Booking ID from the confirmation email'
              : 'Enter the QR code manually if scanning is not available'}
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-3">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={mode === 'illuminate' ? 'Enter Booking ID...' : 'Enter QR code...'}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || loading}
              className={`text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'illuminate'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Checking...' : 'Verify'}
            </button>
          </form>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <LoadingSpinner message="Validating..." />
        </div>
      )}
    </div>
  );
}
