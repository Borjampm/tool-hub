import { supabase } from '../lib/supabase';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CreateRecurringRuleData {
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  categoryId?: string;
  accountId?: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  frequency: RecurringFrequency;
  interval?: number; // default 1
  timezone?: string; // default UTC
}

export class RecurringTransactionService {
  static async createRule(data: CreateRecurringRuleData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to create recurring rules');

    const { data: rule, error } = await supabase
      .from('recurring_transactions')
      .insert({
        user_id: user.id,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        category_id: data.categoryId,
        account_id: data.accountId,
        title: data.title,
        description: data.description,
        start_date: data.startDate,
        end_date: data.endDate,
        frequency: data.frequency,
        interval: data.interval ?? 1,
        timezone: data.timezone ?? 'UTC',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recurring rule:', error);
      throw new Error(`Failed to create recurring rule: ${error.message}`);
    }

    return rule;
  }

  /**
   * Materialize recurring transactions into transactions table for a given date range.
   * Idempotent thanks to unique index on (user_id, recurring_rule_id, recurrence_occurrence_date).
   */
  static async materializeForRange(startDate: string, endDate: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to materialize recurring transactions');

    // Fetch active rules for user that intersect the range
    // Fetch active rules; range intersection is handled in computeOccurrencesForRange
    const { data: rules, error: rulesError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching recurring rules:', rulesError);
      throw new Error(`Failed to fetch recurring rules: ${rulesError.message}`);
    }

    for (const rule of rules || []) {
      const occurrences = this.computeOccurrencesForRange(rule, startDate, endDate);
      if (occurrences.length === 0) continue;

      // Build inserts with conflict handling
      const payloads = occurrences.map((occ: string) => ({
        transaction_id: `rtx_${rule.id}_${occ}`,
        user_id: user.id,
        type: rule.type,
        amount: rule.amount,
        currency: rule.currency,
        category_id: rule.category_id ?? null,
        account_id: rule.account_id ?? null,
        title: rule.title,
        description: rule.description ?? null,
        transaction_date: occ,
        recurring_rule_id: rule.id,
        recurrence_occurrence_date: occ,
      }));

      const { error: upsertError } = await supabase
        .from('transactions')
        .upsert(payloads, {
          onConflict: 'user_id,recurring_rule_id,recurrence_occurrence_date',
          ignoreDuplicates: true,
        });

      if (upsertError) {
        console.error('Error upserting materialized transactions:', upsertError);
        throw new Error(`Failed to materialize transactions: ${upsertError.message}`);
      }
    }
  }

  // Compute occurrence dates (YYYY-MM-DD) intersecting [startDate, endDate]
  private static computeOccurrencesForRange(rule: any, startDate: string, endDate: string): string[] {
    const result: string[] = [];
    const interval: number = Math.max(1, rule.interval || 1);

    const clampStart = (a: string, b: string) => (a > b ? a : b);
    const clampEnd = (a: string, b: string) => (a < b ? a : b);
    const effectiveEnd = rule.end_date ? clampEnd(rule.end_date, endDate) : endDate;
    const rangeStart = clampStart(rule.start_date, startDate);
    const rangeEnd = effectiveEnd;
    if (rangeStart > rangeEnd) return result;

    const toUTCDate = (s: string) => {
      const [y, m, d] = s.split('-').map((n: string) => parseInt(n, 10));
      return new Date(Date.UTC(y, m - 1, d));
    };
    const toISO = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let cursor = toUTCDate(rangeStart);

    // Align cursor to rule cadence
    const alignToRule = () => {
      const start = toUTCDate(rule.start_date);
      if (rule.frequency === 'daily') {
        const diffDays = Math.floor((cursor.getTime() - start.getTime()) / 86400000);
        const mod = ((diffDays % interval) + interval) % interval;
        if (mod !== 0) cursor.setUTCDate(cursor.getUTCDate() + (interval - mod));
      } else if (rule.frequency === 'weekly') {
        const stepDays = 7 * interval;
        const diffDays = Math.floor((cursor.getTime() - start.getTime()) / 86400000);
        if (diffDays < 0) {
          cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
        } else {
          const remainder = diffDays % stepDays;
          if (remainder !== 0) {
            cursor.setUTCDate(cursor.getUTCDate() + (stepDays - remainder));
          }
        }
      } else if (rule.frequency === 'monthly') {
        const monthsDiff = (cursor.getUTCFullYear() - start.getUTCFullYear()) * 12 + (cursor.getUTCMonth() - start.getUTCMonth());
        const mod = ((monthsDiff % interval) + interval) % interval;
        if (mod !== 0) cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + (interval - mod), 1));
        // set to rule's day-of-month, clamped
        const ruleDay = toUTCDate(rule.start_date).getUTCDate();
        const daysInMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
        cursor.setUTCDate(Math.min(ruleDay, daysInMonth));
      } else if (rule.frequency === 'yearly') {
        const yearsDiff = cursor.getUTCFullYear() - start.getUTCFullYear();
        const mod = ((yearsDiff % interval) + interval) % interval;
        if (mod !== 0) cursor = new Date(Date.UTC(cursor.getUTCFullYear() + (interval - mod), start.getUTCMonth(), start.getUTCDate()));
      }
    };

    alignToRule();

    const within = (iso: string) => iso >= rangeStart && iso <= rangeEnd;

    while (true) {
      const iso = toISO(cursor);
      if (within(iso)) result.push(iso);
      if (iso >= rangeEnd) break;

      if (rule.frequency === 'daily') {
        cursor.setUTCDate(cursor.getUTCDate() + interval);
      } else if (rule.frequency === 'weekly') {
        cursor.setUTCDate(cursor.getUTCDate() + 7 * interval);
      } else if (rule.frequency === 'monthly') {
        const start = toUTCDate(rule.start_date);
        const desiredDay = start.getUTCDate();
        // Move forward by N months but preserve day-of-month as best effort
        const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + interval, 1));
        const daysInMonth = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
        nextMonth.setUTCDate(Math.min(desiredDay, daysInMonth));
        cursor = nextMonth;
      } else if (rule.frequency === 'yearly') {
        const start = toUTCDate(rule.start_date);
        cursor = new Date(Date.UTC(cursor.getUTCFullYear() + interval, start.getUTCMonth(), start.getUTCDate()));
      }
    }

    return result;
  }
}


