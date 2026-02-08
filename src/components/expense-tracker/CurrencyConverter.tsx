import { useState, useEffect, useMemo, useCallback } from 'react';
import { ExchangeRateService } from '../../services/exchangeRateService';
import type { ExchangeRate } from '../../lib/supabase';
import { SUPPORTED_CURRENCIES, CURRENCY_INFO, formatCurrency } from '../../lib/currencies';
import type { SupportedCurrency } from '../../lib/currencies';
import { useUserSettings } from '../../hooks/useUserSettings';

// ── Trends line chart (SVG) ────────────────────────────────────────────
interface TrendPoint { date: string; rate: number }

function TrendsChart({ points, fromCurrency, toCurrency }: { points: TrendPoint[]; fromCurrency: string; toCurrency: string }) {
  if (points.length < 2) {
    return <p className="text-sm text-gray-500 text-center py-8">Not enough data for a chart.</p>;
  }

  const width = 600;
  const height = 220;
  const padX = 48;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const rates = points.map(p => p.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const range = maxRate - minRate || 1;

  const toX = (i: number) => padX + (i / (points.length - 1)) * chartW;
  const toY = (r: number) => padY + chartH - ((r - minRate) / range) * chartH;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.rate).toFixed(1)}`).join(' ');

  // Show ~5 date labels evenly spaced
  const labelCount = Math.min(5, points.length);
  const labelStep = Math.max(1, Math.floor((points.length - 1) / (labelCount - 1)));
  const labelIndices: number[] = [];
  for (let i = 0; i < points.length; i += labelStep) labelIndices.push(i);
  if (labelIndices[labelIndices.length - 1] !== points.length - 1) labelIndices.push(points.length - 1);

  const formatLabel = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padY + chartH - f * chartH;
        const val = minRate + f * range;
        return (
          <g key={f}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#E5E7EB" strokeWidth={1} />
            <text x={padX - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#6B7280">
              {val < 10 ? val.toFixed(3) : val < 100 ? val.toFixed(2) : Math.round(val)}
            </text>
          </g>
        );
      })}

      {/* Line */}
      <path d={pathD} fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Date labels */}
      {labelIndices.map((i) => (
        <text key={i} x={toX(i)} y={height - 4} textAnchor="middle" fontSize={10} fill="#6B7280">
          {formatLabel(points[i].date)}
        </text>
      ))}

      {/* Title */}
      <text x={width / 2} y={14} textAnchor="middle" fontSize={12} fill="#374151" fontWeight="600">
        1 {fromCurrency} → {toCurrency}
      </text>
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export function CurrencyConverter() {
  const { defaultCurrency } = useUserSettings();

  // Quick convert state
  const [amount, setAmount] = useState<number>(1000);
  const [sourceCurrency, setSourceCurrency] = useState<SupportedCurrency>(defaultCurrency);
  const [latestRates, setLatestRates] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Trends state
  const [trendFrom, setTrendFrom] = useState<SupportedCurrency>(defaultCurrency);
  const [trendTo, setTrendTo] = useState<SupportedCurrency>(defaultCurrency === 'USD' ? 'EUR' : 'USD');
  const [trendDays, setTrendDays] = useState<30 | 90>(30);
  const [trendData, setTrendData] = useState<ExchangeRate[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState(false);

  // Sync source currency with default when it loads
  useEffect(() => {
    setSourceCurrency(defaultCurrency);
    setTrendFrom(defaultCurrency);
    setTrendTo(defaultCurrency === 'USD' ? 'EUR' : 'USD');
  }, [defaultCurrency]);

  // Fetch latest rates on mount
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const rates = await ExchangeRateService.getLatestRates();
        setLatestRates(rates);
      } catch (err) {
        console.error('Failed to load rates:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Fetch trend data when pair or days changes
  const loadTrends = useCallback(async () => {
    try {
      setIsTrendLoading(true);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - trendDays);
      const toISO = (d: Date) => d.toISOString().split('T')[0];
      const data = await ExchangeRateService.getRatesForDateRange(toISO(start), toISO(end));
      setTrendData(data);
    } catch (err) {
      console.error('Failed to load trend data:', err);
    } finally {
      setIsTrendLoading(false);
    }
  }, [trendDays]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  // Convert amount to all other currencies
  const conversions = useMemo(() => {
    if (!latestRates?.rates) return [];
    const fromRate = latestRates.rates[sourceCurrency];
    if (!fromRate) return [];

    return SUPPORTED_CURRENCIES
      .filter(c => c !== sourceCurrency)
      .map(target => {
        const toRate = latestRates.rates[target];
        if (!toRate) return { currency: target, amount: 0 };
        return { currency: target, amount: amount * (toRate / fromRate) };
      });
  }, [latestRates, sourceCurrency, amount]);

  // Build rate table (1 unit of each → all others)
  const rateTable = useMemo(() => {
    if (!latestRates?.rates) return null;
    const rows: Record<string, Record<string, number>> = {};
    for (const from of SUPPORTED_CURRENCIES) {
      rows[from] = {};
      const fromRate = latestRates.rates[from];
      if (!fromRate) continue;
      for (const to of SUPPORTED_CURRENCIES) {
        const toRate = latestRates.rates[to];
        if (!toRate) continue;
        rows[from][to] = toRate / fromRate;
      }
    }
    return rows;
  }, [latestRates]);

  // Trend points
  const trendPoints = useMemo<TrendPoint[]>(() => {
    return trendData
      .filter(r => r.rates[trendFrom] && r.rates[trendTo])
      .map(r => ({
        date: r.rate_date,
        rate: r.rates[trendTo] / r.rates[trendFrom],
      }));
  }, [trendData, trendFrom, trendTo]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exchange rates...</p>
        </div>
      </div>
    );
  }

  if (!latestRates) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">No exchange rate data available</h2>
          <p className="text-gray-600">Exchange rates have not been synced yet.</p>
        </div>
      </div>
    );
  }

  const rateDate = latestRates.rate_date;
  const [ry, rm, rd] = rateDate.split('-');
  const rateDateDisplay = `${rd}/${rm}/${ry}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Quick Convert */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Currency Converter</h2>
        <p className="text-sm text-gray-500 mb-6">Rates as of {rateDateDisplay}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sm:col-span-2">
            <label htmlFor="convert-amount" className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              id="convert-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount || ''}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base"
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="convert-currency" className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select
              id="convert-currency"
              value={sourceCurrency}
              onChange={e => setSourceCurrency(e.target.value as SupportedCurrency)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base"
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c} value={c}>{CURRENCY_INFO[c].symbol} {c} — {CURRENCY_INFO[c].name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Conversion results */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {conversions.map(({ currency, amount: converted }) => (
            <div key={currency} className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{CURRENCY_INFO[currency as SupportedCurrency].name}</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(converted, currency)}</div>
              <div className="text-xs text-gray-400 mt-1">{currency}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rate Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cross-Rate Table</h3>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left pr-4 pb-2 text-gray-500 font-medium">1 unit →</th>
                {SUPPORTED_CURRENCIES.map(c => (
                  <th key={c} className="text-right px-3 pb-2 text-gray-500 font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rateTable && SUPPORTED_CURRENCIES.map(from => (
                <tr key={from}>
                  <td className="py-2 pr-4 font-medium text-gray-900">
                    {CURRENCY_INFO[from].symbol} {from}
                  </td>
                  {SUPPORTED_CURRENCIES.map(to => {
                    const val = rateTable[from]?.[to];
                    const isSame = from === to;
                    return (
                      <td key={to} className={`py-2 px-3 text-right tabular-nums ${isSame ? 'text-gray-300' : 'text-gray-700'}`}>
                        {val !== undefined ? (val < 10 ? val.toFixed(4) : val < 1000 ? val.toFixed(2) : Math.round(val).toLocaleString()) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exchange Rate Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Rate Trends</h3>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <select
              value={trendFrom}
              onChange={e => setTrendFrom(e.target.value as SupportedCurrency)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <select
              value={trendTo}
              onChange={e => setTrendTo(e.target.value as SupportedCurrency)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {([30, 90] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setTrendDays(d)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors touch-manipulation ${
                  trendDays === d ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {isTrendLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading trends...</p>
          </div>
        ) : (
          <TrendsChart points={trendPoints} fromCurrency={trendFrom} toCurrency={trendTo} />
        )}
      </div>
    </div>
  );
}
