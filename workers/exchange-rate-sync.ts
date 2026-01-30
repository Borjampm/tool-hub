/**
 * Cloudflare Worker for syncing exchange rates from Open Exchange Rates API to Supabase
 *
 * This worker runs daily via cron trigger to fetch current exchange rates
 * and store them in the exchange_rates table.
 *
 * Environment variables (set via wrangler secret):
 * - OXR_API_KEY: Open Exchange Rates API key
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key (NOT the anon key)
 */

import { createClient } from '@supabase/supabase-js';

interface Env {
  OXR_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

interface OXRResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

const SUPPORTED_CURRENCIES = ['USD', 'CLP', 'EUR', 'GBP', 'BRL'];

export default {
  /**
   * Scheduled handler - runs on cron trigger
   */
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    await syncExchangeRates(env);
  },

  /**
   * HTTP handler - for manual testing via HTTP request
   */
  async fetch(
    _request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    try {
      await syncExchangeRates(env);
      return new Response(
        JSON.stringify({ success: true, message: 'Exchange rates synced successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

async function syncExchangeRates(env: Env): Promise<void> {
  // Validate environment variables
  if (!env.OXR_API_KEY) {
    throw new Error('OXR_API_KEY environment variable is not set');
  }
  if (!env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }
  if (!env.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY environment variable is not set');
  }

  // Fetch rates from Open Exchange Rates API
  const oxrUrl = `https://openexchangerates.org/api/latest.json?app_id=${env.OXR_API_KEY}&symbols=${SUPPORTED_CURRENCIES.join(',')}`;

  const response = await fetch(oxrUrl);

  if (!response.ok) {
    throw new Error(`Open Exchange Rates API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OXRResponse;

  if (!data.rates) {
    throw new Error('Invalid response from Open Exchange Rates API: missing rates');
  }

  // Ensure USD is always 1 (base currency)
  const rates: Record<string, number> = {
    USD: 1,
    ...data.rates,
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Initialize Supabase client with service role key
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // Upsert the exchange rates (insert or update if date already exists)
  const { error } = await supabase.from('exchange_rates').upsert(
    {
      rate_date: today,
      base_currency: 'USD',
      rates,
      source: 'openexchangerates',
      fetched_at: new Date().toISOString(),
    },
    { onConflict: 'rate_date' }
  );

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  console.log(`Exchange rates synced successfully for ${today}:`, rates);
}
