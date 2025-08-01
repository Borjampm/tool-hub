import { supabase } from '../lib/supabase';
import type { Transaction, ExpenseCategory } from '../lib/supabase';

export interface CreateTransactionData {
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  category: string;
  account: string; // Now accepts any custom account name
  title: string;
  description?: string;
  transactionDate: string; // Date in YYYY-MM-DD format
}

export interface UpdateTransactionData {
  type?: 'income' | 'expense';
  amount?: number;
  currency?: string;
  category?: string;
  account?: string; // Now accepts any custom account name
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
        category: data.category,
        account: data.account,
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
      category?: string;
      account?: string;
      title?: string;
      description?: string;
      transaction_date?: string;
    } = {};
    
    if (data.type !== undefined) updateData.type = data.type;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.account !== undefined) updateData.account = data.account;
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
   * Get all available expense categories
   */
  static async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching expense categories:', error);
      throw new Error(`Failed to fetch expense categories: ${error.message}`);
    }

    return categories || [];
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
   * Get transactions by category
   */
  static async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to fetch transactions');
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by category:', error);
      throw new Error(`Failed to fetch transactions for category: ${error.message}`);
    }

    return transactions || [];
  }
}