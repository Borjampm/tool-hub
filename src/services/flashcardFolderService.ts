import { supabase } from '../lib/supabase';
import type { FlashcardFolder } from '../lib/supabase';

export interface CreateFolderData {
  name: string;
}

export interface UpdateFolderData {
  name: string;
}

export class FlashcardFolderService {
  /**
   * Get all folders for the authenticated user
   */
  static async getFolders(): Promise<FlashcardFolder[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to access folders');
    }

    const { data: folders, error } = await supabase
      .from('flashcard_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching flashcard folders:', error);
      throw new Error(`Failed to fetch folders: ${error.message}`);
    }

    return folders || [];
  }

  /**
   * Create a new folder
   */
  static async createFolder(data: CreateFolderData): Promise<FlashcardFolder> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to create folders');
    }

    const trimmedName = data.name.trim();

    // Check if folder name already exists (case-insensitive check via database constraint)
    const { data: existingFolders } = await supabase
      .from('flashcard_folders')
      .select('name')
      .eq('user_id', user.id)
      .ilike('name', trimmedName);

    if (existingFolders && existingFolders.length > 0) {
      throw new Error(`Folder "${trimmedName}" already exists`);
    }

    const { data: folder, error } = await supabase
      .from('flashcard_folders')
      .insert({
        user_id: user.id,
        name: trimmedName,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }

    return folder;
  }

  /**
   * Update a folder's name
   */
  static async updateFolder(folderId: string, data: UpdateFolderData): Promise<FlashcardFolder> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to update folders');
    }

    const trimmedName = data.name.trim();

    // Check if new name already exists for another folder
    const { data: existingFolders } = await supabase
      .from('flashcard_folders')
      .select('id, name')
      .eq('user_id', user.id)
      .ilike('name', trimmedName)
      .neq('id', folderId);

    if (existingFolders && existingFolders.length > 0) {
      throw new Error(`Folder "${trimmedName}" already exists`);
    }

    const { data: folder, error } = await supabase
      .from('flashcard_folders')
      .update({ name: trimmedName })
      .eq('id', folderId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating folder:', error);
      throw new Error(`Failed to update folder: ${error.message}`);
    }

    return folder;
  }

  /**
   * Delete a folder (cascades to cards)
   */
  static async deleteFolder(folderId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to delete folders');
    }

    const { error } = await supabase
      .from('flashcard_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting folder:', error);
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  }

  /**
   * Get a single folder by ID
   */
  static async getFolderById(folderId: string): Promise<FlashcardFolder | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to access folders');
    }

    const { data: folder, error } = await supabase
      .from('flashcard_folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching folder:', error);
      throw new Error(`Failed to fetch folder: ${error.message}`);
    }

    return folder;
  }
}
