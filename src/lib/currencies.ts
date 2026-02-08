/**
 * Currency constants for the Expense Tracker
 * Supported currencies: USD (base), CLP, EUR, GBP, BRL
 */

export const SUPPORTED_CURRENCIES = ['USD', 'CLP', 'EUR', 'GBP', 'BRL'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Base currency for exchange rate calculations (all rates are relative to this) */
export const BASE_CURRENCY: SupportedCurrency = 'USD';

/** Default currency for new transactions */
export const DEFAULT_CURRENCY: SupportedCurrency = 'CLP';

/** Currency metadata including display name, symbol, and locale for formatting */
export const CURRENCY_INFO: Record<
  SupportedCurrency,
  { name: string; symbol: string; locale: string }
> = {
  USD: { name: 'US Dollar', symbol: '$', locale: 'en-US' },
  CLP: { name: 'Chilean Peso', symbol: '$', locale: 'es-CL' },
  EUR: { name: 'Euro', symbol: '\u20AC', locale: 'en-GB' },
  GBP: { name: 'British Pound', symbol: '\u00A3', locale: 'en-GB' },
  BRL: { name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR' },
};

/**
 * Check if a string is a supported currency code
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

/**
 * Get currency info with fallback for unknown currencies
 */
export function getCurrencyInfo(currency: string): { name: string; symbol: string; locale: string } {
  if (isSupportedCurrency(currency)) {
    return CURRENCY_INFO[currency];
  }
  return { name: currency, symbol: currency, locale: 'en-US' };
}

/**
 * Format an amount with the correct locale and currency symbol.
 * Centralised so every component uses the same formatting.
 */
export function formatCurrency(amount: number, currency: string): string {
  const { locale } = getCurrencyInfo(currency);
  // Let Intl use each currency's standard fraction digits
  // (CLP → 0 decimals, USD/EUR/GBP/BRL → 2 decimals)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}
