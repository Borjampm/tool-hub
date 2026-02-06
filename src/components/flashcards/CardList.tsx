import { useState } from 'react';
import type { CardWithSides } from '../../services/flashcardCardService';
import type { FlashcardCardSide } from '../../lib/supabase';
import {
  getCardScheduleInfo,
  getStatusBadgeStyle,
  getStatusLabel,
  getEaseInfo,
  formatDueDate,
  getSideLabel,
  getSideStatus,
  formatInterval,
} from '../../lib/flashcardScheduleUtils';

interface CardListProps {
  cards: CardWithSides[];
  selectedCardIds: Set<string>;
  onCardSelect: (cardId: string, selected: boolean) => void;
  onEditCard: (card: CardWithSides) => void;
  onDeleteCard: (cardId: string) => void;
}

function getCardTypeLabel(type: string): string {
  switch (type) {
    case 'basic':
      return 'Basic';
    case 'reversible':
      return 'Reversible';
    case 'cloze':
      return 'Cloze';
    default:
      return type;
  }
}

function getCardTypeColor(type: string): string {
  switch (type) {
    case 'basic':
      return 'bg-blue-100 text-blue-700';
    case 'reversible':
      return 'bg-purple-100 text-purple-700';
    case 'cloze':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function SideDetail({ side, cardType }: { side: FlashcardCardSide; cardType: string }) {
  const sideStatus = getSideStatus(side);
  const sideEase = getEaseInfo(side.ease_factor);
  const sideDueDate = side.next_review ? new Date(side.next_review) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-sm font-medium text-gray-700">
        {getSideLabel(cardType as 'basic' | 'reversible' | 'cloze', side.side_index)}
      </span>
      <span
        className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusBadgeStyle(sideStatus)}`}
      >
        {getStatusLabel(sideStatus)}
      </span>
      <span className="text-xs text-gray-500">
        {formatDueDate(sideDueDate, sideStatus)}
      </span>
      {sideStatus !== 'new' && (
        <>
          <span className={`text-xs ${sideEase.colorClass}`}>
            {sideEase.label}
          </span>
          <span className="text-xs text-gray-400">
            {formatInterval(side.interval_days)}
          </span>
        </>
      )}
    </div>
  );
}

export function CardList({
  cards,
  selectedCardIds,
  onCardSelect,
  onEditCard,
  onDeleteCard,
}: CardListProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {cards.map((card) => {
        const isExpanded = expandedCardId === card.id;
        return (
          <div
            key={card.id}
            className={`bg-white rounded-lg border ${
              selectedCardIds.has(card.id)
                ? 'border-amber-300 ring-2 ring-amber-100'
                : 'border-gray-200'
            } hover:shadow-sm transition-shadow`}
          >
            <div className="flex items-start p-4">
              {/* Checkbox */}
              <label className="flex items-center cursor-pointer mr-3 pt-1">
                <input
                  type="checkbox"
                  checked={selectedCardIds.has(card.id)}
                  onChange={(e) => onCardSelect(card.id, e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
              </label>

              {/* Card content */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
              >
                {(() => {
                  const scheduleInfo = getCardScheduleInfo(card.sides);
                  const easeInfo = getEaseInfo(scheduleInfo.averageEase);
                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getCardTypeColor(
                            card.card_type
                          )}`}
                        >
                          {getCardTypeLabel(card.card_type)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {card.sides.length} side{card.sides.length !== 1 ? 's' : ''}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusBadgeStyle(
                            scheduleInfo.status
                          )}`}
                        >
                          {getStatusLabel(scheduleInfo.status)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          {truncateText(card.front, 100)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {truncateText(card.back, 80)}
                        </p>
                      </div>

                      {/* Schedule info row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-gray-100 text-xs">
                        <span className="text-gray-500">
                          {formatDueDate(scheduleInfo.earliestDue, scheduleInfo.status)}
                        </span>
                        {scheduleInfo.status !== 'new' && (
                          <span className={easeInfo.colorClass}>
                            {easeInfo.label}
                          </span>
                        )}
                        {card.sides.length > 1 && (
                          <span className="text-gray-400">
                            {scheduleInfo.sidesLearned}/{scheduleInfo.totalSides} learned
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => onEditCard(card)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors touch-manipulation"
                  aria-label="Edit card"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this card?')) {
                      onDeleteCard(card.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors touch-manipulation"
                  aria-label="Delete card"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Expanded per-side detail section */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 ml-10 border-t border-gray-100">
                <div className="mt-3 space-y-2">
                  {card.sides
                    .slice()
                    .sort((a, b) => a.side_index - b.side_index)
                    .map((side) => (
                      <SideDetail
                        key={side.id}
                        side={side}
                        cardType={card.card_type}
                      />
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => onEditCard(card)}
                    className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors touch-manipulation"
                  >
                    Edit Card
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
