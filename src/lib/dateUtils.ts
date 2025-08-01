/**
 * Timezone-aware date formatting utilities
 * Provides consistent date/time formatting that respects user's local timezone
 */

/**
 * Format a date string to show in day/month/year format with time (24-hour format)
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a date string to show in day/month/year format with time, 
 * rounded to the nearest minute (no seconds, 24-hour format)
 */
export function formatDateTimeRounded(dateString: string): string {
  const date = new Date(dateString);
  // Round to nearest minute
  const roundedDate = new Date(date);
  const seconds = date.getSeconds();
  if (seconds >= 30) {
    roundedDate.setMinutes(date.getMinutes() + 1);
  }
  roundedDate.setSeconds(0, 0); // Remove seconds and milliseconds
  
  return roundedDate.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a date string to show only the date in day/month/year format
 * This function handles timezone-safe date parsing for date-only values (YYYY-MM-DD)
 */
export function formatDate(dateString: string): string {
  // Check if this is a date-only string (YYYY-MM-DD format)
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Parse date components manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    // Create a date in local timezone (month is 0-indexed in Date constructor)
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  
  // For datetime strings, use the original method
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format a date string to show only the time in user's local timezone (24-hour format)
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a date string to show only the time in user's local timezone, 
 * rounded to the nearest minute (no seconds, 24-hour format)
 */
export function formatTimeRounded(dateString: string): string {
  const date = new Date(dateString);
  // Round to nearest minute
  const roundedDate = new Date(date);
  const seconds = date.getSeconds();
  if (seconds >= 30) {
    roundedDate.setMinutes(date.getMinutes() + 1);
  }
  roundedDate.setSeconds(0, 0); // Remove seconds and milliseconds
  
  return roundedDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a time range (start and end times) in user's local timezone
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  return `${start} - ${end}`;
}

/**
 * Format a time range (start and end times) in user's local timezone,
 * rounded to the nearest minute (no seconds)
 */
export function formatTimeRangeRounded(startTime: string, endTime: string): string {
  const start = formatTimeRounded(startTime);
  const end = formatTimeRounded(endTime);
  return `${start} - ${end}`;
}

/**
 * Format elapsed time duration from seconds to human readable format (no seconds shown)
 */
export function formatDuration(totalSeconds: number | undefined): string {
  if (!totalSeconds) return '0m';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    // For durations less than 1 minute, round up to 1 minute
    return '1m';
  }
}

/**
 * Convert a UTC timestamp to local datetime string for HTML datetime-local input
 * This ensures that datetime-local inputs display the correct local time
 */
export function toLocalDateTimeString(dateString: string): string {
  const date = new Date(dateString);
  // Get local time components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get a human-readable relative time (e.g., "2 hours ago", "yesterday")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'Just now';
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
  } else {
    return formatDate(dateString);
  }
} 