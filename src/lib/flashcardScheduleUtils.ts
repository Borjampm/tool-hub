/**
 * Utility functions for flashcard schedule display
 * Calculates aggregate status and formatting for card sides
 */

import type { FlashcardCardSide, FlashcardCardType } from './supabase';

export type CardStatus = 'new' | 'due' | 'overdue' | 'scheduled';

export interface CardScheduleInfo {
  status: CardStatus;
  earliestDue: Date | null;
  averageEase: number;
  sidesLearned: number;
  totalSides: number;
}

/**
 * Calculate aggregate schedule info from card sides
 * Uses worst-case (earliest due, lowest ease) for multi-side cards
 */
export function getCardScheduleInfo(sides: FlashcardCardSide[]): CardScheduleInfo {
  if (sides.length === 0) {
    return {
      status: 'new',
      earliestDue: null,
      averageEase: 2.5,
      sidesLearned: 0,
      totalSides: 0,
    };
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let earliestDue: Date | null = null;
  let totalEase = 0;
  let sidesLearned = 0;
  let hasNewSide = false;
  let hasDueSide = false;
  let hasOverdueSide = false;

  for (const side of sides) {
    totalEase += side.ease_factor;

    if (side.repetitions > 0) {
      sidesLearned++;
    }

    if (side.next_review === null) {
      hasNewSide = true;
    } else {
      const dueDate = new Date(side.next_review);

      // Track earliest due date
      if (earliestDue === null || dueDate < earliestDue) {
        earliestDue = dueDate;
      }

      // Check status: due today (including later today) counts as due
      if (dueDate < oneDayAgo) {
        hasOverdueSide = true;
      } else if (dueDate <= endOfToday) {
        hasDueSide = true;
      }
    }
  }

  // Determine overall status (worst case wins)
  let status: CardStatus;
  if (hasOverdueSide) {
    status = 'overdue';
  } else if (hasDueSide) {
    status = 'due';
  } else if (hasNewSide && sidesLearned === 0) {
    status = 'new';
  } else if (earliestDue === null) {
    status = 'new';
  } else {
    status = 'scheduled';
  }

  return {
    status,
    earliestDue,
    averageEase: totalEase / sides.length,
    sidesLearned,
    totalSides: sides.length,
  };
}

/**
 * Get Tailwind classes for status badge
 */
export function getStatusBadgeStyle(status: CardStatus): string {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-700';
    case 'due':
      return 'bg-amber-100 text-amber-700';
    case 'overdue':
      return 'bg-red-100 text-red-700';
    case 'scheduled':
      return 'bg-green-100 text-green-700';
  }
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: CardStatus): string {
  switch (status) {
    case 'new':
      return 'New';
    case 'due':
      return 'Due';
    case 'overdue':
      return 'Overdue';
    case 'scheduled':
      return 'Scheduled';
  }
}

/**
 * Get ease interpretation with label and color
 */
export function getEaseInfo(ease: number): { label: string; colorClass: string } {
  if (ease >= 2.5) {
    return { label: 'Easy', colorClass: 'text-green-600' };
  } else if (ease >= 2.0) {
    return { label: 'Normal', colorClass: 'text-gray-500' };
  } else if (ease >= 1.5) {
    return { label: 'Hard', colorClass: 'text-amber-600' };
  } else {
    return { label: 'Very Hard', colorClass: 'text-red-600' };
  }
}

/**
 * Get the number of calendar days between two dates in local timezone.
 * Returns negative if date is in the past, positive if in the future.
 */
function calendarDayDiff(from: Date, to: Date): number {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toDay.getTime() - fromDay.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format due date for display
 */
export function formatDueDate(date: Date | null, status: CardStatus): string {
  if (date === null || status === 'new') {
    return 'Never studied';
  }

  const now = new Date();
  const daysDiff = calendarDayDiff(now, date);

  if (status === 'overdue') {
    const overdueDays = Math.abs(daysDiff);
    if (overdueDays === 0) {
      return 'Due today';
    } else if (overdueDays === 1) {
      return '1 day overdue';
    } else {
      return `${overdueDays} days overdue`;
    }
  }

  if (status === 'due') {
    return 'Due today';
  }

  // Scheduled
  if (daysDiff === 0) {
    return 'Due today';
  } else if (daysDiff === 1) {
    return 'Due tomorrow';
  } else if (daysDiff < 7) {
    return `Due in ${daysDiff} days`;
  } else if (daysDiff < 30) {
    const weeks = Math.floor(daysDiff / 7);
    return `Due in ${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    const months = Math.floor(daysDiff / 30);
    return `Due in ${months} month${months > 1 ? 's' : ''}`;
  }
}

/**
 * Get a human-readable label for a card side based on card type and index
 */
export function getSideLabel(cardType: FlashcardCardType, sideIndex: number): string {
  switch (cardType) {
    case 'basic':
      return 'Front \u2192 Back';
    case 'reversible':
      return sideIndex === 0 ? 'Front \u2192 Back' : 'Back \u2192 Front';
    case 'cloze':
      return `Cloze ${sideIndex + 1}`;
    default:
      return `Side ${sideIndex + 1}`;
  }
}

/**
 * Get the schedule status for an individual card side
 */
export function getSideStatus(side: FlashcardCardSide): CardStatus {
  if (side.next_review === null) {
    return 'new';
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const dueDate = new Date(side.next_review);

  if (dueDate < oneDayAgo) {
    return 'overdue';
  } else if (dueDate <= endOfToday) {
    return 'due';
  } else {
    return 'scheduled';
  }
}

/**
 * Format an interval in days to a human-readable string
 */
export function formatInterval(days: number): string {
  if (days === 0) {
    return 'New';
  } else if (days === 1) {
    return '1 day';
  } else if (days < 7) {
    return `${days} days`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  } else {
    const years = Math.floor(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
  }
}
