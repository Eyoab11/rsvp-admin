'use client';

import { useEffect, useState } from 'react';
import { Key, Copy, CheckCircle, Download, RefreshCw, Clock, UserCheck, XCircle } from 'lucide-react';
import { api, endpoints, getErrorMessage } from '@/lib/api';
import { Event } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

interface GeneratedToken {
  token: string;
  url: string;
  expiresAt: string;
}

interface TokenHistory {
  id: string;
  token: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
  attendee?: {
    name: string;
    email: string;
    registrationId: string;
  };
}

export default function GenerateTokensPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [tokenCount, setTokenCount] = useState<string>('10');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedTokens, setGeneratedTokens] = useState<GeneratedToken[]>([]);
  const [tokenHistory, setTokenHistory] = useState<TokenHistory[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const { toasts, closeToast, success, error: showError } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchTokenHistory();
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const eventsData = await api.get<Event[]>(endpoints.events.list());
      setEvents(eventsData);
      if (eventsData.length > 0) {
        setSelectedEventId(eventsData[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenHistory = async () => {
    if (!selectedEventId) return;
    
    try {
      setLoadingHistory(true);
      // Fetch all invites for the event
      const invites = await api.get<any[]>(endpoints.invites.list(selectedEventId));
      
      // Filter for manual tokens (empty email) and map to TokenHistory
      const manualTokens: TokenHistory[] = invites
        .filter(invite => invite.email === '')
        .map(invite => ({
          id: invite.id,
          token: invite.token,
          isUsed: invite.isUsed,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
          attendee: invite.attendee ? {
            name: invite.attendee.name,
            email: invite.attendee.email,
            registrationId: invite.attendee.registrationId,
          } : undefined,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setTokenHistory(manualTokens);
    } catch (err) {
      console.error('Failed to fetch token history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerateTokens = async () => {
    if (!selectedEventId) {
      showError('Error', 'Please select an event');
      return;
    }

    const count = parseInt(tokenCount, 10);
    if (isNaN(count) || count < 1 || count > 100) {
      showError('Error', 'Token count must be between 1 and 100');
      setTokenCount('10');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      
      const response = await api.post<{ tokens: GeneratedToken[] }>(
        `/admin/events/${selectedEventId}/generate-tokens`,
        { count }
      );

      setGeneratedTokens(response.tokens);
      success('Success', `Generated ${response.tokens.length} tokens successfully`);
      
      // Refresh token history
      await fetchTokenHistory();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      showError('Failed to Generate Tokens', errorMsg);
      setError(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    success('Copied!', 'URL copied to clipboard');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleCopyAll = () => {
    const allUrls = generatedTokens.map(t => t.url).join('\n');
    navigator.clipboard.writeText(allUrls);
    success('Copied!', 'All URLs copied to clipboard');
  };

  const handleDownloadCSV = () => {
    const csvContent = [
      ['Token', 'URL', 'Expires At'],
      ...generatedTokens.map(t => [t.token, t.url, new Date(t.expiresAt).toLocaleString()])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokens-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    success('Downloaded!', 'Tokens exported to CSV');
  };

  if (loading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error && events.length === 0) {
    return <ErrorMessage message={error} onRetry={fetchEvents} />;
  }

  return (
    <div className="p-4 md:p-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Key className="text-blue-600" size={32} />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Generate Tokens</h1>
        </div>
        <p className="text-gray-600 text-sm md:text-base">
          Generate invitation tokens for manual distribution without sending emails
        </p>
      </div>

      {/* Generation Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Token Generation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={generating}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.eventName} - {new Date(event.eventDate).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Tokens (1-100)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={tokenCount}
              onChange={(e) => setTokenCount(e.target.value)}
              onBlur={(e) => {
                const value = parseInt(e.target.value, 10);
                if (isNaN(value) || value < 1) {
                  setTokenCount('1');
                } else if (value > 100) {
                  setTokenCount('100');
                } else {
                  setTokenCount(value.toString());
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={generating}
              placeholder="Enter number (1-100)"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateTokens}
          disabled={generating || !selectedEventId}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Key size={20} />
              <span>Generate Tokens</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Tokens */}
      {generatedTokens.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Generated Tokens ({generatedTokens.length})
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyAll}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <Copy size={16} />
                <span>Copy All</span>
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Download size={16} />
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {generatedTokens.map((token, index) => (
              <div
                key={token.token}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      Token #{index + 1}
                    </span>
                    <span className="text-xs text-gray-400">
                      Expires: {new Date(token.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="font-mono text-sm text-gray-900 break-all">
                    {token.url}
                  </div>
                </div>
                <button
                  onClick={() => handleCopyUrl(token.url)}
                  className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto justify-center"
                >
                  {copiedUrl === token.url ? (
                    <>
                      <CheckCircle size={16} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> These tokens are valid for 30 days and can be used once. 
              Share these URLs manually with your invitees via your preferred communication method.
            </p>
          </div>
        </div>
      )}

      {/* Token History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Token History
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              All generated tokens for this event
            </p>
          </div>
          <button
            onClick={fetchTokenHistory}
            disabled={loadingHistory}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={loadingHistory ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tokenHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Key size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No tokens generated yet for this event</p>
            <p className="text-sm mt-2">Generate tokens above to get started</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Key size={20} />
                  <span className="text-sm font-medium">Total Tokens</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{tokenHistory.length}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <UserCheck size={20} />
                  <span className="text-sm font-medium">Used</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {tokenHistory.filter(t => t.isUsed).length}
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-600 mb-1">
                  <Clock size={20} />
                  <span className="text-sm font-medium">Available</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">
                  {tokenHistory.filter(t => !t.isUsed && new Date(t.expiresAt) > new Date()).length}
                </div>
              </div>
            </div>

            {/* Token List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {tokenHistory.map((token) => {
                const isExpired = new Date(token.expiresAt) < new Date();
                const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
                const tokenUrl = `${frontendUrl}/?token=${token.token}`;
                
                return (
                  <div
                    key={token.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border-2 ${
                      token.isUsed
                        ? 'bg-green-50 border-green-200'
                        : isExpired
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 mb-2">
                        {token.isUsed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle size={14} />
                            Used
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircle size={14} />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Clock size={14} />
                            Available
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          Created: {new Date(token.createdAt).toLocaleDateString()} at {new Date(token.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {token.isUsed && token.attendee && (
                        <div className="mb-2 p-2 bg-white rounded border border-green-200">
                          <div className="text-sm font-medium text-gray-900">
                            Used by: {token.attendee.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {token.attendee.email} • {token.attendee.registrationId}
                          </div>
                        </div>
                      )}
                      
                      <div className="font-mono text-xs text-gray-700 break-all">
                        {tokenUrl}
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(token.expiresAt).toLocaleDateString()} at {new Date(token.expiresAt).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {!token.isUsed && !isExpired && (
                      <button
                        onClick={() => handleCopyUrl(tokenUrl)}
                        className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto justify-center"
                      >
                        {copiedUrl === tokenUrl ? (
                          <>
                            <CheckCircle size={16} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}