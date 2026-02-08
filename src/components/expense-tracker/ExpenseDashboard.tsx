import { useEffect, useMemo, useState, useCallback } from 'react';
import { TransactionService } from '../../services/transactionService';
import { ExpenseCategoryService } from '../../services/expenseCategoryService';
import { ExchangeRateService } from '../../services/exchangeRateService';
import type { Transaction, UserExpenseCategory } from '../../lib/supabase';
import { SUPPORTED_CURRENCIES, formatCurrency } from '../../lib/currencies';
import type { SupportedCurrency } from '../../lib/currencies';
import { useUserSettings } from '../../hooks/useUserSettings';

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

// ── Helper: render a single currency section (reused for per-currency and unified) ──
function CurrencySection({
  label,
  currency,
  totalExpense,
  totalIncome,
  expenseSlices,
  incomeSlices,
}: {
  label: string;
  currency: string;
  totalExpense: number;
  totalIncome: number;
  expenseSlices: PieSlice[];
  incomeSlices: PieSlice[];
}) {
  const totalAllExpense = expenseSlices.reduce((s, x) => s + x.value, 0);
  const totalAllIncome = incomeSlices.reduce((s, x) => s + x.value, 0);
  const savings = Math.max(totalIncome - totalExpense, totalAllIncome - totalAllExpense);
  const spendingRatio = totalIncome > 0 ? totalExpense / totalIncome : 0;
  const savedRatio = totalIncome > 0 ? Math.max(0, 1 - spendingRatio) : 0;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">{label}</h4>
        <div className="text-sm text-gray-600">
          <span className="mr-4">Income: <span className="font-medium text-green-700">{formatCurrency(totalIncome, currency)}</span></span>
          <span>Expenses: <span className="font-medium text-red-700">{formatCurrency(totalExpense, currency)}</span></span>
        </div>
      </div>

      {/* Progress bar */}
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
                <div className={`${fillColor} h-4 rounded-full`} style={{ width: fillWidth }} title={fillTitle}></div>
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
}

// ── Main dashboard ──────────────────────────────────────────────────────
export function ExpenseDashboard() {
  const { defaultCurrency } = useUserSettings();

  const [categories, setCategories] = useState<UserExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevMonthTransactions, setPrevMonthTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Unified view state
  const [viewMode, setViewMode] = useState<'per-currency' | 'unified'>('per-currency');
  const [unifiedCurrency, setUnifiedCurrency] = useState<SupportedCurrency>(defaultCurrency);

  // Unified converted amounts (async)
  const [unifiedData, setUnifiedData] = useState<{
    totalExpense: number;
    totalIncome: number;
    convertedTransactions: Array<Transaction & { convertedAmount: number }>;
  } | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Month comparison converted amounts (async)
  const [prevMonthExpense, setPrevMonthExpense] = useState<number | null>(null);
  const [currMonthExpense, setCurrMonthExpense] = useState<number | null>(null);

  useEffect(() => {
    setUnifiedCurrency(defaultCurrency);
  }, [defaultCurrency]);

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

  const loadMonthData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const { startDate, endDate } = getMonthRange(currentMonthDate);

      // Also fetch previous month for comparison
      const prevMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
      const { startDate: prevStart, endDate: prevEnd } = getMonthRange(prevMonth);

      const [cats, txns, prevTxns] = await Promise.all([
        ExpenseCategoryService.getAllAvailableExpenseCategories(),
        TransactionService.getTransactionsInDateRange(startDate, endDate),
        TransactionService.getTransactionsInDateRange(prevStart, prevEnd),
      ]);
      setCategories(cats);
      setTransactions(txns);
      setPrevMonthTransactions(prevTxns);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [currentMonthDate]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

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

  const buildSlices = useCallback((txns: Array<{ category_id?: string; category?: string; amount: number }>): PieSlice[] => {
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
  }, [categoryMap]);

  // ── Unified view conversion (async, runs when mode / currency changes) ──
  useEffect(() => {
    if (viewMode !== 'unified' || transactions.length === 0) {
      setUnifiedData(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsConverting(true);
      try {
        const converted: Array<Transaction & { convertedAmount: number }> = [];
        for (const t of transactions) {
          const amt = await ExchangeRateService.convert(t.amount, t.currency, unifiedCurrency, t.transaction_date);
          if (cancelled) return;
          converted.push({ ...t, convertedAmount: amt ?? t.amount });
        }
        const totalExpense = converted.filter(t => t.type === 'expense').reduce((s, t) => s + t.convertedAmount, 0);
        const totalIncome = converted.filter(t => t.type === 'income').reduce((s, t) => s + t.convertedAmount, 0);
        setUnifiedData({ totalExpense, totalIncome, convertedTransactions: converted });
      } catch (err) {
        console.error('Unified conversion error:', err);
      } finally {
        if (!cancelled) setIsConverting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [viewMode, unifiedCurrency, transactions]);

  // ── Month comparison conversion (async) ──
  useEffect(() => {
    if (transactions.length === 0 && prevMonthTransactions.length === 0) {
      setCurrMonthExpense(null);
      setPrevMonthExpense(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const currItems = transactions.filter(t => t.type === 'expense').map(t => ({ amount: t.amount, currency: t.currency, date: t.transaction_date }));
        const prevItems = prevMonthTransactions.filter(t => t.type === 'expense').map(t => ({ amount: t.amount, currency: t.currency, date: t.transaction_date }));

        const [curr, prev] = await Promise.all([
          currItems.length > 0 ? ExchangeRateService.convertMany(currItems, unifiedCurrency) : Promise.resolve(0),
          prevItems.length > 0 ? ExchangeRateService.convertMany(prevItems, unifiedCurrency) : Promise.resolve(0),
        ]);
        if (cancelled) return;
        setCurrMonthExpense(curr);
        setPrevMonthExpense(prev);
      } catch (err) {
        console.error('Month comparison conversion error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [transactions, prevMonthTransactions, unifiedCurrency]);

  // ── Unified slices ──
  const unifiedExpenseSlices = useMemo(() => {
    if (!unifiedData) return [];
    const expTxns = unifiedData.convertedTransactions
      .filter(t => t.type === 'expense')
      .map(t => ({ ...t, amount: t.convertedAmount }));
    return buildSlices(expTxns);
  }, [unifiedData, buildSlices]);

  const unifiedIncomeSlices = useMemo(() => {
    if (!unifiedData) return [];
    const incTxns = unifiedData.convertedTransactions
      .filter(t => t.type === 'income')
      .map(t => ({ ...t, amount: t.convertedAmount }));
    return buildSlices(incTxns);
  }, [unifiedData, buildSlices]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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

  const prevMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
  const prevMonthLabel = getMonthLabel(prevMonth);
  const changePercent = prevMonthExpense && prevMonthExpense > 0 && currMonthExpense !== null
    ? ((currMonthExpense - prevMonthExpense) / prevMonthExpense) * 100
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

            {/* View toggle + currency selector */}
            {currencyKeys.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode('per-currency')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors touch-manipulation ${
                      viewMode === 'per-currency' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Per Currency
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('unified')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors touch-manipulation ${
                      viewMode === 'unified' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Unified
                  </button>
                </div>
                {viewMode === 'unified' && (
                  <select
                    value={unifiedCurrency}
                    onChange={e => setUnifiedCurrency(e.target.value as SupportedCurrency)}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
            )}
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
            {/* ── Monthly Balance + Month Comparison card ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Net Balance (this month, in unified currency) */}
              {currMonthExpense !== null && (
                <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
                  <div className="text-sm text-emerald-700 font-medium mb-1">Monthly Expenses ({unifiedCurrency})</div>
                  <div className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(currMonthExpense, unifiedCurrency)}
                    <span className="text-sm font-normal text-emerald-600 ml-2">this month</span>
                  </div>
                </div>
              )}

              {/* Month-over-Month Comparison */}
              {prevMonthExpense !== null && currMonthExpense !== null && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-700 font-medium mb-1">vs {prevMonthLabel} ({unifiedCurrency})</div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(prevMonthExpense, unifiedCurrency)}
                    </span>
                    {changePercent !== null && (
                      <span className={`text-sm font-medium ${changePercent > 0 ? 'text-red-600' : changePercent < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {changePercent > 0 ? '+' : ''}{Math.round(changePercent)}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Previous month expenses</div>
                </div>
              )}
            </div>

            {/* ── Unified view ── */}
            {viewMode === 'unified' && (
              <>
                {isConverting ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Converting to {unifiedCurrency}...</p>
                  </div>
                ) : unifiedData ? (
                  <>
                    <CurrencySection
                      label={`All Transactions (${unifiedCurrency})`}
                      currency={unifiedCurrency}
                      totalExpense={unifiedData.totalExpense}
                      totalIncome={unifiedData.totalIncome}
                      expenseSlices={unifiedExpenseSlices}
                      incomeSlices={unifiedIncomeSlices}
                    />
                    <p className="text-xs text-gray-400 text-center -mt-6">
                      Amounts converted using historical rates from each transaction date.
                    </p>
                  </>
                ) : null}
              </>
            )}

            {/* ── Per-currency view ── */}
            {viewMode === 'per-currency' && currencyKeys.map((currency) => {
              const { expenses, incomes, totalExpense, totalIncome } = byCurrency[currency];
              return (
                <CurrencySection
                  key={currency}
                  label={currency}
                  currency={currency}
                  totalExpense={totalExpense}
                  totalIncome={totalIncome}
                  expenseSlices={buildSlices(expenses)}
                  incomeSlices={buildSlices(incomes)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
