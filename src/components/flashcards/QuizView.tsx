import { useState, useEffect, useCallback } from 'react';
import { FlashcardFolderService } from '../../services/flashcardFolderService';
import { FlashcardQuizService } from '../../services/flashcardQuizService';
import type { DueCard, ReviewRating } from '../../services/flashcardQuizService';
import type { FlashcardFolder } from '../../lib/supabase';
import { QuizCard } from './QuizCard';
import { QuizProgress } from './QuizProgress';
import { QuizSummary } from './QuizSummary';

interface StudyStats {
  totalReviewed: number;
  ratings: Record<ReviewRating, number>;
}

export function QuizView() {
  const [folders, setFolders] = useState<FlashcardFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [dueCards, setDueCards] = useState<DueCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyStats, setStudyStats] = useState<StudyStats>({
    totalReviewed: 0,
    ratings: { 0: 0, 1: 0, 2: 0, 3: 0 },
  });
  const [isComplete, setIsComplete] = useState(false);
  const [cardCounts, setCardCounts] = useState<{ newCount: number; dueCount: number }>({
    newCount: 0,
    dueCount: 0,
  });

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const fetchedFolders = await FlashcardFolderService.getFolders();
      setFolders(fetchedFolders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDueCards = useCallback(async (folderId: string | null) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsComplete(false);
      setCurrentIndex(0);
      setStudyStats({ totalReviewed: 0, ratings: { 0: 0, 1: 0, 2: 0, 3: 0 } });

      const cards = await FlashcardQuizService.getDueCards(folderId || undefined);
      setDueCards(cards);

      const counts = await FlashcardQuizService.getStudyableCardCount(folderId || undefined);
      setCardCounts({ newCount: counts.newCount, dueCount: counts.dueCount });

      if (cards.length === 0) {
        setIsComplete(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load due cards when folder selection changes
  useEffect(() => {
    loadDueCards(selectedFolderId);
  }, [selectedFolderId, loadDueCards]);

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedFolderId(value === 'all' ? null : value);
  };

  const handleRate = async (rating: ReviewRating) => {
    const currentCard = dueCards[currentIndex];
    if (!currentCard) return;

    try {
      await FlashcardQuizService.processReview(currentCard.side.id, rating);

      setStudyStats((prev) => ({
        totalReviewed: prev.totalReviewed + 1,
        ratings: {
          ...prev.ratings,
          [rating]: prev.ratings[rating] + 1,
        },
      }));

      if (currentIndex + 1 >= dueCards.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review');
    }
  };

  const handleRestart = () => {
    loadDueCards(selectedFolderId);
  };

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => loadDueCards(selectedFolderId)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Folder selector */}
      <div className="mb-6">
        <label htmlFor="folder-select" className="block text-sm font-medium text-gray-700 mb-2">
          Study Folder
        </label>
        <select
          id="folder-select"
          value={selectedFolderId || 'all'}
          onChange={handleFolderChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent touch-manipulation min-h-[44px]"
        >
          <option value="all">All Folders</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <div className="mt-2 flex gap-4 text-sm text-gray-500">
          <span>{cardCounts.newCount} new</span>
          <span>{cardCounts.dueCount} to review</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
        </div>
      ) : isComplete ? (
        <QuizSummary stats={studyStats} onRestart={handleRestart} />
      ) : dueCards.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-500">
            {folders.length === 0
              ? 'Create some folders and cards to start studying.'
              : 'No cards are due for review right now.'}
          </p>
        </div>
      ) : (
        <>
          <QuizProgress
            current={currentIndex + 1}
            total={dueCards.length}
            stats={studyStats}
          />
          <QuizCard card={dueCards[currentIndex]} onRate={handleRate} />
        </>
      )}
    </div>
  );
}
