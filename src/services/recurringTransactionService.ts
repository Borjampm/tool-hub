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

export interface UpdateRecurringData {
  type?: 'income' | 'expense';
  amount?: number;
  currency?: string;
  categoryId?: string;
  accountId?: string;
  title?: string;
  description?: string;
  transactionDate?: string; // YYYY-MM-DD - only applies to 'this-only' scope
  // Schedule fields - only applies to 'this-and-future' and 'rule-only' scopes
  frequency?: RecurringFrequency;
  interval?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD or null to remove end date
}

export type UpdateScope = 'this-only' | 'this-and-future' | 'rule-only';

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
   * Respects skipped occurrences (is_recurring_skipped = true).
   */
  static async materializeForRange(startDate: string, endDate: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to materialize recurring transactions');

    // Fetch active rules for user that intersect the range
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

      // Fetch skipped occurrences for this rule to exclude them
      const { data: skippedTransactions } = await supabase
        .from('transactions')
        .select('recurrence_occurrence_date')
        .eq('user_id', user.id)
        .eq('recurring_rule_id', rule.id)
        .eq('is_recurring_skipped', true);

      const skippedDates = new Set(
        (skippedTransactions || []).map((t: any) => t.recurrence_occurrence_date)
      );

      // Filter out skipped occurrences
      const occurrencesToMaterialize = occurrences.filter(occ => !skippedDates.has(occ));
      if (occurrencesToMaterialize.length === 0) continue;

      // Build inserts with conflict handling
      const payloads = occurrencesToMaterialize.map((occ: string) => ({
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
        is_recurring_skipped: false,
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

  /**
   * Update a recurring transaction with different scope options.
   */
  static async updateRecurringTransaction(
    transactionId: string,
    updates: UpdateRecurringData,
    scope: UpdateScope
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to update recurring transactions');

    // Get the transaction to find its rule and date
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !transaction) {
      throw new Error('Transaction not found');
    }

    if (!transaction.recurring_rule_id) {
      throw new Error('This is not a recurring transaction');
    }

    const updatePayload: any = {};
    if (updates.type !== undefined) updatePayload.type = updates.type;
    if (updates.amount !== undefined) updatePayload.amount = updates.amount;
    if (updates.currency !== undefined) updatePayload.currency = updates.currency;
    if (updates.categoryId !== undefined) updatePayload.category_id = updates.categoryId;
    if (updates.accountId !== undefined) updatePayload.account_id = updates.accountId;
    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.description !== undefined) updatePayload.description = updates.description;

    if (scope === 'this-only') {
      // Handle date change for this occurrence
      if (updates.transactionDate !== undefined) {
        const newDate = updates.transactionDate;
        const oldDate = transaction.recurrence_occurrence_date;
        
        // If date is changing, we need to update both transaction_date and recurrence_occurrence_date
        updatePayload.transaction_date = newDate;
        updatePayload.recurrence_occurrence_date = newDate;
        
        // Check if the new date already exists for this rule
        if (oldDate !== newDate) {
          const { data: existing } = await supabase
            .from('transactions')
            .select('transaction_id')
            .eq('user_id', user.id)
            .eq('recurring_rule_id', transaction.recurring_rule_id)
            .eq('recurrence_occurrence_date', newDate)
            .single();
          
          if (existing) {
            throw new Error(`A recurring transaction already exists for ${newDate}. Please choose a different date.`);
          }
        }
      }
      
      // Just update this specific transaction
      const { error } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('transaction_id', transactionId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to update transaction: ${error.message}`);
      }
    } else if (scope === 'this-and-future') {
      // Build rule update payload (includes schedule fields)
      const ruleUpdatePayload: any = { ...updatePayload };
      if (updates.frequency !== undefined) ruleUpdatePayload.frequency = updates.frequency;
      if (updates.interval !== undefined) ruleUpdatePayload.interval = updates.interval;
      if (updates.startDate !== undefined) ruleUpdatePayload.start_date = updates.startDate;
      if (updates.endDate !== undefined) {
        ruleUpdatePayload.end_date = updates.endDate === null ? null : updates.endDate;
      }

      // Update the rule (affects future materializations)
      const { error: ruleError } = await supabase
        .from('recurring_transactions')
        .update(ruleUpdatePayload)
        .eq('id', transaction.recurring_rule_id)
        .eq('user_id', user.id);

      if (ruleError) {
        throw new Error(`Failed to update recurring rule: ${ruleError.message}`);
      }

      // If schedule changed, we need to delete future occurrences and let them rematerialize
      // Otherwise, just update the existing future occurrences
      const scheduleChanged = updates.frequency !== undefined || 
                              updates.interval !== undefined || 
                              updates.startDate !== undefined || 
                              updates.endDate !== undefined;

      if (scheduleChanged) {
        // Delete all future occurrences (they'll be rematerialized with new schedule)
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('recurring_rule_id', transaction.recurring_rule_id)
          .eq('user_id', user.id)
          .gte('transaction_date', transaction.transaction_date)
          .eq('is_recurring_skipped', false);
        
        if (deleteError) {
          throw new Error(`Failed to update future transactions: ${deleteError.message}`);
        }
      } else {
        // Update all already-materialized future occurrences (including this one)
        const { error: futureError } = await supabase
          .from('transactions')
          .update(updatePayload)
          .eq('recurring_rule_id', transaction.recurring_rule_id)
          .eq('user_id', user.id)
          .gte('transaction_date', transaction.transaction_date)
          .eq('is_recurring_skipped', false); // Don't update skipped ones

        if (futureError) {
          throw new Error(`Failed to update future transactions: ${futureError.message}`);
        }
      }
    } else if (scope === 'rule-only') {
      // Build rule update payload (includes schedule fields)
      const ruleUpdatePayload: any = { ...updatePayload };
      if (updates.frequency !== undefined) ruleUpdatePayload.frequency = updates.frequency;
      if (updates.interval !== undefined) ruleUpdatePayload.interval = updates.interval;
      if (updates.startDate !== undefined) ruleUpdatePayload.start_date = updates.startDate;
      if (updates.endDate !== undefined) {
        ruleUpdatePayload.end_date = updates.endDate === null ? null : updates.endDate;
      }

      // Just update the rule (leave existing occurrences alone)
      const { error } = await supabase
        .from('recurring_transactions')
        .update(ruleUpdatePayload)
        .eq('id', transaction.recurring_rule_id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to update recurring rule: ${error.message}`);
      }
    }
  }

  /**
   * Skip a single occurrence of a recurring transaction.
   * Marks it as skipped so it won't be recreated during future materializations.
   */
  static async skipOccurrence(transactionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to skip recurring transactions');

    const { error } = await supabase
      .from('transactions')
      .update({ is_recurring_skipped: true })
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to skip transaction: ${error.message}`);
    }
  }

  /**
   * Deactivate a recurring rule (stops future occurrences).
   */
  static async deactivateRule(ruleId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to deactivate recurring rules');

    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: false })
      .eq('id', ruleId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to deactivate recurring rule: ${error.message}`);
    }
  }

  /**
   * Get the recurring rule for a transaction.
   */
  static async getRuleForTransaction(transactionId: string): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('recurring_rule_id')
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (txError || !transaction?.recurring_rule_id) {
      return null;
    }

    const { data: rule, error: ruleError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('id', transaction.recurring_rule_id)
      .eq('user_id', user.id)
      .single();

    if (ruleError) {
      return null;
    }

    return rule;
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


