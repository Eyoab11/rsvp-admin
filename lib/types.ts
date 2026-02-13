// Type definitions matching backend Prisma schema

export type AttendeeStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';

export interface Event {
  id: string;
  eventName: string;
  description: string | null;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueState: string;
  venueZipCode: string;
  venueLatitude: number | null;
  venueLongitude: number | null;
  capacity: number;
  currentRegistrations: number;
  waitlistEnabled: boolean;
  registrationOpen: boolean;
  dressCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  token: string;
  isUsed: boolean;
  expiresAt: string;
  eventId: string;
  createdAt: string;
  event?: {
    eventName: string;
    eventDate: string;
  };
  attendee?: Attendee | null;
}

export interface PlusOne {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  attendeeId: string;
  createdAt: string;
  checkedInAt?: string | null;
}

export interface Attendee {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  status: AttendeeStatus;
  qrCode: string;
  registrationId: string;
  inviteId: string;
  eventId: string;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string | null;
  plusOne?: PlusOne | null;
  event?: {
    eventName: string;
    eventDate: string;
  };
}

export interface EventStats {
  totalCapacity: number;
  currentRegistrations: number;
  availableSlots: number;
  confirmedAttendees: number;
  waitlistedAttendees: number;
  cancelledAttendees: number;
  attendeesWithPlusOne: number;
  totalPlusOnes: number;
  inviteStats: {
    total: number;
    used: number;
    unused: number;
    expired: number;
  };
}

export interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  totalAttendees: number;
  confirmedAttendees: number;
  waitlistedAttendees: number;
  cancelledAttendees: number;
  totalInvites: number;
  usedInvites: number;
  pendingInvites: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: 'rsvp' | 'check_in' | 'invite_sent' | 'event_created';
  description: string;
  timestamp: string;
  eventName?: string;
}

// Email types
export type EmailType = 'invite' | 'confirmation' | 'reminder' | 'cancellation' | 'waitlist';
export type EmailDeliveryStatus = 'sent' | 'delivered' | 'failed' | 'bounced';

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
  deliveryStatus: EmailDeliveryStatus;
  errorMessage: string | null;
  emailType: EmailType;
  eventId: string | null;
  attendeeId: string | null;
  event?: {
    eventName: string;
  } | null;
}

// API Response wrapper
export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
