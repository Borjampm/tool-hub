import { supabase } from '../lib/supabase';
import type { UserSettings } from '../lib/supabase';

export interface UpdateUserSettingsData {
  weeklyHobbyGoalHours?: number;
  defaultCurrency?: string;
}

export class UserSettingsService {
  /**
   * Get user settings for the authenticated user. If no settings row exists,
   * returns sensible defaults without creating a row.
   */
  static async getSettings(): Promise<UserSettings> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to access settings');
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // PGRST116: No rows returned
      if ('code' in error && error.code === 'PGRST116') {
        return {
          user_id: user.id,
          weekly_hobby_goal_hours: 2,
          default_currency: 'CLP',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      console.error('Error fetching user settings:', error);
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }

    return data as UserSettings;
  }

  /**
   * Update or create user settings for the authenticated user.
   */
  static async updateSettings(data: UpdateUserSettingsData): Promise<UserSettings> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update settings');
    }

    const upsertPayload: Partial<UserSettings> & { user_id: string } = {
      user_id: user.id,
      ...(data.weeklyHobbyGoalHours !== undefined
        ? { weekly_hobby_goal_hours: data.weeklyHobbyGoalHours }
        : {}),
      ...(data.defaultCurrency !== undefined
        ? { default_currency: data.defaultCurrency }
        : {}),
    };

    const { data: row, error } = await supabase
      .from('user_settings')
      .upsert(upsertPayload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      throw new Error(`Failed to update settings: ${error.message}`);
    }

    return row as UserSettings;
  }
}


