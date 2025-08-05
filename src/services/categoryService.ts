import { supabase } from '../lib/supabase';
import type { HobbyCategory } from '../lib/supabase';

export interface CreateCategoryData {
  name: string;
  color?: string;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
}

export class CategoryService {
  /**
   * Get all categories for the authenticated user
   */
  static async getHobbyCategories(): Promise<HobbyCategory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access categories');
    }

    const { data: categories, error } = await supabase
      .from('hobby_categories')
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
   * Create a new category for the authenticated user
   */
  static async createCategory(data: CreateCategoryData): Promise<HobbyCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create categories');
    }

    // Check if category name already exists for this user
    const { data: existingCategories } = await supabase
      .from('hobby_categories')
      .select('name')
      .eq('user_id', user.id)
      .eq('name', data.name);

    if (existingCategories && existingCategories.length > 0) {
      throw new Error(`Category "${data.name}" already exists`);
    }

    const { data: category, error } = await supabase
      .from('hobby_categories')
      .insert({
        user_id: user.id,
        name: data.name.trim(),
        color: data.color,
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
   * Update an existing category
   */
  static async updateCategory(categoryId: string, data: UpdateCategoryData): Promise<HobbyCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update categories');
    }

    // If updating name, check if it already exists for this user
    if (data.name) {
      const { data: existingCategories } = await supabase
        .from('hobby_categories')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('name', data.name)
        .neq('id', categoryId);

      if (existingCategories && existingCategories.length > 0) {
        throw new Error(`Category "${data.name}" already exists`);
      }
    }

    const updateData: {
      name?: string;
      color?: string;
    } = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.color !== undefined) updateData.color = data.color;

    const { data: category, error } = await supabase
      .from('hobby_categories')
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
   * Delete a category
   */
  static async deleteCategory(categoryId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to delete categories');
    }

    const { error } = await supabase
      .from('hobby_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting category:', error);
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  /**
   * Get a single category by ID
   */
  static async getCategoryById(categoryId: string): Promise<HobbyCategory | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access categories');
    }

    const { data: category, error } = await supabase
      .from('hobby_categories')
      .select('*')
      .eq('id', categoryId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Category not found
      }
      console.error('Error fetching category:', error);
      throw new Error(`Failed to fetch category: ${error.message}`);
    }

    return category;
  }

  /**
   * Check if a category name exists for the current user
   */
  static async categoryExists(name: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to check categories');
    }

    const { data: categories } = await supabase
      .from('hobby_categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim());

    return !!(categories && categories.length > 0);
  }
} 