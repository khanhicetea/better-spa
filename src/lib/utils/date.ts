/**
 * Date utilities using date-fns and date-fns-tz
 *
 * Best practices:
 * - All dates are stored in UTC in PostgreSQL (timestamptz)
 * - Convert to user's timezone only for display
 * - Use ISO strings with 'Z' suffix for UTC dates
 */

import {
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Format a date to a readable string with user's local timezone
 *
 * @param date - Date object or ISO string
 * @param formatStr - Format string (default: "MMM d, yyyy h:mm a")
 * @param timeZone - User's timezone (defaults to browser timezone)
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date()) // "Jan 6, 2026 3:45 PM"
 * formatDate("2026-01-06T12:00:00Z") // "Jan 6, 2026 7:00 AM" (in EST)
 */
export function formatDate(
  date: Date | string,
  formatStr: string = "MMM d, yyyy h:mm a",
  timeZone?: string,
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return timeZone
    ? formatInTimeZone(dateObj, timeZone, formatStr)
    : format(dateObj, formatStr);
}

/**
 * Format a date to a short time string (no date)
 *
 * @param date - Date object or ISO string
 * @param timeZone - User's timezone
 * @returns Formatted time string
 *
 * @example
 * formatTime(new Date()) // "3:45 PM"
 */
export function formatTime(date: Date | string, timeZone?: string): string {
  return formatDate(date, "h:mm a", timeZone);
}

/**
 * Format a date to a short date string (no time)
 *
 * @param date - Date object or ISO string
 * @param timeZone - User's timezone
 * @returns Formatted date string
 *
 * @example
 * formatDateOnly(new Date()) // "Jan 6, 2026"
 */
export function formatDateOnly(date: Date | string, timeZone?: string): string {
  return formatDate(date, "MMM d, yyyy", timeZone);
}

/**
 * Format a date to relative time (e.g., "2 hours ago", "in 3 days")
 *
 * @param date - Date object or ISO string
 * @param addSuffix - Whether to add suffix like "ago" or "in"
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 */
export function formatRelativeTime(
  date: Date | string,
  addSuffix: boolean = true,
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix });
}

/**
 * Format a date to ISO string in UTC
 * Always use this when sending dates to the server
 *
 * @param date - Date object
 * @returns ISO string with 'Z' suffix
 *
 * @example
 * toUTCString(new Date()) // "2026-01-06T12:00:00.000Z"
 */
export function toUTCString(date: Date): string {
  return date.toISOString();
}

/**
 * Get the user's timezone from the browser
 *
 * @returns Timezone string (e.g., "America/New_York")
 */
export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a date with smart display:
 * - If today: show time only
 * - If yesterday: show "Yesterday at time"
 * - Otherwise: show full date and time
 *
 * @param date - Date object or ISO string
 * @param timeZone - User's timezone
 * @returns Smart formatted date string
 *
 * @example
 * formatSmart(new Date()) // "3:45 PM" (if today)
 * formatSmart(new Date(Date.now() - 86400000)) // "Yesterday at 3:45 PM"
 * formatSmart(new Date(Date.now() - 172800000)) // "Jan 4, 2026 3:45 PM"
 */
export function formatSmart(date: Date | string, timeZone?: string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  const tz = timeZone || getUserTimeZone();

  if (isToday(dateObj)) {
    return formatInTimeZone(dateObj, tz, "'Today at' h:mm a");
  }

  if (isYesterday(dateObj)) {
    return formatInTimeZone(dateObj, tz, "'Yesterday at' h:mm a");
  }

  return formatDate(date, "MMM d, yyyy h:mm a", tz);
}

/**
 * Check if a date is in the past
 *
 * @param date - Date object or ISO string
 * @returns True if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return isBefore(dateObj, new Date());
}

/**
 * Check if a date is in the future
 *
 * @param date - Date object or ISO string
 * @returns True if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return isAfter(dateObj, new Date());
}

/**
 * Format a date for datetime-local input (HTML5)
 * Returns format: "YYYY-MM-DDTHH:mm"
 *
 * @param date - Date object or ISO string
 * @returns Formatted string for datetime-local input
 *
 * @example
 * formatForDateTimeLocal(new Date()) // "2026-01-06T15:45"
 */
export function formatForDateTimeLocal(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
