'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { ExternalLink, RefreshCw, Settings } from 'lucide-react';

export default function AttendeeSheetPage() {
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const fetchSheetUrl = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ url: string | null }>('/admin/sheets/url');
      setSheetUrl(data.url);
    } catch (err: any) {
      setError(err.message || 'Failed to load Google Sheet');
    } finally {
      setLoading(false);
    }
  };

  const initializeSheet = async () => {
    try {
      setInitializing(true);
      setError(null);
      await api.post('/admin/sheets/initialize');
      // Wait a bit for initialization to complete
      setTimeout(() => {
        fetchSheetUrl();
        setInitializing(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Sheet');
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchSheetUrl();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!sheetUrl) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            Google Sheets Not Configured
          </h2>
          <p className="text-yellow-800 mb-4">
            To enable automatic attendee syncing to Google Sheets, you need to configure the integration in your backend.
          </p>
          <div className="bg-white rounded p-4 text-sm mb-4">
            <h3 className="font-semibold mb-2">Setup Instructions:</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>Create a new Google Sheet</li>
              <li>Copy the Sheet ID from the URL</li>
              <li>Set up Google Cloud credentials (Service Account or API Key)</li>
              <li>Add the following to your backend .env file:
                <pre className="bg-slate-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`GOOGLE_SHEET_ID="your-sheet-id"
GOOGLE_API_KEY="your-api-key"`}
                </pre>
              </li>
              <li>Make sure your Google Sheet is set to "Anyone with the link can edit"</li>
              <li>Restart your backend server</li>
              <li>Click the "Initialize Sheet" button below</li>
            </ol>
          </div>
          <div className="flex gap-2">
            <button
              onClick={initializeSheet}
              disabled={initializing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {initializing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Initializing...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  Initialize Sheet
                </>
              )}
            </button>
            <button
              onClick={fetchSheetUrl}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ top: '64px', left: '256px' }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendee Sheet</h1>
          <p className="text-sm text-slate-600 mt-1">
            Live view of all registered attendees synced to Google Sheets
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={initializeSheet}
            disabled={initializing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors text-sm"
          >
            {initializing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Initializing...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4" />
                Initialize Sheet
              </>
            )}
          </button>
          <button
            onClick={fetchSheetUrl}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Sheets
          </a>
        </div>
      </div>

      {/* Embedded Sheet - Full Height */}
      <div className="flex-1 bg-slate-50 overflow-hidden">
        <iframe
          src={`${sheetUrl}/edit?rm=minimal&widget=true`}
          className="w-full h-full border-0"
          title="Attendee Sheet"
        />
      </div>
    </div>
  );
}
