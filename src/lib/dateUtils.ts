/**
 * Timezone-aware date formatting utilities
 * Provides consistent date/time formatting that respects user's local timezone
 */

/**
 * Format a date string to show in user's local timezone with date and time
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date string to show only the date in user's local timezone
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string to show only the time in user's local timezone
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
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
 * Format elapsed time duration from seconds to human readable format
 */
export function formatDuration(totalSeconds: number | undefined): string {
  if (!totalSeconds) return '0s';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
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