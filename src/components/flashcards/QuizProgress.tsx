import type { ReviewRating } from '../../services/flashcardQuizService';

interface StudyStats {
  totalReviewed: number;
  ratings: Record<ReviewRating, number>;
}

interface QuizProgressProps {
  current: number;
  total: number;
  stats: StudyStats;
}

export function QuizProgress({ current, total, stats }: QuizProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {current} / {total}
        </span>
      </div>

      {/* Stats row */}
      {stats.totalReviewed > 0 && (
        <div className="flex items-center justify-center gap-4 text-xs">
          {stats.ratings[0] > 0 && (
            <span className="text-red-500">{stats.ratings[0]} again</span>
          )}
          {stats.ratings[1] > 0 && (
            <span className="text-orange-500">{stats.ratings[1]} hard</span>
          )}
          {stats.ratings[2] > 0 && (
            <span className="text-green-500">{stats.ratings[2]} good</span>
          )}
          {stats.ratings[3] > 0 && (
            <span className="text-blue-500">{stats.ratings[3]} easy</span>
          )}
        </div>
      )}
    </div>
  );
}
