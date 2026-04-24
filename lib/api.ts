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
    update: (id: string) => `/invite/${id}`,
    delete: (id: string) => `/invite/${id}`,
    resend: (id: string) => `/invite/resend/${id}`,
  },

  // Plus ones (admin)
  plusOnes: {
    add: (attendeeId: string) => `/admin/attendees/${attendeeId}/plus-one`,
    update: (plusOneId: string) => `/admin/plus-ones/${plusOneId}`,
    delete: (plusOneId: string) => `/admin/plus-ones/${plusOneId}`,
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

  // Illuminate Life - Bookings
  illuminate: {
    bookings: {
      list: (params?: URLSearchParams) => `/illuminate/bookings${params ? `?${params}` : ''}`,
      get: (id: string) => `/illuminate/bookings/${id}`,
      update: (id: string) => `/illuminate/bookings/${id}`,
      delete: (id: string) => `/illuminate/bookings/${id}`,
      assignSeats: (id: string) => `/illuminate/bookings/${id}/assign-seats`,
    },
    plusOnes: {
      add: (bookingId: string) => `/illuminate/bookings/${bookingId}/plus-ones`,
      update: (id: string) => `/illuminate/plus-ones/${id}`,
      delete: (id: string) => `/illuminate/plus-ones/${id}`,
      resendEmail: (id: string) => `/illuminate/plus-ones/${id}/resend-email`,
      checkIn: (qrCode: string) => `/illuminate/check-in/plus-one/${qrCode}`,
      verify: (qrCode: string) => `/illuminate/check-in/plus-one/${qrCode}/verify`,
    },
    sponsors: {
      list: (params?: URLSearchParams) => `/illuminate/sponsors${params ? `?${params}` : ''}`,
      get: (id: string) => `/illuminate/sponsors/${id}`,
      update: (id: string) => `/illuminate/sponsors/${id}`,
      delete: (id: string) => `/illuminate/sponsors/${id}`,
      uploadLogo: (id: string) => `/illuminate/sponsors/${id}/logo`,
      active: () => `/illuminate/sponsors/active`,
    },
    seats: {
      list: (params?: URLSearchParams) => `/illuminate/seats${params ? `?${params}` : ''}`,
      get: (id: string) => `/illuminate/seats/${id}`,
      create: () => `/illuminate/seats`,
      bulkCreate: () => `/illuminate/seats/bulk`,
      release: (id: string) => `/illuminate/seats/${id}/release`,
      delete: (id: string) => `/illuminate/seats/${id}`,
      availabilityOverview: () => `/illuminate/seats/availability-overview`,
    },
    dashboard: {
      stats: () => `/illuminate/admin/dashboard/stats`,
      activityLog: (params?: URLSearchParams) => `/illuminate/admin/activity-log${params ? `?${params}` : ''}`,
      export: (params?: URLSearchParams) => `/illuminate/admin/export/bookings${params ? `?${params}` : ''}`,
    },
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


// Illuminate Life API Helper Functions
export const illuminateApi = {
  // Bookings
  getBookings: async (filters?: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    return api.get<{
      bookings: any[];
      total: number;
      page: number;
      totalPages: number;
    }>(endpoints.illuminate.bookings.list(params));
  },

  getBooking: async (id: string) => {
    return api.get<{
      booking: any;
      activityLog: any[];
    }>(endpoints.illuminate.bookings.get(id));
  },

  updateBooking: async (id: string, data: any) => {
    return api.patch<{ success: boolean; booking: any }>(
      endpoints.illuminate.bookings.update(id),
      data
    );
  },

  deleteBooking: async (id: string) => {
    return api.delete<{ success: boolean; message: string }>(
      endpoints.illuminate.bookings.delete(id)
    );
  },

  assignSeats: async (bookingId: string, data: {
    seatNumbers: string[];
    tableNumber?: string;
    sendEmail?: boolean;
  }) => {
    return api.post<{ success: boolean; booking: any; message: string }>(
      endpoints.illuminate.bookings.assignSeats(bookingId),
      data
    );
  },

  updateSeatAssignments: async (bookingId: string, assignments: { name: string; seatNumber: string }[]) => {
    return api.patch<{ success: boolean; booking: any }>(
      `/illuminate/bookings/${bookingId}/seat-assignments`,
      { seatAssignments: assignments }
    );
  },

  createAdminBooking: async (data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    ticketTier: string;
    ticketName: string;
    quantity: number;
    pricePerUnit: number;
    totalAmount: number;
    specialRequests?: string;
    dietaryRestrictions?: string;
  }) => {
    return api.post<{ success: boolean; bookingId: string; message: string }>(
      '/illuminate/bookings/admin',
      data
    );
  },

  createAdminSponsor: async (data: {
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    companyName: string;
    sponsorTier: string;
    message?: string;
  }) => {
    return api.post<{ success: boolean; inquiryId: string }>(
      '/illuminate/bookings/admin/sponsor',
      data
    );
  },

  autoAssignSeats: async (bookingId: string) => {
    return api.post<{ success: boolean; message: string; booking: any }>(
      `/illuminate/bookings/${bookingId}/auto-assign`
    );
  },

  // Sponsors
  getSponsors: async (filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    return api.get<{
      sponsors: any[];
      total: number;
      page: number;
      totalPages: number;
    }>(endpoints.illuminate.sponsors.list(params));
  },

  updateSponsor: async (id: string, data: any) => {
    return api.patch<{ success: boolean; sponsor: any }>(
      endpoints.illuminate.sponsors.update(id),
      data
    );
  },

  uploadSponsorLogo: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${endpoints.illuminate.sponsors.uploadLogo(id)}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    
    return handleResponse<{ success: boolean; logoUrl: string }>(response);
  },

  deleteSponsor: async (id: string) => {
    return api.delete<{ success: boolean; message: string }>(
      endpoints.illuminate.sponsors.delete(id)
    );
  },

  // Branding Opportunities
  getBranding: async (filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    return api.get<{
      branding: any[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/illuminate/branding?${params.toString()}`);
  },

  // Seats
  getSeats: async (filters?: {
    seatType?: string;
    isAvailable?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    return api.get<{
      seats: any[];
      total: number;
      available: number;
      reserved: number;
    }>(endpoints.illuminate.seats.list(params));
  },

  getSeatAvailability: async () => {
    return api.get<any>(endpoints.illuminate.seats.availabilityOverview());
  },

  createSeat: async (data: any) => {
    return api.post<{ success: boolean; seat: any }>(
      endpoints.illuminate.seats.create(),
      data
    );
  },

  bulkCreateSeats: async (seats: any[]) => {
    return api.post<{ success: boolean; created: number; message: string }>(
      endpoints.illuminate.seats.bulkCreate(),
      { seats }
    );
  },

  releaseSeat: async (seatId: string) => {
    return api.patch<{ success: boolean; seat: any }>(
      endpoints.illuminate.seats.release(seatId)
    );
  },

  deleteSeat: async (seatId: string) => {
    return api.delete<{ success: boolean; message: string }>(
      endpoints.illuminate.seats.delete(seatId)
    );
  },

  // Plus Ones
  addPlusOne: async (bookingId: string, data: {
    name: string;
    email: string;
    phone?: string;
    dietaryRestrictions?: string;
    specialRequests?: string;
  }) => {
    return api.post<{ success: boolean; plusOne: any; message: string }>(
      endpoints.illuminate.plusOnes.add(bookingId),
      data
    );
  },

  updatePlusOne: async (id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    dietaryRestrictions?: string;
    specialRequests?: string;
  }) => {
    return api.patch<{ success: boolean; plusOne: any }>(
      endpoints.illuminate.plusOnes.update(id),
      data
    );
  },

  deletePlusOne: async (id: string) => {
    return api.delete<{ success: boolean; message: string }>(
      endpoints.illuminate.plusOnes.delete(id)
    );
  },

  resendPlusOneEmail: async (id: string) => {
    return api.post<{ success: boolean; message: string }>(
      endpoints.illuminate.plusOnes.resendEmail(id)
    );
  },

  checkInPlusOne: async (qrCode: string) => {
    return api.post<{ success: boolean; plusOne: any; message: string }>(
      endpoints.illuminate.plusOnes.checkIn(qrCode)
    );
  },

  verifyPlusOneQr: async (qrCode: string) => {
    return api.get<{ valid: boolean; plusOne?: any; message?: string }>(
      endpoints.illuminate.plusOnes.verify(qrCode)
    );
  },

  // Dashboard
  getDashboardStats: async () => {
    return api.get<any>(endpoints.illuminate.dashboard.stats());
  },

  getActivityLog: async (filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    return api.get<{
      logs: any[];
      total: number;
      page: number;
      totalPages: number;
    }>(endpoints.illuminate.dashboard.activityLog(params));
  },

  exportBookings: async (filters?: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${endpoints.illuminate.dashboard.export(params)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    
    if (!response.ok) {
      throw new APIError(response.status, 'Failed to export bookings');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `illuminate-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
