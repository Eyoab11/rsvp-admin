// API client for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Helper to get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails;

    if (isJson) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorDetails = errorData;
      } catch {
        // If JSON parsing fails, use default error message
      }
    }

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        // Redirect to login with message
        window.location.href = '/login?error=session_expired';
      }
    }

    throw new APIError(response.status, errorMessage, errorDetails);
  }

  if (isJson) {
    return response.json();
  }

  // For non-JSON responses (like CSV exports)
  return response.text() as any;
}

// Generic request function
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers
  if (options.headers) {
    const existingHeaders = new Headers(options.headers);
    existingHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  console.log('API Request:', { url, method: options.method || 'GET', headers });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('API Response:', { status: response.status, statusText: response.statusText });

    return handleResponse<T>(response);
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof APIError) {
      throw error;
    }
    // Network or other errors
    throw new APIError(0, 'Network error. Please check your connection.');
  }
}

// HTTP method helpers
export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

// API endpoints
export const endpoints = {
  // Auth
  login: () => '/auth/login',
  logout: () => '/auth/logout',

  // Events
  events: {
    list: () => '/event',
    get: (id: string) => `/event/${id}`,
    create: () => '/event',
    update: (id: string) => `/event/${id}`,
    delete: (id: string) => `/event/${id}`,
  },

  // Admin
  admin: {
    attendees: (eventId: string) => `/admin/events/${eventId}/attendees`,
    stats: (eventId: string) => `/admin/events/${eventId}/stats`,
    export: (eventId: string) => `/admin/events/${eventId}/export`,
    cancel: (attendeeId: string) => `/admin/attendees/${attendeeId}`,
    dashboardStats: () => '/admin/dashboard-stats',
  },

  // Invites
  invites: {
    list: (eventId: string) => `/invite/event/${eventId}`,
    create: () => '/invite/create',
    resend: (id: string) => `/invite/resend/${id}`,
  },

  // RSVP
  rsvp: {
    attendee: (id: string) => `/rsvp/success/${id}`,
  },

  // QR
  qr: {
    attendee: (attendeeId: string) => `/qr/attendee/${attendeeId}`,
    validate: (qrCode: string) => `/qr/validate/${qrCode}`,
  },

  // Emails (future endpoint - not yet implemented in backend)
  emails: {
    list: () => '/admin/emails',
    get: (id: string) => `/admin/emails/${id}`,
    resend: (id: string) => `/admin/emails/${id}/resend`,
  },
};

// User-friendly error messages
export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    switch (error.statusCode) {
      case 400:
        return error.message || 'Invalid request. Please check your input.';
      case 401:
        // Return the actual error message from the backend for 401 errors
        // This allows us to show "Invalid email or password" for login failures
        // and "Session expired" for token expiration
        return error.message || 'Authentication failed. Please log in again.';
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}
