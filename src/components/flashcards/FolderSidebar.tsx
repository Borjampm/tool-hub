import { useState } from 'react';
import type { FlashcardFolder } from '../../lib/supabase';

interface FolderSidebarProps {
  folders: FlashcardFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string) => Promise<boolean>;
  onRenameFolder: (folderId: string, name: string) => Promise<boolean>;
  onDeleteFolder: (folderId: string) => Promise<boolean>;
  cardCounts: number;
}

export function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onCreateFolder(newFolderName.trim());
    setIsSubmitting(false);

    if (success) {
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent, folderId: string) => {
    e.preventDefault();
    if (!editingName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onRenameFolder(folderId, editingName.trim());
    setIsSubmitting(false);

    if (success) {
      setEditingFolderId(null);
      setEditingName('');
    }
  };

  const handleDeleteClick = async (folderId: string) => {
    if (window.confirm('Delete this folder and all its cards?')) {
      await onDeleteFolder(folderId);
    }
    setMenuOpenId(null);
  };

  const startEditing = (folder: FlashcardFolder) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
    setMenuOpenId(null);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Create folder"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Create folder form */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="mb-4">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={isSubmitting || !newFolderName.trim()}
              className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation min-h-[44px]"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewFolderName('');
              }}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Folder list */}
      <div className="space-y-1">
        {folders.length === 0 && !isCreating && (
          <p className="text-sm text-gray-500 py-4 text-center">
            No folders yet. Create one to get started.
          </p>
        )}

        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`relative group ${
              selectedFolderId === folder.id ? 'bg-amber-50' : ''
            }`}
          >
            {editingFolderId === folder.id ? (
              <form
                onSubmit={(e) => handleRenameSubmit(e, folder.id)}
                className="p-2"
              >
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !editingName.trim()}
                    className="flex-1 px-2 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFolderId(null);
                      setEditingName('');
                    }}
                    className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center">
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className={`flex-1 text-left px-3 py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                    selectedFolderId === folder.id
                      ? 'text-amber-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <span className="truncate">{folder.name}</span>
                  </div>
                </button>

                {/* Menu button */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === folder.id ? null : folder.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </button>

                  {menuOpenId === folder.id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => startEditing(folder)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteClick(folder.id)}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
