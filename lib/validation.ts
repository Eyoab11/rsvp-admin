import { z } from 'zod';

// Event Form Validation Schema
export const eventSchema = z.object({
  eventName: z.string().min(1, 'Event name is required').max(200, 'Event name is too long'),
  description: z.string().optional(),
  eventDate: z.string().min(1, 'Event date is required'),
  eventStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  eventEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  venueName: z.string().min(1, 'Venue name is required').max(200, 'Venue name is too long'),
  venueAddress: z.string().min(1, 'Address is required').max(300, 'Address is too long'),
  venueCity: z.string().min(1, 'City is required').max(100, 'City name is too long'),
  venueState: z.string().length(2, 'State must be 2 characters (e.g., CA)').regex(/^[A-Z]{2}$/, 'State must be uppercase letters'),
  venueZipCode: z.string().regex(/^\d{5}$/, 'Zip code must be 5 digits'),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100000, 'Capacity is too large'),
  waitlistEnabled: z.boolean(),
  registrationOpen: z.boolean(),
  dressCode: z.string().min(1, 'Dress code is required').max(100, 'Dress code is too long'),
}).refine((data) => {
  // Validate that end time is after start time
  if (data.eventStartTime && data.eventEndTime) {
    const [startHour, startMin] = data.eventStartTime.split(':').map(Number);
    const [endHour, endMin] = data.eventEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['eventEndTime'],
});

export type EventFormData = z.infer<typeof eventSchema>;

// Single Invite Form Validation Schema
export const inviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  eventId: z.string().min(1, 'Event is required'),
  inviteType: z.enum(['VIP', 'PARTNER', 'GENERAL'], {
    errorMap: () => ({ message: 'Invalid invite type' }),
  }),
  sendEmail: z.boolean(),
});

export type InviteFormData = z.infer<typeof inviteSchema>;

// Bulk Invite Item Schema
export const bulkInviteItemSchema = z.object({
  email: z.string().email('Invalid email address'),
  inviteType: z.enum(['VIP', 'PARTNER', 'GENERAL']),
});

// Bulk Invite Form Validation Schema
export const bulkInviteSchema = z.object({
  eventId: z.string().min(1, 'Event is required'),
  sendEmails: z.boolean(),
  invites: z.array(bulkInviteItemSchema).min(1, 'At least one invite is required'),
});

export type BulkInviteFormData = z.infer<typeof bulkInviteSchema>;
