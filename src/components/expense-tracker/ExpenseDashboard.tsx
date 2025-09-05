import { useEffect, useMemo, useState } from 'react';
import { TransactionService } from '../../services/transactionService';
import { ExpenseCategoryService } from '../../services/expenseCategoryService';
import type { Transaction, UserExpenseCategory } from '../../lib/supabase';

type PieSlice = { label: string; value: number; color: string };

function PieChart({ slices, size = 220, strokeWidth = 64 }: { slices: PieSlice[]; size?: number; strokeWidth?: number }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  let cumulative = 0;

  const getPath = (start: number, end: number) => {
    const startAngle = (start / total) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (end / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArc = end - start > total / 2 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-sm text-gray-500">No data</div>
      </div>
    );
  }

  // Special case: single positive slice → draw full ring with that color
  const positiveSlices = slices.filter(s => s.value > 0);
  if (positiveSlices.length === 1) {
    const only = positiveSlices[0];
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={only.color} strokeWidth={strokeWidth} />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />
      {slices.filter(s => s.value > 0).map((slice, idx) => {
        const start = cumulative;
        const end = cumulative + slice.value;
        cumulative = end;
        const d = getPath(start, end);
        return <path key={idx} d={d} stroke={slice.color} strokeWidth={strokeWidth} fill="none" strokeLinecap="butt"/>;
      })}
    </svg>
  );
}

export function ExpenseDashboard() {
  const [categories, setCategories] = useState<UserExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const toYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getMonthRange = (monthDate: Date) => {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    return { startDate: toYYYYMMDD(start), endDate: toYYYYMMDD(end) };
  };

  const goToPreviousMonth = () => setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const getMonthLabel = (monthDate: Date) => `${String(monthDate.getMonth() + 1).padStart(2, '0')}/${monthDate.getFullYear()}`;

  const loadMonthData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const { startDate, endDate } = getMonthRange(currentMonthDate);
      const [cats, txns] = await Promise.all([
        ExpenseCategoryService.getAllAvailableExpenseCategories(),
        TransactionService.getTransactionsInDateRange(startDate, endDate),
      ]);
      setCategories(cats);
      setTransactions(txns);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData();
  }, [currentMonthDate]);

  const categoryMap = useMemo(() => {
    const map: Record<string, { name: string; color: string; emoji?: string }> = {};
    for (const c of categories) {
      map[c.id] = { name: c.name, color: c.color || '#6B7280', emoji: c.emoji };
    }
    return map;
  }, [categories]);

  const byCurrency = useMemo(() => {
    const currencies = Array.from(new Set(transactions.map(t => t.currency)));
    const result: Record<string, { expenses: Transaction[]; incomes: Transaction[]; totalExpense: number; totalIncome: number }> = {};
    currencies.forEach(curr => {
      const exp = transactions.filter(t => t.currency === curr && t.type === 'expense');
      const inc = transactions.filter(t => t.currency === curr && t.type === 'income');
      result[curr] = {
        expenses: exp,
        incomes: inc,
        totalExpense: exp.reduce((s, t) => s + t.amount, 0),
        totalIncome: inc.reduce((s, t) => s + t.amount, 0),
      };
    });
    return result;
  }, [transactions]);

  const buildSlices = (txns: Transaction[]): PieSlice[] => {
    const sums: Record<string, number> = {};
    for (const t of txns) {
      const key = t.category_id || t.category || 'uncategorized';
      sums[key] = (sums[key] || 0) + t.amount;
    }
    const entries = Object.entries(sums).sort((a, b) => b[1] - a[1]);
    const palette = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#06b6d4','#f43f5e','#84cc16','#22c55e','#eab308'];
    let idx = 0;
    return entries.map(([catId, value]) => {
      const catInfo = categoryMap[catId];
      const color = catInfo?.color || palette[idx++ % palette.length];
      const label = catInfo ? `${catInfo.emoji ? catInfo.emoji + ' ' : ''}${catInfo.name}` : 'Uncategorized';
      return { label, value, color };
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const locale = currency === 'CLP' ? 'es-CL' : 'en-GB';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-xl font-bold text-red-900 mb-1">Failed to load dashboard</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const currencyKeys = Object.keys(byCurrency);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <div className="mt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 touch-manipulation"
                  title="Previous month"
                >
                  ‹
                </button>
                <span className="text-gray-900 font-medium">{getMonthLabel(currentMonthDate)}</span>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 touch-manipulation"
                  title="Next month"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {currencyKeys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">📉</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions this month</h3>
            <p className="text-gray-600">Add transactions to see insights here.</p>
          </div>
        ) : (
          <div className="p-6 space-y-10">
            {currencyKeys.map((currency) => {
              const { expenses, incomes, totalExpense, totalIncome } = byCurrency[currency];
              const expenseSlices = buildSlices(expenses);
              const incomeSlices = buildSlices(incomes);
              const totalAllExpense = expenseSlices.reduce((s, x) => s + x.value, 0);
              const totalAllIncome = incomeSlices.reduce((s, x) => s + x.value, 0);
              const savings = Math.max(totalIncome - totalExpense, totalAllIncome - totalAllExpense);
              const spendingRatio = totalIncome > 0 ? totalExpense / totalIncome : 0;
              const savedRatio = totalIncome > 0 ? Math.max(0, 1 - spendingRatio) : 0;

              return (
                <div key={currency} className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{currency}</h4>
                    <div className="text-sm text-gray-600">
                      <span className="mr-4">Income: <span className="font-medium text-green-700">{formatCurrency(totalIncome, currency)}</span></span>
                      <span>Expenses: <span className="font-medium text-red-700">{formatCurrency(totalExpense, currency)}</span></span>
                    </div>
                  </div>

                  {/* Progress bar: flip track/fill depending on which is larger */}
                  <div className="mb-6">
                    <div className="text-sm text-gray-700 mb-2">Spending vs Income</div>
                    <div className="relative">
                      {(() => {
                        const expenseTrack = totalExpense > totalIncome;
                        const trackTotal = expenseTrack ? totalExpense : totalIncome;
                        const fillTotal = expenseTrack ? totalIncome : totalExpense;
                        const fillColor = expenseTrack ? 'bg-green-500' : 'bg-red-500';
                        const trackBg = expenseTrack ? 'bg-red-200' : 'bg-green-200';
                        const trackTitle = expenseTrack ? 'Expenses track' : 'Income track';
                        const fillTitle = expenseTrack ? 'Income fill' : 'Expenses fill';
                        const fillWidth = trackTotal > 0 ? `${(fillTotal / trackTotal) * 100}%` : '0%';
                        return (
                          <div className={`w-full ${trackBg} rounded-full h-4 overflow-visible`} title={trackTitle}>
                            <div
                              className={`${fillColor} h-4 rounded-full`}
                              style={{ width: fillWidth }}
                              title={fillTitle}
                            ></div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-2 text-sm text-gray-700 flex flex-wrap items-center gap-4">
                      <span>Savings: <span className="font-medium">{formatCurrency(savings, currency)}</span></span>
                      <span>Saved %: <span className="font-medium">{totalIncome > 0 ? `${Math.round(savedRatio * 100)}%` : '—'}</span></span>
                      <span>Spending %: <span className="font-medium">{totalIncome > 0 ? `${Math.round(spendingRatio * 100)}%` : '—'}</span></span>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900">Expenses by Category</h5>
                        <div className="text-sm text-gray-600">Total: {formatCurrency(totalAllExpense, currency)}</div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
                        <PieChart slices={expenseSlices} />
                        <div className="mt-4 sm:mt-0 flex-1">
                          {expenseSlices.length === 0 ? (
                            <div className="text-sm text-gray-500">No expense data</div>
                          ) : (
                            <ul className="space-y-2">
                              {expenseSlices.map((s) => {
                                const percent = totalAllExpense > 0 ? Math.round((s.value / totalAllExpense) * 100) : 0;
                                return (
                                  <li key={s.label} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-2 min-w-0">
                                      <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: s.color }}></span>
                                      <span className="truncate" title={s.label}>{s.label}</span>
                                    </div>
                                    <span className="text-gray-700">{percent}%</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900">Income by Category</h5>
                        <div className="text-sm text-gray-600">Total: {formatCurrency(totalAllIncome, currency)}</div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
                        <PieChart slices={incomeSlices} />
                        <div className="mt-4 sm:mt-0 flex-1">
                          {incomeSlices.length === 0 ? (
                            <div className="text-sm text-gray-500">No income data</div>
                          ) : (
                            <ul className="space-y-2">
                              {incomeSlices.map((s) => {
                                const percent = totalAllIncome > 0 ? Math.round((s.value / totalAllIncome) * 100) : 0;
                                return (
                                  <li key={s.label} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-2 min-w-0">
                                      <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: s.color }}></span>
                                      <span className="truncate" title={s.label}>{s.label}</span>
                                    </div>
                                    <span className="text-gray-700">{percent}%</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}