import type { ReviewRating } from '../../services/flashcardQuizService';

interface StudyStats {
  totalReviewed: number;
  ratings: Record<ReviewRating, number>;
}

interface QuizSummaryProps {
  stats: StudyStats;
  onRestart: () => void;
}

export function QuizSummary({ stats, onRestart }: QuizSummaryProps) {
  const { totalReviewed, ratings } = stats;

  // Calculate percentages
  const getPercentage = (count: number) =>
    totalReviewed > 0 ? Math.round((count / totalReviewed) * 100) : 0;

  const ratingData = [
    { label: 'Again', count: ratings[0], color: 'bg-red-500', textColor: 'text-red-600' },
    { label: 'Hard', count: ratings[1], color: 'bg-orange-500', textColor: 'text-orange-600' },
    { label: 'Good', count: ratings[2], color: 'bg-green-500', textColor: 'text-green-600' },
    { label: 'Easy', count: ratings[3], color: 'bg-blue-500', textColor: 'text-blue-600' },
  ];

  // Calculate overall performance score
  const performanceScore =
    totalReviewed > 0
      ? Math.round(((ratings[2] * 2 + ratings[3] * 3) / (totalReviewed * 3)) * 100)
      : 0;

  const getPerformanceMessage = () => {
    if (totalReviewed === 0) return 'No cards reviewed';
    if (performanceScore >= 80) return 'Excellent session! 🌟';
    if (performanceScore >= 60) return 'Good progress! 👍';
    if (performanceScore >= 40) return 'Keep practicing! 💪';
    return 'Room for improvement 📚';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
        <p className="text-gray-500">{getPerformanceMessage()}</p>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-amber-600">{totalReviewed}</div>
          <div className="text-sm text-gray-500">cards reviewed</div>
        </div>

        {/* Rating breakdown */}
        {totalReviewed > 0 && (
          <div className="space-y-3">
            {ratingData.map(({ label, count, color, textColor }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-16 text-sm text-gray-600">{label}</div>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${getPercentage(count)}%` }}
                  />
                </div>
                <div className={`w-12 text-right text-sm font-medium ${textColor}`}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onRestart}
          className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors touch-manipulation min-h-[44px] font-medium"
        >
          Study More
        </button>
      </div>
    </div>
  );
}
