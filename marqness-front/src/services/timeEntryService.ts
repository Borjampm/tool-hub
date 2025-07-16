import { supabase } from '../lib/supabase';
import type { TimeEntry } from '../lib/supabase';

export interface CreateTimeEntryData {
  entryId: string;
  startTime: Date;
}

export interface CompleteTimeEntryData {
  name: string;
  description?: string;
  category?: string;
  endTime: Date;
  elapsedTime: number;
}

export class TimeEntryService {
  /**
   * Create a new time entry when the timer starts
   */
  static async createEntry(data: CreateTimeEntryData): Promise<TimeEntry> {
    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        entry_id: data.entryId,
        name: 'Untitled Activity', // Temporary name, will be updated when completed
        start_time: data.startTime.toISOString(),
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
        category: data.category,
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
   * Get all time entries, ordered by creation date (newest first)
   */
  static async getAllEntries(): Promise<TimeEntry[]> {
    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching time entries:', error);
      throw new Error(`Failed to fetch time entries: ${error.message}`);
    }

    return entries || [];
  }

  /**
   * Get a specific time entry by entry_id
   */
  static async getEntry(entryId: string): Promise<TimeEntry | null> {
    const { data: entry, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('entry_id', entryId)
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
   * Delete a time entry by entry_id
   */
  static async deleteEntry(entryId: string): Promise<void> {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('entry_id', entryId);

    if (error) {
      console.error('Error deleting time entry:', error);
      throw new Error(`Failed to delete time entry: ${error.message}`);
    }
  }
} 