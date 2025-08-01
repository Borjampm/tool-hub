import { supabase } from '../lib/supabase';
import type { UserExpenseCategory, ExpenseCategory } from '../lib/supabase';

export interface CreateUserExpenseCategoryData {
  name: string;
  emoji: string;
  color?: string;
}

export interface UpdateUserExpenseCategoryData {
  name?: string;
  emoji?: string;
  color?: string;
}

export class ExpenseCategoryService {
  /**
   * Get all available expense categories (both default expense categories and user custom expense categories)
   */
  static async getAllAvailableExpenseCategories(): Promise<(ExpenseCategory | { id: string; name: string; emoji: string; color?: string; created_at: string; user_id?: string })[]> {
    const [defaultCategories, userCategories] = await Promise.all([
      this.getDefaultExpenseCategories(),
      this.getUserExpenseCategories()
    ]);

    // Convert user expense categories to match ExpenseCategory format for display
    const formattedUserCategories = userCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      created_at: cat.created_at,
      user_id: cat.user_id  // Keep user_id to identify as custom category
    }));

    return [...defaultCategories, ...formattedUserCategories];
  }

  /**
   * Get default expense categories
   */
  static async getDefaultExpenseCategories(): Promise<ExpenseCategory[]> {
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching default expense categories:', error);
      throw new Error(`Failed to fetch default expense categories: ${error.message}`);
    }

    return categories || [];
  }

  /**
   * Get user custom expense categories
   */
  static async getUserExpenseCategories(): Promise<UserExpenseCategory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access expense categories');
    }

    const { data: categories, error } = await supabase
      .from('user_expense_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching user expense categories:', error);
      throw new Error(`Failed to fetch expense categories: ${error.message}`);
    }

    return categories || [];
  }

  /**
   * Create a new custom expense category for the authenticated user
   */
  static async createUserExpenseCategory(data: CreateUserExpenseCategoryData): Promise<UserExpenseCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create expense categories');
    }

    // Check if category name already exists (both in default and user expense categories)
    const [defaultCategories, userCategories] = await Promise.all([
      this.getDefaultExpenseCategories(),
      this.getUserExpenseCategories()
    ]);

    const existingDefault = defaultCategories.find(cat => 
      cat.name.toLowerCase() === data.name.toLowerCase()
    );
    const existingUser = userCategories.find(cat => 
      cat.name.toLowerCase() === data.name.toLowerCase()
    );

    if (existingDefault || existingUser) {
      throw new Error(`Expense category "${data.name}" already exists`);
    }

    const { data: category, error } = await supabase
      .from('user_expense_categories')
      .insert({
        user_id: user.id,
        name: data.name.trim(),
        emoji: data.emoji,
        color: data.color || '#6B7280', // Default gray color
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating expense category:', error);
      throw new Error(`Failed to create expense category: ${error.message}`);
    }

    return category;
  }

  /**
   * Update an existing user expense category
   */
  static async updateUserExpenseCategory(categoryId: string, data: UpdateUserExpenseCategoryData): Promise<UserExpenseCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update expense categories');
    }

    // If updating name, check if it already exists
    if (data.name) {
      const [defaultCategories, userCategories] = await Promise.all([
        this.getDefaultExpenseCategories(),
        this.getUserExpenseCategories()
      ]);

      const existingDefault = defaultCategories.find(cat => 
        cat.name.toLowerCase() === data.name.toLowerCase()
      );
      const existingUser = userCategories.find(cat => 
        cat.name.toLowerCase() === data.name.toLowerCase() && cat.id !== categoryId
      );

      if (existingDefault || existingUser) {
        throw new Error(`Expense category "${data.name}" already exists`);
      }
    }

    const updateData: {
      name?: string;
      emoji?: string;
      color?: string;
    } = {};
    
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.emoji !== undefined) updateData.emoji = data.emoji;
    if (data.color !== undefined) updateData.color = data.color;

    const { data: category, error } = await supabase
      .from('user_expense_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating expense category:', error);
      throw new Error(`Failed to update expense category: ${error.message}`);
    }

    return category;
  }

  /**
   * Delete a user expense category
   */
  static async deleteUserExpenseCategory(categoryId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to delete expense categories');
    }

    // Check if this category is being used in any transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('category', categoryId)
      .limit(1);

    if (transactions && transactions.length > 0) {
      throw new Error('Cannot delete expense category that is being used in transactions');
    }

    const { error } = await supabase
      .from('user_expense_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting expense category:', error);
      throw new Error(`Failed to delete expense category: ${error.message}`);
    }
  }
}