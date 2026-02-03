import { useState, useRef } from 'react';
import { FlashcardFolderService } from '../../services/flashcardFolderService';
import { FlashcardCardService } from '../../services/flashcardCardService';
import type { FlashcardFolder, FlashcardCardType } from '../../lib/supabase';

interface ImportExportModalProps {
  mode: 'import' | 'export';
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportData {
  version: number;
  exportedAt: string;
  folders: FlashcardFolder[];
  cards: {
    id: string;
    folder_id: string;
    card_type: FlashcardCardType;
    front: string;
    back: string;
  }[];
}

export function ImportExportModal({ mode, onClose, onImportComplete }: ImportExportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [importStats, setImportStats] = useState<{
    foldersCreated: number;
    cardsCreated: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ImportData;

      // Validate structure
      if (!data.version || !Array.isArray(data.folders) || !Array.isArray(data.cards)) {
        throw new Error('Invalid import file format');
      }

      setImportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse import file');
      setImportData(null);
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Get existing folders to map old IDs to new ones
      const existingFolders = await FlashcardFolderService.getFolders();
      const folderNameMap = new Map(existingFolders.map((f) => [f.name.toLowerCase(), f]));

      // Map old folder IDs to new folder IDs
      const folderIdMap = new Map<string, string>();
      let foldersCreated = 0;
      let cardsCreated = 0;

      // Create folders that don't exist
      for (const folder of importData.folders) {
        const existing = folderNameMap.get(folder.name.toLowerCase());
        if (existing) {
          folderIdMap.set(folder.id, existing.id);
        } else {
          try {
            const newFolder = await FlashcardFolderService.createFolder({ name: folder.name });
            folderIdMap.set(folder.id, newFolder.id);
            foldersCreated++;
          } catch {
            // Folder might have been created by another import, try to find it
            const refreshedFolders = await FlashcardFolderService.getFolders();
            const found = refreshedFolders.find(
              (f) => f.name.toLowerCase() === folder.name.toLowerCase()
            );
            if (found) {
              folderIdMap.set(folder.id, found.id);
            }
          }
        }
      }

      // Create cards
      for (const card of importData.cards) {
        const newFolderId = folderIdMap.get(card.folder_id);
        if (!newFolderId) {
          console.warn(`Skipping card with unknown folder: ${card.folder_id}`);
          continue;
        }

        try {
          await FlashcardCardService.createCard({
            folder_id: newFolderId,
            card_type: card.card_type,
            front: card.front,
            back: card.back,
          });
          cardsCreated++;
        } catch (err) {
          console.warn(`Failed to import card: ${err}`);
        }
      }

      setImportStats({ foldersCreated, cardsCreated });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDone = () => {
    if (importStats) {
      onImportComplete();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'import' ? 'Import Data' : 'Export Data'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors touch-manipulation"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {importStats ? (
            // Import complete
            <div className="text-center py-6">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete</h3>
              <p className="text-gray-600 mb-4">
                Created {importStats.foldersCreated} folder
                {importStats.foldersCreated !== 1 ? 's' : ''} and {importStats.cardsCreated} card
                {importStats.cardsCreated !== 1 ? 's' : ''}.
              </p>
              <button
                onClick={handleDone}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors touch-manipulation min-h-[44px] font-medium"
              >
                Done
              </button>
            </div>
          ) : (
            // Import form
            <div className="space-y-4">
              {/* File input */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-center"
                >
                  <svg
                    className="w-8 h-8 mx-auto mb-2 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-gray-600">
                    {importData
                      ? `Selected: ${importData.folders.length} folders, ${importData.cards.length} cards`
                      : 'Click to select JSON file'}
                  </span>
                </button>
              </div>

              {/* Preview */}
              {importData && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Import Preview</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      {importData.folders.length} folder{importData.folders.length !== 1 ? 's' : ''}
                    </li>
                    <li>
                      {importData.cards.length} card{importData.cards.length !== 1 ? 's' : ''}
                    </li>
                    <li className="text-xs text-gray-400">
                      Exported: {new Date(importData.exportedAt).toLocaleString()}
                    </li>
                  </ul>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation min-h-[44px] font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importData || isProcessing}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] font-medium"
                >
                  {isProcessing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
