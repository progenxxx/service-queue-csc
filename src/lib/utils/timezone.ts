/**
 * Timezone utility functions for handling date/time conversions
 * between different timezones for global users
 */

/**
 * Common timezones for the application
 */
export const TIMEZONES = {
  // US Timezones
  'America/New_York': 'Eastern Time (ET)',
  'America/Chicago': 'Central Time (CT)',
  'America/Denver': 'Mountain Time (MT)',
  'America/Los_Angeles': 'Pacific Time (PT)',

  // African Timezones
  'Africa/Harare': 'Central Africa Time (CAT) - Zimbabwe',
  'Africa/Johannesburg': 'South Africa Time (SAST)',
  'Africa/Cairo': 'Eastern European Time (EET)',
  'Africa/Lagos': 'West Africa Time (WAT)',

  // Other common timezones
  'Europe/London': 'British Time (GMT/BST)',
  'Europe/Paris': 'Central European Time (CET)',
  'Asia/Dubai': 'Gulf Standard Time (GST)',
  'Asia/Kolkata': 'India Standard Time (IST)',
  'UTC': 'Coordinated Universal Time (UTC)',
} as const;

export type TimezoneKey = keyof typeof TIMEZONES;

/**
 * Get the user's browser timezone
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a date/time string in a specific timezone
 */
export function formatInTimezone(
  dateString: string | Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    ...options,
  };

  return date.toLocaleString('en-US', defaultOptions);
}

/**
 * Format a date (without time) in a specific timezone
 */
export function formatDateInTimezone(
  dateString: string | Date,
  timezone: string
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
}

/**
 * Format a time (without date) in a specific timezone
 */
export function formatTimeInTimezone(
  dateString: string | Date,
  timezone: string
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
}

/**
 * Format due date with optional time in a specific timezone
 */
export function formatDueDateWithTime(
  dueDate: string | null,
  dueTime: string | null,
  timezone: string
): string {
  if (!dueDate) return '-';

  const date = new Date(dueDate);
  let dateStr = formatDateInTimezone(date, timezone);

  if (dueTime) {
    // Create a date object with the due time
    const [hours, minutes] = dueTime.split(':');
    const dateWithTime = new Date(dueDate);
    dateWithTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

    const timeStr = formatTimeInTimezone(dateWithTime, timezone);
    dateStr += ` at ${timeStr}`;
  }

  return dateStr;
}

/**
 * Convert a local date/time input to UTC for storage
 */
export function convertToUTC(
  dateString: string,
  timeString: string | null,
  fromTimezone: string
): Date {
  // Create a date string in ISO format
  const dateTimeString = timeString
    ? `${dateString}T${timeString}:00`
    : `${dateString}T00:00:00`;

  // Parse as if it's in the user's timezone
  // Note: This is a simplified approach. For production, consider using a library like date-fns-tz
  const date = new Date(dateTimeString);

  return date;
}

/**
 * Check if a due date is overdue considering timezone
 */
export function isOverdue(
  dueDate: string | null,
  taskStatus: string,
  timezone: string
): boolean {
  if (!dueDate || taskStatus === 'closed') return false;

  const now = new Date();
  const due = new Date(dueDate);

  return due < now;
}

/**
 * Get timezone offset string (e.g., "GMT-5" or "GMT+2")
 */
export function getTimezoneOffset(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(now);
  const timeZonePart = parts.find(part => part.type === 'timeZoneName');

  return timeZonePart?.value || '';
}

/**
 * Format date for input field (YYYY-MM-DD) considering timezone
 */
export function formatDateForInput(
  dateString: string | Date | null,
  timezone: string
): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  // Get the date components in the user's timezone
  const year = date.toLocaleDateString('en-US', { year: 'numeric', timeZone: timezone });
  const month = date.toLocaleDateString('en-US', { month: '2-digit', timeZone: timezone });
  const day = date.toLocaleDateString('en-US', { day: '2-digit', timeZone: timezone });

  return `${year}-${month}-${day}`;
}

/**
 * Format time for input field (HH:MM) considering timezone
 */
export function formatTimeForInput(
  dateString: string | Date | null,
  timezone: string
): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  const hour = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: timezone
  });
  const minute = date.toLocaleTimeString('en-US', {
    minute: '2-digit',
    timeZone: timezone
  });

  return `${hour}:${minute}`;
}