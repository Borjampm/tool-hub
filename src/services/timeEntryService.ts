import { supabase } from '../lib/supabase';
import type { TimeEntry } from '../lib/supabase';

export interface CreateTimeEntryData {
  entryId: string;
  startTime: Date;
}

export interface CompleteTimeEntryData {
  name: string;
  description?: string;
  categoryId?: string; // Foreign key to hobby_categories.id
  endTime: Date;
  elapsedTime: number;
}

export interface ManualTimeEntryData {
  name: string;
  description?: string;
  categoryId?: string; // Foreign key to hobby_categories.id
  startTime: Date;
  endTime: Date;
  elapsedTime: number;
}

export interface UpdateTimeEntryData {
  name?: string;
  description?: string;
  categoryId?: string; // Foreign key to hobby_categories.id
  startTime?: Date;
  endTime?: Date;
  elapsedTime?: number;
}

export class TimeEntryService {
  /**
   * Create a new time entry when the timer starts
   */
  static async createEntry(data: CreateTimeEntryData): Promise<TimeEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create time entries');
    }

    // Prevent multiple in-progress entries (end_time IS NULL)
    const { data: existingInProgress, error: existingCheckError } = await supabase
      .from('time_entries')
      .select('id')
      .eq('user_id', user.id)
      .is('end_time', null)
      .limit(1)
      .maybeSingle();

    if (existingCheckError && existingCheckError.code !== 'PGRST116') {
      console.error('Error checking in-progress time entries:', existingCheckError);
      throw new Error(`Failed to validate existing in-progress entry: ${existingCheckError.message}`);
    }
    if (existingInProgress) {
      throw new Error('You already have an activity in progress. Please stop it before starting a new one.');
    }

    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        entry_id: data.entryId,
        name: 'Untitled Activity', // Temporary name, will be updated when completed
        start_time: data.startTime.toISOString(),
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating time entry:', error);
      throw new Error(`Failed to create time entry: ${error.message}`);
    }

    return entry;
  }

  /**
   * Complete a time entry with metadata when the timer stops
   */
  static async completeEntry(
    entryId: string,
    data: CompleteTimeEntryData
  ): Promise<TimeEntry> {
    const { data: entry, error } = await supabase
      .from('time_entries')
      .update({
        name: data.name,
        description: data.description,
        category_id: data.categoryId,
        end_time: data.endTime.toISOString(),
        elapsed_time: data.elapsedTime,
      })
      .eq('entry_id', entryId)
      .select()
      .single();

    if (error) {
      console.error('Error completing time entry:', error);
      throw new Error(`Failed to complete time entry: ${error.message}`);
    }

    return entry;
  }

  /**
   * Get all time entries for the authenticated user, ordered by creation date (newest first)
   */
  static async getAllEntries(): Promise<TimeEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to fetch time entries');
    }

    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching time entries:', error);
      throw new Error(`Failed to fetch time entries: ${error.message}`);
    }

    return entries || [];
  }

  /**
   * Get a specific time entry by entry_id for the authenticated user
   */
  static async getEntry(entryId: string): Promise<TimeEntry | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to fetch time entries');
    }

    const { data: entry, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('entry_id', entryId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching time entry:', error);
      throw new Error(`Failed to fetch time entry: ${error.message}`);
    }

    return entry;
  }

  /**
   * Get the single in-progress time entry for the authenticated user, if any
   */
  static async getInProgressEntry(): Promise<TimeEntry | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to fetch time entries');
    }

    const { data: entry, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching in-progress time entry:', error);
      throw new Error(`Failed to fetch in-progress time entry: ${error.message}`);
    }

    return entry ?? null;
  }

  /**
   * Delete a time entry by entry_id for the authenticated user
   */
  static async deleteEntry(entryId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to delete time entries');
    }

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('entry_id', entryId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting time entry:', error);
      throw new Error(`Failed to delete time entry: ${error.message}`);
    }
  }

  /**
   * Update an existing time entry
   */
  static async updateEntry(entryId: string, data: UpdateTimeEntryData): Promise<TimeEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update time entries');
    }

    const updateData: {
      name?: string;
      description?: string;
      category_id?: string;
      start_time?: string;
      end_time?: string;
      elapsed_time?: number;
    } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.startTime !== undefined) updateData.start_time = data.startTime.toISOString();
    if (data.endTime !== undefined) updateData.end_time = data.endTime.toISOString();
    if (data.elapsedTime !== undefined) updateData.elapsed_time = data.elapsedTime;

    const { data: entry, error } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('entry_id', entryId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating time entry:', error);
      throw new Error(`Failed to update time entry: ${error.message}`);
    }

    return entry;
  }

  /**
   * Create a manual time entry with complete data
   */
  static async createManualEntry(data: ManualTimeEntryData): Promise<TimeEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create time entries');
    }

    const entryId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        entry_id: entryId,
        name: data.name,
        description: data.description,
        category_id: data.categoryId,
        start_time: data.startTime.toISOString(),
        end_time: data.endTime.toISOString(),
        elapsed_time: data.elapsedTime,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating manual time entry:', error);
      throw new Error(`Failed to create manual time entry: ${error.message}`);
    }

    return entry;
  }

  /**
   * Check if the authenticated user has an in-progress entry (end_time IS NULL)
   */
  static async hasInProgressEntry(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to fetch time entries');
    }

    const { data: existing, error } = await supabase
      .from('time_entries')
      .select('id')
      .eq('user_id', user.id)
      .is('end_time', null)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking in-progress time entries:', error);
      throw new Error(`Failed to check in-progress entries: ${error.message}`);
    }

    return !!existing;
  }
} 