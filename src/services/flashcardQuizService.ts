import { supabase } from '../lib/supabase';
import type { FlashcardCard, FlashcardCardSide } from '../lib/supabase';

export interface DueCard extends FlashcardCard {
  side: FlashcardCardSide;
}

export type ReviewRating = 0 | 1 | 2 | 3; // Again, Hard, Good, Easy

/**
 * SM-2 Algorithm implementation for spaced repetition
 *
 * Rating meanings:
 * - 0 (Again): Complete failure, reset progress
 * - 1 (Hard): Correct but with difficulty
 * - 2 (Good): Correct with some hesitation
 * - 3 (Easy): Perfect recall
 */
function calculateSM2(
  currentEase: number,
  currentInterval: number,
  currentReps: number,
  rating: ReviewRating
): { ease: number; interval: number; reps: number } {
  let ease = currentEase;
  let interval = currentInterval;
  let reps = currentReps;

  switch (rating) {
    case 0: // Again
      reps = 0;
      interval = 1;
      ease = Math.max(1.3, ease - 0.2);
      break;

    case 1: // Hard
      interval = Math.max(1, Math.round(interval * 1.2));
      ease = Math.max(1.3, ease - 0.15);
      reps = reps + 1;
      break;

    case 2: // Good
      if (reps === 0) {
        interval = 1;
      } else if (reps === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease);
      }
      reps = reps + 1;
      break;

    case 3: // Easy
      if (reps === 0) {
        interval = 4;
      } else if (reps === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease * 1.3);
      }
      ease = ease + 0.15;
      reps = reps + 1;
      break;
  }

  return { ease, interval, reps };
}

export class FlashcardQuizService {
  /**
   * Get cards due for review
   * Cards are due if next_review <= now OR next_review IS NULL (new cards)
   */
  static async getDueCards(folderId?: string, limit?: number): Promise<DueCard[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to get due cards');
    }

    const now = new Date().toISOString();

    // Build query for due card sides
    let sidesQuery = supabase
      .from('flashcard_card_sides')
      .select('*')
      .eq('user_id', user.id)
      .or(`next_review.is.null,next_review.lte.${now}`)
      .order('next_review', { ascending: true, nullsFirst: true });

    if (limit) {
      sidesQuery = sidesQuery.limit(limit);
    }

    const { data: sides, error: sidesError } = await sidesQuery;

    if (sidesError) {
      console.error('Error fetching due card sides:', sidesError);
      throw new Error(`Failed to fetch due cards: ${sidesError.message}`);
    }

    if (!sides || sides.length === 0) {
      return [];
    }

    // Get unique card IDs
    const cardIds = [...new Set(sides.map(s => s.card_id))];

    // Fetch the cards
    let cardsQuery = supabase
      .from('flashcard_cards')
      .select('*')
      .eq('user_id', user.id)
      .in('id', cardIds);

    if (folderId) {
      cardsQuery = cardsQuery.eq('folder_id', folderId);
    }

    const { data: cards, error: cardsError } = await cardsQuery;

    if (cardsError) {
      console.error('Error fetching cards:', cardsError);
      throw new Error(`Failed to fetch cards: ${cardsError.message}`);
    }

    if (!cards || cards.length === 0) {
      return [];
    }

    // Create a map of cards
    const cardMap = new Map(cards.map(c => [c.id, c]));

    // Combine cards with their due sides
    const dueCards: DueCard[] = [];
    for (const side of sides) {
      const card = cardMap.get(side.card_id);
      if (card) {
        // If folder filter applied, card is already filtered
        if (!folderId || card.folder_id === folderId) {
          dueCards.push({
            ...card,
            side,
          });
        }
      }
    }

    // Apply limit after folder filtering
    return limit ? dueCards.slice(0, limit) : dueCards;
  }

  /**
   * Process a review and update the card side scheduling
   */
  static async processReview(cardSideId: string, rating: ReviewRating): Promise<FlashcardCardSide> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to process reviews');
    }

    // Get current card side
    const { data: currentSide, error: fetchError } = await supabase
      .from('flashcard_card_sides')
      .select('*')
      .eq('id', cardSideId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentSide) {
      throw new Error('Card side not found');
    }

    // Calculate new SM-2 values
    const { ease, interval, reps } = calculateSM2(
      currentSide.ease_factor,
      currentSide.interval_days,
      currentSide.repetitions,
      rating
    );

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    // Update the card side
    const { data: updatedSide, error: updateError } = await supabase
      .from('flashcard_card_sides')
      .update({
        ease_factor: ease,
        interval_days: interval,
        repetitions: reps,
        next_review: nextReview.toISOString(),
      })
      .eq('id', cardSideId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating card side:', updateError);
      throw new Error(`Failed to update card side: ${updateError.message}`);
    }

    return updatedSide;
  }

  /**
   * Get count of new cards (never reviewed)
   */
  static async getNewCardCount(folderId?: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to get card counts');
    }

    let query = supabase
      .from('flashcard_card_sides')
      .select('id, card_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('next_review', null);

    if (folderId) {
      // Need to filter by folder - get card IDs first
      const { data: cards } = await supabase
        .from('flashcard_cards')
        .select('id')
        .eq('user_id', user.id)
        .eq('folder_id', folderId);

      if (!cards || cards.length === 0) {
        return 0;
      }

      const cardIds = cards.map(c => c.id);
      query = query.in('card_id', cardIds);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting new card count:', error);
      throw new Error(`Failed to get new card count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get count of due cards (next_review <= now)
   */
  static async getDueCardCount(folderId?: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to get card counts');
    }

    const now = new Date().toISOString();

    let query = supabase
      .from('flashcard_card_sides')
      .select('id, card_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('next_review', 'is', null)
      .lte('next_review', now);

    if (folderId) {
      // Need to filter by folder - get card IDs first
      const { data: cards } = await supabase
        .from('flashcard_cards')
        .select('id')
        .eq('user_id', user.id)
        .eq('folder_id', folderId);

      if (!cards || cards.length === 0) {
        return 0;
      }

      const cardIds = cards.map(c => c.id);
      query = query.in('card_id', cardIds);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting due card count:', error);
      throw new Error(`Failed to get due card count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get combined count of cards available for study (new + due)
   */
  static async getStudyableCardCount(folderId?: string): Promise<{ newCount: number; dueCount: number; total: number }> {
    const [newCount, dueCount] = await Promise.all([
      this.getNewCardCount(folderId),
      this.getDueCardCount(folderId),
    ]);

    return {
      newCount,
      dueCount,
      total: newCount + dueCount,
    };
  }
}
