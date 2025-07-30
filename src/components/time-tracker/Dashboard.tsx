import { useEffect, useState } from 'react';
import { TimeEntryService } from '../../services/timeEntryService';
import type { TimeEntry } from '../../lib/supabase';

export function Dashboard() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await TimeEntryService.getAllEntries();
      setEntries(data);
    } catch (err) {
      console.error('Failed to load entries:', err);
      setError('Failed to load time entries');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalTime = (): number => {
    return entries
      .filter(entry => entry.elapsed_time)
      .reduce((total, entry) => total + (entry.elapsed_time || 0), 0);
  };

  const getCategoryBreakdown = () => {
    const categoryMap = new Map<string, { count: number; totalTime: number }>();
    
    entries.forEach(entry => {
      const category = entry.category || 'uncategorized';
      const existing = categoryMap.get(category) || { count: 0, totalTime: 0 };
      
      categoryMap.set(category, {
        count: existing.count + 1,
        totalTime: existing.totalTime + (entry.elapsed_time || 0),
      });
    });
    
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.totalTime - a.totalTime);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your time entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Your time tracking analytics and insights</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadEntries}
              className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {entries.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⏱️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Time Entries Yet
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Start your first timer session to see your time tracking data here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Entries</h3>
                <p className="text-3xl font-bold text-blue-600">{entries.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Time</h3>
                <p className="text-3xl font-bold text-green-600">{formatTime(getTotalTime())}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Session</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {entries.length > 0 ? formatTime(Math.round(getTotalTime() / entries.length)) : '0s'}
                </p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Category Breakdown</h2>
              </div>
              <div className="p-6">
                {getCategoryBreakdown().length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No categorized activities yet</p>
                ) : (
                  <div className="space-y-4">
                    {getCategoryBreakdown().map(({ category, count, totalTime }) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {category || 'Uncategorized'}
                          </span>
                          <span className="text-sm text-gray-600">
                            {count} {count === 1 ? 'activity' : 'activities'}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatTime(totalTime)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Summary */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                {entries.slice(0, 5).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent activities</p>
                ) : (
                  <div className="space-y-3">
                    {entries.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {entry.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(entry.created_at)}
                          </p>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {entry.elapsed_time ? formatTime(entry.elapsed_time) : 'In progress...'}
                        </div>
                      </div>
                    ))}
                    {entries.length > 5 && (
                      <div className="text-center pt-3">
                        <p className="text-xs text-gray-500">
                          Showing 5 of {entries.length} activities
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 