'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';
import { Camera, CheckCircle, XCircle, User, Clock, AlertCircle, QrCode } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { Event, Attendee } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

interface CheckInResult {
  valid?: boolean;
  success?: boolean;
  attendee?: Attendee & {
    event: Event;
    plusOne?: {
      name: string;
      company: string;
      title: string;
      email: string;
    };
    checkedInAt?: string;
    alreadyCheckedIn?: boolean;
  };
  message?: string;
}

export default function CheckInPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const { toasts, closeToast, success, error: showError } = useToast();

  useEffect(() => {
    fetchEvents();
    return () => {
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (scanning) {
      startScanning();
    } else {
      stopScanning();
    }
  }, [scanning]);

  const fetchEvents = async () => {
    try {
      const eventsData = await api.get<Event[]>('/event');
      setEvents(eventsData);
      if (eventsData.length > 0) {
        setSelectedEvent(eventsData[0].id);
      }
    } catch (err) {
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

      // Prefer back camera (environment-facing) on mobile devices
      // Back cameras typically have labels containing "back" or "environment"
      let selectedDeviceId = videoInputDevices[0].deviceId;
      
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('environment') ||
        device.label.toLowerCase().includes('rear')
      );
      
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      } else if (videoInputDevices.length > 1) {
        // If no explicit back camera found, use the last camera (often the back camera)
        selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
      }

      if (videoRef.current) {
        codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const qrCode = result.getText();
              if (qrCode) {
                setScanning(false);
                validateAndCheckIn(qrCode);
              }
            }
            if (error && error.name !== 'NotFoundException') {
              console.error('QR Scanner Error:', error);
            }
          }
        );
      }
    } catch (err: any) {
      console.error('Camera Error:', err);
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

  const validateAndCheckIn = async (qrCode: string) => {
    if (!qrCode || !selectedEvent) return;

    setLoading(true);
    try {
      // Validate QR code first
      const validateResponse = await api.get<CheckInResult>(`/qr/validate/${qrCode}`);
      
      if (!validateResponse.valid || !validateResponse.attendee) {
        setResult({
          valid: false,
          message: validateResponse.message || 'Invalid QR code',
        });
        showError('Invalid QR code');
        return;
      }

      // Check if attendee belongs to selected event
      if (validateResponse.attendee.eventId !== selectedEvent) {
        setResult({
          valid: false,
          message: 'This QR code is for a different event',
        });
        showError('Wrong event');
        return;
      }

      // Check if already checked in
      if (validateResponse.attendee.alreadyCheckedIn) {
        setResult({
          valid: true,
          attendee: validateResponse.attendee,
          message: 'Already checked in',
        });
        showError('Already checked in');
        return;
      }

      // Perform check-in
      const checkInResponse = await api.post<CheckInResult>(`/qr/check-in/${qrCode}`);
      
      if (!checkInResponse.success) {
        setResult({
          valid: false,
          message: checkInResponse.message || 'Check-in failed',
        });
        showError(checkInResponse.message || 'Check-in failed');
        return;
      }

      // Success
      setResult({
        valid: true,
        attendee: checkInResponse.attendee,
      });
      success('Check-in successful!');
      
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setResult({
        valid: false,
        message: errorMsg,
      });
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      validateAndCheckIn(manualCode.trim());
      setManualCode('');
    }
  };

  const resetScanner = () => {
    setResult(null);
    setManualCode('');
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <QrCode size={32} />
          Event Check-In
        </h1>
        <p className="text-gray-600 mt-1">Scan QR codes to check in attendees</p>
      </div>

      {/* Event Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.eventName} - {new Date(event.eventDate).toLocaleDateString()}
            </option>
          ))}
        </select>
        {selectedEventData && (
          <div className="mt-3 text-sm text-gray-600">
            <p>Capacity: {selectedEventData.currentRegistrations} / {selectedEventData.capacity}</p>
          </div>
        )}
      </div>

      {/* Scanner Section */}
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
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Camera size={20} />
              Start Scanning
            </button>
          </div>
        )}

        {scanning && (
          <div>
            <div className="mb-4 relative bg-black rounded-lg overflow-hidden" style={{ paddingTop: '75%' }}>
              <video
                ref={videoRef}
                className="absolute top-0 left-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute inset-0 border-4 border-blue-500 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg"></div>
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
            {/* Result Status */}
            <div className={`p-4 rounded-lg border-2 ${
              result.valid 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
            }`}>
              <div className="flex items-center gap-3">
                {result.valid ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <h3 className={`text-lg font-semibold ${
                    result.valid ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {result.valid ? 'Valid Check-In' : 'Invalid QR Code'}
                  </h3>
                  {result.message && (
                    <p className={result.valid ? 'text-green-700' : 'text-red-700'}>
                      {result.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Attendee Details */}
            {result.valid && result.attendee && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg">
                  <User size={20} />
                  Attendee Information
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{result.attendee.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Company</p>
                    <p className="font-medium text-gray-900">{result.attendee.company}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Title</p>
                    <p className="font-medium text-gray-900">{result.attendee.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{result.attendee.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Registration ID</p>
                    <p className="font-medium text-gray-900 font-mono">{result.attendee.registrationId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      result.attendee.status === 'CONFIRMED' 
                        ? 'bg-green-100 text-green-800'
                        : result.attendee.status === 'WAITLISTED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.attendee.status}
                    </span>
                  </div>
                </div>

                {/* Plus One Info */}
                {result.attendee.plusOne && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Plus One</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium text-gray-900">{result.attendee.plusOne.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Company</p>
                        <p className="font-medium text-gray-900">{result.attendee.plusOne.company}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Check-in Time */}
                {result.attendee.checkedInAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                    <Clock size={16} />
                    Checked in at: {new Date(result.attendee.checkedInAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetScanner}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Scan Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry */}
      {!scanning && !result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Entry</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter the QR code manually if scanning is not available
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-3">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter QR code..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking...' : 'Check In'}
            </button>
          </form>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <LoadingSpinner message="Validating QR code..." />
        </div>
      )}
    </div>
  );
}
