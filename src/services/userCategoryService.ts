import { supabase } from '../lib/supabase';
import type { UserCategory, ExpenseCategory } from '../lib/supabase';

export interface CreateUserCategoryData {
  name: string;
  emoji: string;
  color?: string;
}

export interface UpdateUserCategoryData {
  name?: string;
  emoji?: string;
  color?: string;
}

export class UserCategoryService {
  /**
   * Get all available categories (both default expense categories and user custom categories)
   */
  static async getAllAvailableCategories(): Promise<(ExpenseCategory | UserCategory)[]> {
    const [defaultCategories, userCategories] = await Promise.all([
      this.getDefaultCategories(),
      this.getUserCategories()
    ]);

    // Convert user categories to match ExpenseCategory format for display
    const formattedUserCategories = userCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji || '📝', // Use user's chosen emoji or fallback
      created_at: cat.created_at
    }));

    return [...defaultCategories, ...formattedUserCategories];
  }

  /**
   * Get default expense categories
   */
  static async getDefaultCategories(): Promise<ExpenseCategory[]> {
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching default categories:', error);
      throw new Error(`Failed to fetch default categories: ${error.message}`);
    }

    return categories || [];
  }

  /**
   * Get user custom categories
   */
  static async getUserCategories(): Promise<UserCategory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access categories');
    }

    const { data: categories, error } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching user categories:', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return categories || [];
  }

  /**
   * Create a new custom category for the authenticated user
   */
  static async createUserCategory(data: CreateUserCategoryData): Promise<UserCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create categories');
    }

    // Check if category name already exists (both in default and user categories)
    const [defaultCategories, userCategories] = await Promise.all([
      this.getDefaultCategories(),
      this.getUserCategories()
    ]);

    const existingDefault = defaultCategories.find(cat => 
      cat.name.toLowerCase() === data.name.toLowerCase()
    );
    const existingUser = userCategories.find(cat => 
      cat.name.toLowerCase() === data.name.toLowerCase()
    );

    if (existingDefault || existingUser) {
      throw new Error(`Category "${data.name}" already exists`);
    }

    const { data: category, error } = await supabase
      .from('user_categories')
      .insert({
        user_id: user.id,
        name: data.name.trim(),
        emoji: data.emoji,
        color: data.color || '#6B7280', // Default gray color
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return category;
  }

  /**
   * Update an existing user category
   */
  static async updateUserCategory(categoryId: string, data: UpdateUserCategoryData): Promise<UserCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update categories');
    }

    // If updating name, check if it already exists
    if (data.name) {
      const [defaultCategories, userCategories] = await Promise.all([
        this.getDefaultCategories(),
        this.getUserCategories()
      ]);

      const existingDefault = defaultCategories.find(cat => 
        cat.name.toLowerCase() === data.name.toLowerCase()
      );
      const existingUser = userCategories.find(cat => 
        cat.name.toLowerCase() === data.name.toLowerCase() && cat.id !== categoryId
      );

      if (existingDefault || existingUser) {
        throw new Error(`Category "${data.name}" already exists`);
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
      .from('user_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return category;
  }

  /**
   * Delete a user category
   */
  static async deleteUserCategory(categoryId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to delete categories');
    }

    // Check if this category is being used in any transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('category', categoryId)
      .limit(1);

    if (transactions && transactions.length > 0) {
      throw new Error('Cannot delete category that is being used in transactions');
    }

    const { error } = await supabase
      .from('user_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting category:', error);
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }
}