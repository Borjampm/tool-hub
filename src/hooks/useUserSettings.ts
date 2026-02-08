import { useState, useEffect, useCallback } from 'react';
import { UserSettingsService } from '../services/userSettingsService';
import type { UserSettings } from '../lib/supabase';
import type { SupportedCurrency } from '../lib/currencies';
import { DEFAULT_CURRENCY, isSupportedCurrency } from '../lib/currencies';

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await UserSettingsService.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load user settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const defaultCurrency: SupportedCurrency = settings?.default_currency && isSupportedCurrency(settings.default_currency)
    ? settings.default_currency
    : DEFAULT_CURRENCY;

  const updateDefaultCurrency = useCallback(async (currency: SupportedCurrency) => {
    try {
      const updated = await UserSettingsService.updateSettings({ defaultCurrency: currency });
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update default currency:', err);
      throw err;
    }
  }, []);

  return { settings, defaultCurrency, updateDefaultCurrency, isLoading, reload: loadSettings };
}
