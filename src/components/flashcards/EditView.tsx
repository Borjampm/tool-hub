import { useState, useEffect } from 'react';
import { FlashcardFolderService } from '../../services/flashcardFolderService';
import { FlashcardCardService } from '../../services/flashcardCardService';
import type { CardWithSides } from '../../services/flashcardCardService';
import type { FlashcardFolder, FlashcardCardType } from '../../lib/supabase';
import { FolderSidebar } from './FolderSidebar';
import { CardList } from './CardList';
import { CardModal } from './CardModal';

export function EditView() {
  const [folders, setFolders] = useState<FlashcardFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardWithSides[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithSides | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Load cards when folder selection changes
  useEffect(() => {
    if (selectedFolderId) {
      loadCards(selectedFolderId);
    } else {
      setCards([]);
    }
  }, [selectedFolderId]);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const fetchedFolders = await FlashcardFolderService.getFolders();
      setFolders(fetchedFolders);
      // Select first folder if available
      if (fetchedFolders.length > 0 && !selectedFolderId) {
        setSelectedFolderId(fetchedFolders[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCards = async (folderId: string) => {
    try {
      setIsLoading(true);
      const fetchedCards = await FlashcardCardService.getCardsByFolder(folderId);
      setCards(fetchedCards);
      setSelectedCardIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const newFolder = await FlashcardFolderService.createFolder({ name });
      setFolders(prev => [...prev, newFolder].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedFolderId(newFolder.id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      return false;
    }
  };

  const handleRenameFolder = async (folderId: string, name: string) => {
    try {
      const updatedFolder = await FlashcardFolderService.updateFolder(folderId, { name });
      setFolders(prev =>
        prev.map(f => (f.id === folderId ? updatedFolder : f))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename folder');
      return false;
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await FlashcardFolderService.deleteFolder(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      if (selectedFolderId === folderId) {
        const remaining = folders.filter(f => f.id !== folderId);
        setSelectedFolderId(remaining.length > 0 ? remaining[0].id : null);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
      return false;
    }
  };

  const handleCreateCard = async (data: {
    card_type: FlashcardCardType;
    front: string;
    back: string;
  }) => {
    if (!selectedFolderId) return false;
    try {
      const newCard = await FlashcardCardService.createCard({
        folder_id: selectedFolderId,
        ...data,
      });
      setCards(prev => [newCard, ...prev]);
      setIsCardModalOpen(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create card');
      return false;
    }
  };

  const handleUpdateCard = async (
    cardId: string,
    data: { card_type?: FlashcardCardType; front?: string; back?: string }
  ) => {
    try {
      const updatedCard = await FlashcardCardService.updateCard(cardId, data);
      setCards(prev => prev.map(c => (c.id === cardId ? updatedCard : c)));
      setIsCardModalOpen(false);
      setEditingCard(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update card');
      return false;
    }
  };

  const handleDeleteCards = async (cardIds: string[]) => {
    try {
      await FlashcardCardService.deleteCards(cardIds);
      setCards(prev => prev.filter(c => !cardIds.includes(c.id)));
      setSelectedCardIds(new Set());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cards');
      return false;
    }
  };

  const handleMoveCards = async (cardIds: string[], targetFolderId: string) => {
    try {
      await FlashcardCardService.moveCards(cardIds, targetFolderId);
      // Remove moved cards from current view if they were moved to a different folder
      if (targetFolderId !== selectedFolderId) {
        setCards(prev => prev.filter(c => !cardIds.includes(c.id)));
      }
      setSelectedCardIds(new Set());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move cards');
      return false;
    }
  };

  const handleCardSelect = (cardId: string, selected: boolean) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(cardId);
      } else {
        next.delete(cardId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedCardIds.size === cards.length) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(cards.map(c => c.id)));
    }
  };

  const handleEditCard = (card: CardWithSides) => {
    setEditingCard(card);
    setIsCardModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCardModalOpen(false);
    setEditingCard(null);
  };

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadFolders();
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      {/* Mobile folder toggle */}
      <div className="md:hidden p-4 border-b border-gray-200 bg-white">
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="flex items-center justify-between w-full px-4 py-3 bg-gray-100 rounded-lg touch-manipulation min-h-[44px]"
        >
          <span className="font-medium text-gray-700">
            {selectedFolderId
              ? folders.find(f => f.id === selectedFolderId)?.name || 'Select Folder'
              : 'Select Folder'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isMobileSidebarOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          isMobileSidebarOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 lg:w-72 border-r border-gray-200 bg-white overflow-y-auto`}
      >
        <FolderSidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={(folderId) => {
            setSelectedFolderId(folderId);
            setIsMobileSidebarOpen(false);
          }}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          cardCounts={cards.length}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {selectedFolderId ? (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 bg-white flex flex-wrap items-center gap-2 sm:gap-4">
              <button
                onClick={() => {
                  setEditingCard(null);
                  setIsCardModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors touch-manipulation min-h-[44px] font-medium"
              >
                + Add Card
              </button>

              {selectedCardIds.size > 0 && (
                <>
                  <span className="text-sm text-gray-500">
                    {selectedCardIds.size} selected
                  </span>
                  <button
                    onClick={() => handleDeleteCards(Array.from(selectedCardIds))}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                  >
                    Delete
                  </button>
                  {folders.length > 1 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleMoveCards(Array.from(selectedCardIds), e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm touch-manipulation min-h-[44px]"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Move to...
                      </option>
                      {folders
                        .filter(f => f.id !== selectedFolderId)
                        .map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  )}
                </>
              )}

              <div className="flex-1" />

              {cards.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-gray-600 hover:text-gray-800 touch-manipulation min-h-[44px] px-2"
                >
                  {selectedCardIds.size === cards.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Card list */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No cards in this folder yet</p>
                  <button
                    onClick={() => {
                      setEditingCard(null);
                      setIsCardModalOpen(true);
                    }}
                    className="text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Create your first card
                  </button>
                </div>
              ) : (
                <CardList
                  cards={cards}
                  selectedCardIds={selectedCardIds}
                  onCardSelect={handleCardSelect}
                  onEditCard={handleEditCard}
                  onDeleteCard={(cardId) => handleDeleteCards([cardId])}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-gray-500 mb-4">
                {folders.length === 0
                  ? 'Create a folder to get started'
                  : 'Select a folder to view cards'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card Modal */}
      {isCardModalOpen && selectedFolderId && (
        <CardModal
          card={editingCard}
          onClose={handleCloseModal}
          onCreate={handleCreateCard}
          onUpdate={handleUpdateCard}
        />
      )}
    </div>
  );
}
