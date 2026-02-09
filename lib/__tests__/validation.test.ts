import { describe, it, expect } from '@jest/globals';
import { eventSchema, inviteSchema } from '../validation';

describe('Event Validation Schema', () => {
  it('should validate a valid event form', () => {
    const validEvent = {
      eventName: 'Test Event',
      description: 'A test event',
      eventDate: '2024-12-31',
      eventStartTime: '18:00',
      eventEndTime: '22:00',
      venueName: 'Test Venue',
      venueAddress: '123 Test St',
      venueCity: 'Test City',
      venueState: 'CA',
      venueZipCode: '12345',
      capacity: 100,
      waitlistEnabled: false,
      registrationOpen: true,
      dressCode: 'Business Casual',
    };

    const result = eventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('should reject event with missing required fields', () => {
    const invalidEvent = {
      eventName: '',
      eventDate: '',
      eventStartTime: '18:00',
      eventEndTime: '22:00',
    };

    const result = eventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject event with invalid state format', () => {
    const invalidEvent = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventStartTime: '18:00',
      eventEndTime: '22:00',
      venueName: 'Test Venue',
      venueAddress: '123 Test St',
      venueCity: 'Test City',
      venueState: 'California', // Should be 2 characters
      venueZipCode: '12345',
      capacity: 100,
      waitlistEnabled: false,
      registrationOpen: true,
      dressCode: 'Business Casual',
    };

    const result = eventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject event with invalid zip code', () => {
    const invalidEvent = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventStartTime: '18:00',
      eventEndTime: '22:00',
      venueName: 'Test Venue',
      venueAddress: '123 Test St',
      venueCity: 'Test City',
      venueState: 'CA',
      venueZipCode: '1234', // Should be 5 digits
      capacity: 100,
      waitlistEnabled: false,
      registrationOpen: true,
      dressCode: 'Business Casual',
    };

    const result = eventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject event with end time before start time', () => {
    const invalidEvent = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventStartTime: '22:00',
      eventEndTime: '18:00', // Before start time
      venueName: 'Test Venue',
      venueAddress: '123 Test St',
      venueCity: 'Test City',
      venueState: 'CA',
      venueZipCode: '12345',
      capacity: 100,
      waitlistEnabled: false,
      registrationOpen: true,
      dressCode: 'Business Casual',
    };

    const result = eventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject event with capacity less than 1', () => {
    const invalidEvent = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventStartTime: '18:00',
      eventEndTime: '22:00',
      venueName: 'Test Venue',
      venueAddress: '123 Test St',
      venueCity: 'Test City',
      venueState: 'CA',
      venueZipCode: '12345',
      capacity: 0, // Should be at least 1
      waitlistEnabled: false,
      registrationOpen: true,
      dressCode: 'Business Casual',
    };

    const result = eventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });
});

describe('Invite Validation Schema', () => {
  it('should validate a valid invite form', () => {
    const validInvite = {
      email: 'test@example.com',
      eventId: 'event-123',
      inviteType: 'GENERAL' as const,
      sendEmail: true,
    };

    const result = inviteSchema.safeParse(validInvite);
    expect(result.success).toBe(true);
  });

  it('should reject invite with invalid email', () => {
    const invalidInvite = {
      email: 'not-an-email',
      eventId: 'event-123',
      inviteType: 'GENERAL' as const,
      sendEmail: true,
    };

    const result = inviteSchema.safeParse(invalidInvite);
    expect(result.success).toBe(false);
  });

  it('should reject invite with missing email', () => {
    const invalidInvite = {
      email: '',
      eventId: 'event-123',
      inviteType: 'GENERAL' as const,
      sendEmail: true,
    };

    const result = inviteSchema.safeParse(invalidInvite);
    expect(result.success).toBe(false);
  });

  it('should reject invite with missing event', () => {
    const invalidInvite = {
      email: 'test@example.com',
      eventId: '',
      inviteType: 'GENERAL' as const,
      sendEmail: true,
    };

    const result = inviteSchema.safeParse(invalidInvite);
    expect(result.success).toBe(false);
  });

  it('should reject invite with invalid invite type', () => {
    const invalidInvite = {
      email: 'test@example.com',
      eventId: 'event-123',
      inviteType: 'INVALID' as any,
      sendEmail: true,
    };

    const result = inviteSchema.safeParse(invalidInvite);
    expect(result.success).toBe(false);
  });
});
