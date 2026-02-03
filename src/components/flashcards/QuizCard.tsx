import { useState } from 'react';
import type { DueCard, ReviewRating } from '../../services/flashcardQuizService';

interface QuizCardProps {
  card: DueCard;
  onRate: (rating: ReviewRating) => void;
}

function renderClozeContent(front: string, sideIndex: number, revealed: boolean): string {
  const matches = front.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return front;

  let result = front;
  matches.forEach((match, index) => {
    const content = match.slice(2, -2); // Remove {{ and }}
    if (index === sideIndex) {
      // This is the cloze we're testing
      result = result.replace(match, revealed ? `[${content}]` : '[...]');
    } else {
      // Show other clozes as regular text
      result = result.replace(match, content);
    }
  });

  return result;
}

function getDisplayContent(card: DueCard, revealed: boolean): { front: string; back: string } {
  const { card_type, front, back, side } = card;

  switch (card_type) {
    case 'basic':
      return { front, back };

    case 'reversible':
      // side_index 0 = front->back, side_index 1 = back->front
      if (side.side_index === 0) {
        return { front, back };
      } else {
        return { front: back, back: front };
      }

    case 'cloze':
      return {
        front: renderClozeContent(front, side.side_index, revealed),
        back,
      };

    default:
      return { front, back };
  }
}

const RATING_BUTTONS: { rating: ReviewRating; label: string; color: string; shortcut: string }[] = [
  { rating: 0, label: 'Again', color: 'bg-red-500 hover:bg-red-600', shortcut: '1' },
  { rating: 1, label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600', shortcut: '2' },
  { rating: 2, label: 'Good', color: 'bg-green-500 hover:bg-green-600', shortcut: '3' },
  { rating: 3, label: 'Easy', color: 'bg-blue-500 hover:bg-blue-600', shortcut: '4' },
];

export function QuizCard({ card, onRate }: QuizCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const { front, back } = getDisplayContent(card, isRevealed);

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleRate = (rating: ReviewRating) => {
    setIsRevealed(false);
    onRate(rating);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRevealed) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleReveal();
      }
    } else {
      const keyMap: Record<string, ReviewRating> = {
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3,
      };
      const rating = keyMap[e.key];
      if (rating !== undefined) {
        e.preventDefault();
        handleRate(rating);
      }
    }
  };

  return (
    <div
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Card content */}
      <div className="p-6 sm:p-8">
        {/* Card type indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            {card.card_type}
            {card.card_type === 'reversible' && ` (side ${card.side.side_index + 1})`}
            {card.card_type === 'cloze' && ` (cloze ${card.side.side_index + 1})`}
          </span>
        </div>

        {/* Front */}
        <div className="mb-6">
          <p className="text-lg sm:text-xl text-gray-900 whitespace-pre-wrap">{front}</p>
        </div>

        {/* Divider / Reveal button */}
        {!isRevealed ? (
          <button
            onClick={handleReveal}
            className="w-full py-4 px-6 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation min-h-[60px] flex items-center justify-center gap-2"
          >
            <span className="text-gray-600 font-medium">Tap to reveal</span>
            <span className="text-xs text-gray-400">(Space)</span>
          </button>
        ) : (
          <>
            <div className="border-t border-gray-200 my-6" />

            {/* Back */}
            <div className="mb-6">
              <p className="text-lg sm:text-xl text-gray-700 whitespace-pre-wrap">{back}</p>
            </div>
          </>
        )}
      </div>

      {/* Rating buttons */}
      {isRevealed && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-center text-sm text-gray-500 mb-3">How well did you know this?</p>
          <div className="grid grid-cols-4 gap-2">
            {RATING_BUTTONS.map(({ rating, label, color, shortcut }) => (
              <button
                key={rating}
                onClick={() => handleRate(rating)}
                className={`${color} text-white py-3 px-2 rounded-lg transition-colors touch-manipulation min-h-[56px] flex flex-col items-center justify-center`}
              >
                <span className="font-medium text-sm sm:text-base">{label}</span>
                <span className="text-xs opacity-75">({shortcut})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
