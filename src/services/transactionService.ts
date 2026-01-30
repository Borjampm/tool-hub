import { supabase } from '../lib/supabase';
import { RecurringTransactionService } from './recurringTransactionService';
import { offlineQueue } from './offlineQueueService';
import type { Transaction, UserExpenseCategory, UserAccount } from '../lib/supabase';

export interface CreateTransactionData {
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  categoryId: string; // Now expects category ID instead of category name
  accountId: string; // Now expects account ID instead of account name
  title: string;
  description?: string;
  transactionDate: string; // Date in YYYY-MM-DD format
}

export interface UpdateTransactionData {
  type?: 'income' | 'expense';
  amount?: number;
  currency?: string;
  categoryId?: string; // Now expects category ID instead of category name
  accountId?: string; // Now expects account ID instead of account name
  title?: string;
  description?: string;
  transactionDate?: string; // Date in YYYY-MM-DD format
}

export class TransactionService {
  /**
   * Create a new transaction
   */
  static async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create transactions');
    }

    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        transaction_id: transactionId,
        user_id: user.id,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        category_id: data.categoryId,
        account_id: data.accountId,
        title: data.title,
        description: data.description,
        transaction_date: data.transactionDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    return transaction;
  }

  /**
   * Get all transactions for the authenticated user, ordered by creation date (newest first)
   */
  static async getAllTransactions(): Promise<Transaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to fetch transactions');
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return transactions || [];
  }

  /**
   * Get transactions within an inclusive date range [startDate, endDate]
   * Dates must be in YYYY-MM-DD (ISO date, no time)
   */
  static async getTransactionsInDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to fetch transactions');
    }

    // Materialize recurring instances into the DB before querying
    try {
      await RecurringTransactionService.materializeForRange(startDate, endDate);
    } catch (e) {
      console.warn('Recurring materialization failed; proceeding with direct fetch:', e);
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions in date range:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return transactions || [];
  }

  /**
   * Get a specific transaction by transaction_id for the authenticated user
   */
  static async getTransaction(transactionId: string): Promise<Transaction | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to fetch transactions');
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching transaction:', error);
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }

    return transaction;
  }

  /**
   * Update an existing transaction
   */
  static async updateTransaction(transactionId: string, data: UpdateTransactionData): Promise<Transaction> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update transactions');
    }

    const updateData: {
      type?: 'income' | 'expense';
      amount?: number;
      currency?: string;
      category_id?: string;
      account_id?: string;
      title?: string;
      description?: string;
      transaction_date?: string;
    } = {};
    
    if (data.type !== undefined) updateData.type = data.type;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.accountId !== undefined) updateData.account_id = data.accountId;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.transactionDate !== undefined) updateData.transaction_date = data.transactionDate;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      throw new Error(`Failed to update transaction: ${error.message}`);
    }

    return transaction;
  }

  /**
   * Delete a transaction by transaction_id for the authenticated user
   */
  static async deleteTransaction(transactionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to delete transactions');
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting transaction:', error);
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
  }

  /**
   * Get all available expense categories for the authenticated user
   */
  static async getExpenseCategories(): Promise<UserExpenseCategory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access expense categories');
    }

    const { data: categories, error } = await supabase
      .from('user_expense_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching expense categories:', error);
      throw new Error(`Failed to fetch expense categories: ${error.message}`);
    }

    return categories || [];
  }

  /**
   * Get all available user accounts for the authenticated user
   */
  static async getUserAccounts(): Promise<UserAccount[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access user accounts');
    }

    const { data: accounts, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching user accounts:', error);
      throw new Error(`Failed to fetch user accounts: ${error.message}`);
    }

    return accounts || [];
  }

  /**
   * Get transactions by type (income or expense)
   */
  static async getTransactionsByType(type: 'income' | 'expense'): Promise<Transaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to fetch transactions');
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', type)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by type:', error);
      throw new Error(`Failed to fetch ${type} transactions: ${error.message}`);
    }

    return transactions || [];
  }

  /**
   * Get transactions by category ID
   */
  static async getTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to fetch transactions');
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by category:', error);
      throw new Error(`Failed to fetch transactions for category: ${error.message}`);
    }

    return transactions || [];
  }

  /**
   * Create a transaction with offline support.
   * If offline, queues the operation and returns a pending transaction object.
   */
  static async createTransactionOfflineAware(
    data: CreateTransactionData
  ): Promise<{ transaction: Transaction | null; isPending: boolean }> {
    if (navigator.onLine) {
      try {
        const transaction = await this.createTransaction(data);
        return { transaction, isPending: false };
      } catch (error) {
        // If network fails despite being "online", queue it
        if (error instanceof Error && error.message.includes('network')) {
          await offlineQueue.addToQueue('transaction', 'create', data as unknown as Record<string, unknown>);
          return { transaction: null, isPending: true };
        }
        throw error;
      }
    }

    // Offline: queue the operation
    await offlineQueue.addToQueue('transaction', 'create', data as unknown as Record<string, unknown>);
    return { transaction: null, isPending: true };
  }
}