import { useEffect, useState } from 'react';
import { TimeEntryService } from '../../services/timeEntryService';
import { CategoryService } from '../../services/categoryService';
import type { TimeEntry, HobbyCategory } from '../../lib/supabase';
import { formatDateTimeRounded, formatDuration, formatTimeRangeRounded } from '../../lib/dateUtils';
import { UserSettingsService } from '../../services/userSettingsService';

export function Dashboard() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [categories, setCategories] = useState<HobbyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // weekOffset removed as dashboard no longer paginates activities by week
  const [weeklyGoalHours, setWeeklyGoalHours] = useState<number>(2);

  useEffect(() => {
    loadEntries();
    loadSettings();
  }, []);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [entriesData, categoriesData] = await Promise.all([
        TimeEntryService.getAllEntries(),
        CategoryService.getHobbyCategories()
      ]);
      setEntries(entriesData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load entries:', err);
      setError('Failed to load time entries');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await UserSettingsService.getSettings();
      setWeeklyGoalHours(settings.weekly_hobby_goal_hours ?? 2);
    } catch (err) {
      console.error('Failed to load settings:', err);
      // keep default
    }
  };

  const formatTime = (totalSeconds: number): string => {
    return formatDuration(totalSeconds);
  };

  // Helpers for weekly breakdown
  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun ... 6=Sat
    // Use Monday as start of week
    const diffToMonday = (day + 6) % 7; // Mon=0, Sun=6
    d.setDate(d.getDate() - diffToMonday);
    return d;
  };

  const resolveCategoryForEntry = (entry: TimeEntry): { name: string; color: string } => {
    if (entry.category_id) {
      const cat = categories.find((c) => c.id === entry.category_id);
      if (cat) return { name: cat.name, color: cat.color || '#6B7280' };
    }
    if (entry.category) {
      const cat = categories.find((c) => c.name === entry.category);
      return { name: entry.category, color: cat?.color || '#6B7280' };
    }
    return { name: 'Uncategorized', color: '#6B7280' };
  };

  const getCategoryTotalsForRange = (start: Date, end: Date) => {
    const totals = new Map<string, { totalSeconds: number; color: string }>();
    entries.forEach((entry) => {
      const startedAt = entry.start_time ? new Date(entry.start_time) : new Date(entry.created_at);
      if (!entry.elapsed_time) return;
      if (startedAt >= start && startedAt < end) {
        const { name, color } = resolveCategoryForEntry(entry);
        const prev = totals.get(name) || { totalSeconds: 0, color };
        totals.set(name, { totalSeconds: prev.totalSeconds + (entry.elapsed_time || 0), color });
      }
    });
    return totals; // return map; ordering handled separately for static positions
  };

  const now = new Date();
  const thisWeekStart = getStartOfWeek(now);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(thisWeekStart.getDate() + 7);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const thisWeekTotals = getCategoryTotalsForRange(thisWeekStart, nextWeekStart);
  const lastWeekTotals = getCategoryTotalsForRange(lastWeekStart, thisWeekStart);

  // Build a static order of categories (user's categories order by name) plus 'Uncategorized' at the end
  const orderedCategories = [
    ...categories.map((c) => ({ name: c.name, color: c.color || '#6B7280' })),
    { name: 'Uncategorized', color: '#6B7280' },
  ];

  const buildDataArray = (totals: Map<string, { totalSeconds: number; color: string }>) =>
    orderedCategories.map(({ name, color }) => ({
      name,
      color,
      totalSeconds: totals.get(name)?.totalSeconds || 0,
    }));

  const thisWeekData = buildDataArray(thisWeekTotals);
  const lastWeekData = buildDataArray(lastWeekTotals);

  // Use a shared max so widths are comparable across charts
  const sharedMax = Math.max(
    1,
    ...thisWeekData.map((d) => d.totalSeconds),
    ...lastWeekData.map((d) => d.totalSeconds)
  );

  // Weekly summaries
  const getWeekSummary = (data: { totalSeconds: number }[]) => {
    const totalSeconds = data.reduce((sum, d) => sum + d.totalSeconds, 0);
    const avgDailySeconds = Math.round(totalSeconds / 7);
    return { totalSeconds, avgDailySeconds };
  };

  const thisWeekSummary = getWeekSummary(thisWeekData);
  const lastWeekSummary = getWeekSummary(lastWeekData);

  // Weekly progress bar (this week) segments
  const goalSeconds = Math.max(1, Math.round((weeklyGoalHours || 0) * 3600));
  const thisWeekEntriesChrono = entries
    .filter((e) => {
      const startedAt = e.start_time ? new Date(e.start_time) : new Date(e.created_at);
      return startedAt >= thisWeekStart && startedAt < nextWeekStart && (e.elapsed_time || 0) > 0;
    })
    .sort((a, b) => {
      const da = a.start_time ? new Date(a.start_time).getTime() : new Date(a.created_at).getTime();
      const db = b.start_time ? new Date(b.start_time).getTime() : new Date(b.created_at).getTime();
      return da - db;
    });

  type ProgressSeg = { color: string; widthPct: number };
  const buildProgressSegments = (): ProgressSeg[] => {
    const segs: ProgressSeg[] = [];
    let accumulated = 0;
    for (const entry of thisWeekEntriesChrono) {
      if (accumulated >= goalSeconds) break;
      const segSeconds = Math.min(goalSeconds - accumulated, entry.elapsed_time || 0);
      if (segSeconds <= 0) continue;
      const { color } = resolveCategoryForEntry(entry);
      segs.push({ color, widthPct: (segSeconds / goalSeconds) * 100 });
      accumulated += segSeconds;
    }
    return segs;
  };
  const progressSegments = buildProgressSegments();

  // Removed weekly pagination for activities in dashboard

  // Recent completed activities (last 5 by start_time)
  const toEntryDate = (e: TimeEntry) => (e.start_time ? new Date(e.start_time) : new Date(e.created_at));
  const recentCompleted = entries
    .filter((e) => !!e.end_time && (e.elapsed_time || 0) > 0)
    .sort((a, b) => toEntryDate(b).getTime() - toEntryDate(a).getTime())
    .slice(0, 5);

  const BarList = ({ title, data, max, summary }: { title: string; data: { name: string; color: string; totalSeconds: number }[]; max: number; summary: { totalSeconds: number; avgDailySeconds: number } }) => {
    return (
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
          <div className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
            <span className="mr-3">Total: {formatTime(summary.totalSeconds)}</span>
            <span>Avg/day: {formatTime(summary.avgDailySeconds)}</span>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {data.length === 0 ? (
            <p className="text-sm sm:text-base text-gray-500 text-center py-4">No data for this week</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {data.map((row) => (
                <div key={row.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: row.color }}
                    >
                      {row.name}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">{formatTime(row.totalSeconds)}</span>
                  </div>
                  <div className="w-full h-3 sm:h-4 bg-gray-100 rounded">
                    <div
                      className="h-3 sm:h-4 rounded"
                      style={{ width: `${(row.totalSeconds / max) * 100}%`, backgroundColor: row.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Loading your time entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
                      <p className="text-sm sm:text-base text-gray-600">Your hobby tracking analytics and insights</p>
          {/* Weekly progress towards goal */}
          <div className="mt-3">
            {thisWeekSummary.totalSeconds >= goalSeconds && (
              <div className="mb-2 text-xs sm:text-sm font-medium text-green-700 flex items-center gap-2">
                <span>🎉</span>
                <span>Congratulations! You met your weekly goal.</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-sm text-gray-700 font-medium">This week progress</span>
              <span className="text-xs sm:text-sm text-gray-500">{formatDuration(thisWeekSummary.totalSeconds)} / {formatDuration(goalSeconds)}</span>
            </div>
            <div className="w-full h-3 sm:h-4 rounded bg-gray-100 overflow-hidden">
              <div className="flex h-full">
                {progressSegments.map((seg, idx) => (
                  <div key={idx} className="h-full" style={{ width: `${seg.widthPct}%`, backgroundColor: seg.color }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm sm:text-base text-red-600">{error}</p>
            <button
              onClick={loadEntries}
              className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {entries.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl sm:text-6xl mb-4">⏱️</div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Time Entries Yet</h2>
              <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">Start your first timer session to see your hobby tracking data here.</p>
            </div>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <BarList title="Last Week" data={lastWeekData} max={sharedMax} summary={lastWeekSummary} />
            <BarList title="This Week" data={thisWeekData} max={sharedMax} summary={thisWeekSummary} />
              </div>

          {/* Recent activities - last 5 completed */}
          <div className="bg-white rounded-lg shadow-lg mt-4 sm:mt-6">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Activities</h2>
              <p className="text-xs sm:text-sm text-gray-500">Last 5 completed</p>
            </div>
            <div className="divide-y divide-gray-100">
              {recentCompleted.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No completed activities yet</div>
              ) : (
                recentCompleted.map((entry) => {
                  const cat = resolveCategoryForEntry(entry);
                  return (
                    <div key={entry.id} className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{entry.name}</h3>
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: cat.color }}
                            >
                              {cat.name}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{entry.description}</p>
                          )}
                          <div className="text-xs sm:text-sm text-gray-500 mt-2">
                            {entry.start_time && entry.end_time
                              ? `${formatDateTimeRounded(entry.start_time)} · ${formatTimeRangeRounded(entry.start_time, entry.end_time)}`
                              : formatDateTimeRounded(entry.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-semibold text-gray-900">
                            {entry.elapsed_time ? formatTime(entry.elapsed_time) : 'In progress...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
} 