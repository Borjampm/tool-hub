import { supabase } from '../lib/supabase';
import type { FlashcardCard, FlashcardCardSide, FlashcardCardType } from '../lib/supabase';

export interface CreateCardData {
  folder_id: string;
  card_type: FlashcardCardType;
  front: string;
  back: string;
}

export interface UpdateCardData {
  folder_id?: string;
  card_type?: FlashcardCardType;
  front?: string;
  back?: string;
}

export interface CardWithSides extends FlashcardCard {
  sides: FlashcardCardSide[];
}

/**
 * Count the number of cloze deletions in text
 * Cloze markers are in the format {{...}}
 */
function countClozeMarkers(text: string): number {
  const matches = text.match(/\{\{[^}]+\}\}/g);
  return matches ? matches.length : 0;
}

/**
 * Get the number of sides for a card type
 */
function getSideCount(cardType: FlashcardCardType, front: string): number {
  switch (cardType) {
    case 'basic':
      return 1;
    case 'reversible':
      return 2;
    case 'cloze':
      return Math.max(1, countClozeMarkers(front));
  }
}

export class FlashcardCardService {
  /**
   * Get all cards in a folder with their sides
   */
  static async getCardsByFolder(folderId: string): Promise<CardWithSides[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to access cards');
    }

    const { data: cards, error } = await supabase
      .from('flashcard_cards')
      .select('*, flashcard_card_sides(*)')
      .eq('user_id', user.id)
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      throw new Error(`Failed to fetch cards: ${error.message}`);
    }

    return (cards || []).map(card => ({
      ...card,
      sides: (card.flashcard_card_sides || []).sort(
        (a: FlashcardCardSide, b: FlashcardCardSide) => a.side_index - b.side_index
      ),
    }));
  }

  /**
   * Get all cards for the user with their sides
   */
  static async getAllCards(): Promise<CardWithSides[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to access cards');
    }

    const { data: cards, error } = await supabase
      .from('flashcard_cards')
      .select('*, flashcard_card_sides(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      throw new Error(`Failed to fetch cards: ${error.message}`);
    }

    return (cards || []).map(card => ({
      ...card,
      sides: (card.flashcard_card_sides || []).sort(
        (a: FlashcardCardSide, b: FlashcardCardSide) => a.side_index - b.side_index
      ),
    }));
  }

  /**
   * Create a new card with sides initialized
   */
  static async createCard(data: CreateCardData): Promise<CardWithSides> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to create cards');
    }

    // Validate cloze cards have at least one marker
    if (data.card_type === 'cloze' && countClozeMarkers(data.front) === 0) {
      throw new Error('Cloze cards must have at least one {{...}} marker');
    }

    // Create the card
    const { data: card, error: cardError } = await supabase
      .from('flashcard_cards')
      .insert({
        user_id: user.id,
        folder_id: data.folder_id,
        card_type: data.card_type,
        front: data.front.trim(),
        back: data.back.trim(),
      })
      .select()
      .single();

    if (cardError) {
      console.error('Error creating card:', cardError);
      throw new Error(`Failed to create card: ${cardError.message}`);
    }

    // Create the sides
    const sideCount = getSideCount(data.card_type, data.front);
    const sidesToInsert = Array.from({ length: sideCount }, (_, index) => ({
      user_id: user.id,
      card_id: card.id,
      side_index: index,
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      next_review: null,
    }));

    const { data: sides, error: sidesError } = await supabase
      .from('flashcard_card_sides')
      .insert(sidesToInsert)
      .select();

    if (sidesError) {
      console.error('Error creating card sides:', sidesError);
      // Cleanup: delete the card if sides failed
      await supabase.from('flashcard_cards').delete().eq('id', card.id);
      throw new Error(`Failed to create card sides: ${sidesError.message}`);
    }

    return {
      ...card,
      sides: (sides || []).sort((a, b) => a.side_index - b.side_index),
    };
  }

  /**
   * Update a card, recreating sides if type changes
   */
  static async updateCard(cardId: string, data: UpdateCardData): Promise<CardWithSides> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to update cards');
    }

    // Get existing card
    const { data: existingCard, error: fetchError } = await supabase
      .from('flashcard_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingCard) {
      throw new Error('Card not found');
    }

    const newCardType = data.card_type || existingCard.card_type;
    const newFront = data.front !== undefined ? data.front.trim() : existingCard.front;

    // Validate cloze cards
    if (newCardType === 'cloze' && countClozeMarkers(newFront) === 0) {
      throw new Error('Cloze cards must have at least one {{...}} marker');
    }

    // Update the card
    const updateData: Partial<FlashcardCard> = {};
    if (data.folder_id !== undefined) updateData.folder_id = data.folder_id;
    if (data.card_type !== undefined) updateData.card_type = data.card_type;
    if (data.front !== undefined) updateData.front = data.front.trim();
    if (data.back !== undefined) updateData.back = data.back.trim();

    const { data: updatedCard, error: updateError } = await supabase
      .from('flashcard_cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating card:', updateError);
      throw new Error(`Failed to update card: ${updateError.message}`);
    }

    // Check if we need to recreate sides
    const oldSideCount = getSideCount(existingCard.card_type, existingCard.front);
    const newSideCount = getSideCount(newCardType, newFront);

    if (data.card_type !== undefined ||
        (newCardType === 'cloze' && oldSideCount !== newSideCount)) {
      // Delete existing sides
      await supabase
        .from('flashcard_card_sides')
        .delete()
        .eq('card_id', cardId)
        .eq('user_id', user.id);

      // Create new sides
      const sidesToInsert = Array.from({ length: newSideCount }, (_, index) => ({
        user_id: user.id,
        card_id: cardId,
        side_index: index,
        ease_factor: 2.5,
        interval_days: 0,
        repetitions: 0,
        next_review: null,
      }));

      const { data: sides, error: sidesError } = await supabase
        .from('flashcard_card_sides')
        .insert(sidesToInsert)
        .select();

      if (sidesError) {
        console.error('Error recreating card sides:', sidesError);
        throw new Error(`Failed to recreate card sides: ${sidesError.message}`);
      }

      return {
        ...updatedCard,
        sides: (sides || []).sort((a, b) => a.side_index - b.side_index),
      };
    }

    // Fetch existing sides
    const { data: sides, error: sidesError } = await supabase
      .from('flashcard_card_sides')
      .select('*')
      .eq('card_id', cardId)
      .eq('user_id', user.id)
      .order('side_index');

    if (sidesError) {
      console.error('Error fetching card sides:', sidesError);
      throw new Error(`Failed to fetch card sides: ${sidesError.message}`);
    }

    return {
      ...updatedCard,
      sides: sides || [],
    };
  }

  /**
   * Delete a single card
   */
  static async deleteCard(cardId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to delete cards');
    }

    const { error } = await supabase
      .from('flashcard_cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting card:', error);
      throw new Error(`Failed to delete card: ${error.message}`);
    }
  }

  /**
   * Delete multiple cards
   */
  static async deleteCards(cardIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to delete cards');
    }

    if (cardIds.length === 0) return;

    const { error } = await supabase
      .from('flashcard_cards')
      .delete()
      .eq('user_id', user.id)
      .in('id', cardIds);

    if (error) {
      console.error('Error deleting cards:', error);
      throw new Error(`Failed to delete cards: ${error.message}`);
    }
  }

  /**
   * Move cards to a different folder
   */
  static async moveCards(cardIds: string[], folderId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to move cards');
    }

    if (cardIds.length === 0) return;

    const { error } = await supabase
      .from('flashcard_cards')
      .update({ folder_id: folderId })
      .eq('user_id', user.id)
      .in('id', cardIds);

    if (error) {
      console.error('Error moving cards:', error);
      throw new Error(`Failed to move cards: ${error.message}`);
    }
  }

  /**
   * Get a single card by ID with its sides
   */
  static async getCardById(cardId: string): Promise<CardWithSides | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to access cards');
    }

    const { data: card, error } = await supabase
      .from('flashcard_cards')
      .select('*, flashcard_card_sides(*)')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching card:', error);
      throw new Error(`Failed to fetch card: ${error.message}`);
    }

    return {
      ...card,
      sides: (card.flashcard_card_sides || []).sort(
        (a: FlashcardCardSide, b: FlashcardCardSide) => a.side_index - b.side_index
      ),
    };
  }
}
