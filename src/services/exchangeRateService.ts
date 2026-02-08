import { supabase } from '../lib/supabase';
import type { ExchangeRate } from '../lib/supabase';
import { SUPPORTED_CURRENCIES, BASE_CURRENCY, isSupportedCurrency } from '../lib/currencies';
import type { SupportedCurrency } from '../lib/currencies';

/** Cache entry with TTL */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** In-memory cache for exchange rates */
const ratesCache: Map<string, CacheEntry<ExchangeRate>> = new Map();

/** Cache for latest rates */
let latestRatesCache: CacheEntry<ExchangeRate> | null = null;

/**
 * Check if a cache entry is still valid
 */
function isCacheValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Exchange Rate Service
 * Handles fetching, caching, and converting between currencies using stored exchange rates.
 */
export class ExchangeRateService {
  /**
   * Get exchange rates for a specific date.
   * Falls back to the most recent available rates if the exact date is not found.
   */
  static async getRatesForDate(date: string): Promise<ExchangeRate | null> {
    // Check cache first
    const cached = ratesCache.get(date) ?? null;
    if (isCacheValid(cached)) {
      return cached.data;
    }

    // Try to get exact date
    const { data: exactData, error: exactError } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('rate_date', date)
      .single();

    if (!exactError && exactData) {
      const rates = exactData as ExchangeRate;
      ratesCache.set(date, { data: rates, timestamp: Date.now() });
      return rates;
    }

    // Fallback: get most recent rates before the requested date
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('exchange_rates')
      .select('*')
      .lte('rate_date', date)
      .order('rate_date', { ascending: false })
      .limit(1)
      .single();

    if (!fallbackError && fallbackData) {
      const rates = fallbackData as ExchangeRate;
      // Cache under both the requested date and the actual date
      ratesCache.set(date, { data: rates, timestamp: Date.now() });
      ratesCache.set(rates.rate_date, { data: rates, timestamp: Date.now() });
      return rates;
    }

    // If no historical data, try to get the oldest available rates
    const { data: oldestData, error: oldestError } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('rate_date', { ascending: true })
      .limit(1)
      .single();

    if (!oldestError && oldestData) {
      const rates = oldestData as ExchangeRate;
      ratesCache.set(date, { data: rates, timestamp: Date.now() });
      return rates;
    }

    return null;
  }

  /**
   * Get the most recent exchange rates available
   */
  static async getLatestRates(): Promise<ExchangeRate | null> {
    // Check cache first
    if (isCacheValid(latestRatesCache)) {
      return latestRatesCache.data;
    }

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('rate_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Error fetching latest exchange rates:', error);
      return null;
    }

    const rates = data as ExchangeRate;
    latestRatesCache = { data: rates, timestamp: Date.now() };
    ratesCache.set(rates.rate_date, { data: rates, timestamp: Date.now() });

    return rates;
  }

  /**
   * Convert an amount from one currency to another.
   * Uses cross-rate formula: amount * (rates[to] / rates[from])
   *
   * @param amount - The amount to convert
   * @param from - Source currency code
   * @param to - Target currency code
   * @param date - Optional date for historical rates (defaults to latest)
   * @returns Converted amount, or null if conversion is not possible
   */
  static async convert(
    amount: number,
    from: string,
    to: string,
    date?: string
  ): Promise<number | null> {
    // Same currency, no conversion needed
    if (from === to) {
      return amount;
    }

    // Get rates for the specified date or latest
    const rates = date
      ? await this.getRatesForDate(date)
      : await this.getLatestRates();

    if (!rates || !rates.rates) {
      console.error('No exchange rates available for conversion');
      return null;
    }

    const fromRate = rates.rates[from];
    const toRate = rates.rates[to];

    if (fromRate === undefined || toRate === undefined) {
      console.error(`Missing exchange rate for ${from} or ${to}`);
      return null;
    }

    // Cross-rate formula: amount * (to_rate / from_rate)
    return amount * (toRate / fromRate);
  }

  /**
   * Convert multiple amounts to a target currency.
   * Useful for dashboard totals where you need to sum values in different currencies.
   *
   * @param items - Array of items with amount, currency, and optional date
   * @param targetCurrency - The currency to convert all amounts to
   * @returns Total in target currency, or null if any conversion fails
   */
  static async convertMany(
    items: Array<{ amount: number; currency: string; date?: string }>,
    targetCurrency: SupportedCurrency
  ): Promise<number | null> {
    let total = 0;

    for (const item of items) {
      const converted = await this.convert(
        item.amount,
        item.currency,
        targetCurrency,
        item.date
      );

      if (converted === null) {
        return null;
      }

      total += converted;
    }

    return total;
  }

  /**
   * Get all supported currency codes
   */
  static getSupportedCurrencies(): readonly string[] {
    return SUPPORTED_CURRENCIES;
  }

  /**
   * Get the base currency code
   */
  static getBaseCurrency(): string {
    return BASE_CURRENCY;
  }

  /**
   * Check if a currency is supported
   */
  static isSupportedCurrency(currency: string): boolean {
    return isSupportedCurrency(currency);
  }

  /**
   * Get exchange rates for a date range (ascending order).
   * Useful for rendering trends charts.
   */
  static async getRatesForDateRange(
    startDate: string,
    endDate: string
  ): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .gte('rate_date', startDate)
      .lte('rate_date', endDate)
      .order('rate_date', { ascending: true });

    if (error || !data) {
      console.error('Error fetching exchange rates for range:', error);
      return [];
    }

    const rates = data as ExchangeRate[];

    // Populate individual date cache entries
    for (const rate of rates) {
      ratesCache.set(rate.rate_date, { data: rate, timestamp: Date.now() });
    }

    return rates;
  }

  /**
   * Clear the in-memory cache (useful for testing or forcing refresh)
   */
  static clearCache(): void {
    ratesCache.clear();
    latestRatesCache = null;
  }
}
