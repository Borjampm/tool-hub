import { supabase } from '../lib/supabase';
import type { FlashcardSettings, FlashcardTheme } from '../lib/supabase';

export interface UpdateSettingsData {
  default_ease_factor?: number;
  daily_new_card_limit?: number;
  daily_review_limit?: number;
  theme?: FlashcardTheme;
}

const DEFAULT_SETTINGS: Omit<FlashcardSettings, 'user_id' | 'created_at' | 'updated_at'> = {
  default_ease_factor: 2.5,
  daily_new_card_limit: 20,
  daily_review_limit: 100,
  theme: 'system',
};

export class FlashcardSettingsService {
  /**
   * Get settings for the authenticated user
   * Returns defaults if no settings exist
   */
  static async getSettings(): Promise<FlashcardSettings> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to access settings');
    }

    const { data: settings, error } = await supabase
      .from('flashcard_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, return defaults
        return {
          user_id: user.id,
          ...DEFAULT_SETTINGS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      console.error('Error fetching settings:', error);
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }

    return settings;
  }

  /**
   * Update settings (upsert)
   */
  static async updateSettings(data: UpdateSettingsData): Promise<FlashcardSettings> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to update settings');
    }

    // Validate ease factor range
    if (data.default_ease_factor !== undefined) {
      if (data.default_ease_factor < 1.3 || data.default_ease_factor > 3.0) {
        throw new Error('Ease factor must be between 1.3 and 3.0');
      }
    }

    // Validate limits
    if (data.daily_new_card_limit !== undefined && data.daily_new_card_limit < 0) {
      throw new Error('Daily new card limit must be non-negative');
    }
    if (data.daily_review_limit !== undefined && data.daily_review_limit < 0) {
      throw new Error('Daily review limit must be non-negative');
    }

    // Upsert settings
    const { data: settings, error } = await supabase
      .from('flashcard_settings')
      .upsert({
        user_id: user.id,
        default_ease_factor: data.default_ease_factor ?? DEFAULT_SETTINGS.default_ease_factor,
        daily_new_card_limit: data.daily_new_card_limit ?? DEFAULT_SETTINGS.daily_new_card_limit,
        daily_review_limit: data.daily_review_limit ?? DEFAULT_SETTINGS.daily_review_limit,
        theme: data.theme ?? DEFAULT_SETTINGS.theme,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      throw new Error(`Failed to update settings: ${error.message}`);
    }

    return settings;
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettings(): Promise<FlashcardSettings> {
    return this.updateSettings(DEFAULT_SETTINGS);
  }
}
