import { useState, useEffect } from 'react';
import { FlashcardSettingsService } from '../../services/flashcardSettingsService';
import { FlashcardFolderService } from '../../services/flashcardFolderService';
import { FlashcardCardService } from '../../services/flashcardCardService';
import type { FlashcardSettings, FlashcardTheme } from '../../lib/supabase';
import { ImportExportModal } from './ImportExportModal';

export function SettingsView() {
  const [settings, setSettings] = useState<FlashcardSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export');

  // Form state
  const [easeFactorInput, setEaseFactorInput] = useState('2.5');
  const [newCardLimitInput, setNewCardLimitInput] = useState('20');
  const [reviewLimitInput, setReviewLimitInput] = useState('100');
  const [themeInput, setThemeInput] = useState<FlashcardTheme>('system');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const fetchedSettings = await FlashcardSettingsService.getSettings();
      setSettings(fetchedSettings);
      setEaseFactorInput(fetchedSettings.default_ease_factor.toString());
      setNewCardLimitInput(fetchedSettings.daily_new_card_limit.toString());
      setReviewLimitInput(fetchedSettings.daily_review_limit.toString());
      setThemeInput(fetchedSettings.theme);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);

    const easeFactor = parseFloat(easeFactorInput);
    const newCardLimit = parseInt(newCardLimitInput, 10);
    const reviewLimit = parseInt(reviewLimitInput, 10);

    // Validation
    if (isNaN(easeFactor) || easeFactor < 1.3 || easeFactor > 3.0) {
      setError('Ease factor must be between 1.3 and 3.0');
      return;
    }
    if (isNaN(newCardLimit) || newCardLimit < 0) {
      setError('Daily new card limit must be a non-negative number');
      return;
    }
    if (isNaN(reviewLimit) || reviewLimit < 0) {
      setError('Daily review limit must be a non-negative number');
      return;
    }

    try {
      setIsSaving(true);
      const updatedSettings = await FlashcardSettingsService.updateSettings({
        default_ease_factor: easeFactor,
        daily_new_card_limit: newCardLimit,
        daily_review_limit: reviewLimit,
        theme: themeInput,
      });
      setSettings(updatedSettings);
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all settings to defaults?')) return;

    try {
      setIsSaving(true);
      const defaultSettings = await FlashcardSettingsService.resetSettings();
      setSettings(defaultSettings);
      setEaseFactorInput(defaultSettings.default_ease_factor.toString());
      setNewCardLimitInput(defaultSettings.daily_new_card_limit.toString());
      setReviewLimitInput(defaultSettings.daily_review_limit.toString());
      setThemeInput(defaultSettings.theme);
      setSuccessMessage('Settings reset to defaults');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const folders = await FlashcardFolderService.getFolders();
      const allCards = await FlashcardCardService.getAllCards();

      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: settings,
        folders: folders,
        cards: allCards,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flashcards-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage('Data exported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  const openImportModal = () => {
    setImportExportMode('import');
    setIsImportExportOpen(true);
  };

  const handleImportComplete = () => {
    setIsImportExportOpen(false);
    setSuccessMessage('Data imported successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* SM-2 Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Spaced Repetition</h2>

        <div className="space-y-4">
          {/* Ease Factor */}
          <div>
            <label htmlFor="ease-factor" className="block text-sm font-medium text-gray-700 mb-1">
              Default Ease Factor
            </label>
            <input
              id="ease-factor"
              type="number"
              min="1.3"
              max="3.0"
              step="0.1"
              value={easeFactorInput}
              onChange={(e) => setEaseFactorInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Controls how quickly intervals grow. Range: 1.3 - 3.0
            </p>
          </div>

          {/* Daily New Card Limit */}
          <div>
            <label htmlFor="new-limit" className="block text-sm font-medium text-gray-700 mb-1">
              Daily New Card Limit
            </label>
            <input
              id="new-limit"
              type="number"
              min="0"
              value={newCardLimitInput}
              onChange={(e) => setNewCardLimitInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum new cards to introduce per day. 0 for unlimited.
            </p>
          </div>

          {/* Daily Review Limit */}
          <div>
            <label htmlFor="review-limit" className="block text-sm font-medium text-gray-700 mb-1">
              Daily Review Limit
            </label>
            <input
              id="review-limit"
              type="number"
              min="0"
              value={reviewLimitInput}
              onChange={(e) => setReviewLimitInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum review cards per day. 0 for unlimited.
            </p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setThemeInput(theme)}
                className={`p-3 rounded-lg border text-center transition-colors capitalize ${
                  themeInput === theme
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Note: Theme switching is not yet implemented. This setting is stored for future use.
          </p>
        </div>
      </div>

      {/* Save / Reset buttons */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors touch-manipulation min-h-[44px] font-medium"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={handleReset}
          disabled={isSaving}
          className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation min-h-[44px]"
        >
          Reset
        </button>
      </div>

      {/* Import / Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExport}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px] font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Export Data
          </button>
          <button
            onClick={openImportModal}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px] font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Import Data
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Export your folders, cards, and scheduling data as JSON. Import will merge with existing
          data.
        </p>
      </div>

      {/* Import/Export Modal */}
      {isImportExportOpen && (
        <ImportExportModal
          mode={importExportMode}
          onClose={() => setIsImportExportOpen(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}
