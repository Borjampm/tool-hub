import { supabase } from '../lib/supabase';
import type { UserExpenseCategory } from '../lib/supabase';

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
   * Get all expense categories for the authenticated user
   * This includes both default categories (is_default=true) and custom categories
   */
  static async getAllAvailableExpenseCategories(): Promise<UserExpenseCategory[]> {
    return this.getUserExpenseCategories();
  }

  /**
   * Get all expense categories for the authenticated user (including defaults)
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
      .order('is_default DESC, name');

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

    // Check if category name already exists for this user
    const userCategories = await this.getUserExpenseCategories();
    const existingUser = userCategories.find(cat => 
      cat.name.toLowerCase() === data.name.toLowerCase()
    );

    if (existingUser) {
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

    // If updating name, check if it already exists for this user
    if (data.name) {
      const userCategories = await this.getUserExpenseCategories();
      const existingUser = userCategories.find(cat => 
        cat.name.toLowerCase() === data.name!.toLowerCase() && cat.id !== categoryId
      );

      if (existingUser) {
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
      .eq('category_id', categoryId)
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