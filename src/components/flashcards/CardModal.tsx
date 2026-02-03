import { useState, useEffect } from 'react';
import type { CardWithSides } from '../../services/flashcardCardService';
import type { FlashcardCardType } from '../../lib/supabase';

interface CardData {
  card_type: FlashcardCardType;
  front: string;
  back: string;
}

interface CardModalProps {
  card: CardWithSides | null;
  onClose: () => void;
  onCreate: (data: CardData) => Promise<boolean>;
  onUpdate: (cardId: string, data: CardData) => Promise<boolean>;
}

const CARD_TYPES: { value: FlashcardCardType; label: string; description: string }[] = [
  {
    value: 'basic',
    label: 'Basic',
    description: 'Simple front and back card',
  },
  {
    value: 'reversible',
    label: 'Reversible',
    description: 'Can be studied from both sides',
  },
  {
    value: 'cloze',
    label: 'Cloze',
    description: 'Fill in the blanks with {{...}} markers',
  },
];

function countClozeMarkers(text: string): number {
  const matches = text.match(/\{\{[^}]+\}\}/g);
  return matches ? matches.length : 0;
}

export function CardModal({ card, onClose, onCreate, onUpdate }: CardModalProps) {
  const [cardType, setCardType] = useState<FlashcardCardType>(card?.card_type || 'basic');
  const [front, setFront] = useState(card?.front || '');
  const [back, setBack] = useState(card?.back || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!card;

  useEffect(() => {
    if (card) {
      setCardType(card.card_type);
      setFront(card.front);
      setBack(card.back);
    }
  }, [card]);

  const clozeCount = countClozeMarkers(front);
  const isClozeValid = cardType !== 'cloze' || clozeCount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!front.trim() || !back.trim()) {
      setError('Both front and back are required');
      return;
    }

    if (cardType === 'cloze' && clozeCount === 0) {
      setError('Cloze cards must have at least one {{...}} marker');
      return;
    }

    setIsSubmitting(true);

    try {
      const cardData: CardData = {
        card_type: cardType,
        front: front.trim(),
        back: back.trim(),
      };

      let success: boolean;
      if (isEditing && card) {
        success = await onUpdate(card.id, cardData);
      } else {
        success = await onCreate(cardData);
      }

      if (!success) {
        setError('Failed to save card');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Card' : 'New Card'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors touch-manipulation"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CARD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setCardType(type.value)}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      cardType === type.value
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium text-sm">{type.label}</div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {CARD_TYPES.find((t) => t.value === cardType)?.description}
              </p>
            </div>

            {/* Front content */}
            <div>
              <label htmlFor="front" className="block text-sm font-medium text-gray-700 mb-1">
                Front
                {cardType === 'cloze' && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({clozeCount} cloze marker{clozeCount !== 1 ? 's' : ''})
                  </span>
                )}
              </label>
              <textarea
                id="front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder={
                  cardType === 'cloze'
                    ? 'The {{capital}} of France is Paris.'
                    : 'Question or prompt...'
                }
              />
              {cardType === 'cloze' && (
                <p className="mt-1 text-xs text-gray-500">
                  Use {"{{...}}"} to mark text to be hidden. Each marker creates a separate side to study.
                </p>
              )}
            </div>

            {/* Back content */}
            <div>
              <label htmlFor="back" className="block text-sm font-medium text-gray-700 mb-1">
                Back
              </label>
              <textarea
                id="back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder={
                  cardType === 'cloze'
                    ? 'Additional notes or explanation...'
                    : 'Answer or explanation...'
                }
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Cloze warning */}
            {cardType === 'cloze' && !isClozeValid && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  Add at least one {"{{...}}"} marker to the front text.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation min-h-[44px] font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !front.trim() || !back.trim() || !isClozeValid}
                className="flex-1 px-4 py-3 bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] font-medium"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Card'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
