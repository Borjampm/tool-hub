import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CategoryService } from '../../services/categoryService';
import type { CreateCategoryData, UpdateCategoryData } from '../../services/categoryService';
import type { HobbyCategory } from '../../lib/supabase';

interface CategoryFormData {
  name: string;
  color?: string;
}

export function Settings() {
  const [categories, setCategories] = useState<HobbyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HobbyCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CategoryFormData>();

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userCategories = await CategoryService.getHobbyCategories();
      setCategories(userCategories);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (data: CategoryFormData) => {
    try {
      setIsCreating(true);
      setError(null);
      
      const createData: CreateCategoryData = {
        name: data.name,
        color: data.color || undefined,
      };
      
      const newCategory = await CategoryService.createCategory(createData);
      setCategories([...categories, newCategory]);
      reset();
    } catch (err) {
      console.error('Failed to create category:', err);
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditCategory = async (data: CategoryFormData) => {
    if (!editingCategory) return;
    
    try {
      setIsCreating(true);
      setError(null);
      
      const updateData: UpdateCategoryData = {
        name: data.name,
        color: data.color || undefined,
      };
      
      const updatedCategory = await CategoryService.updateCategory(editingCategory.id, updateData);
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id ? updatedCategory : cat
      ));
      setEditingCategory(null);
      reset();
    } catch (err) {
      console.error('Failed to update category:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setDeletingCategoryId(categoryId);
      setError(null);
      
      await CategoryService.deleteCategory(categoryId);
      setCategories(categories.filter(cat => cat.id !== categoryId));
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const startEditing = (category: HobbyCategory) => {
    setEditingCategory(category);
    setValue('name', category.name);
    setValue('color', category.color || '');
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    reset();
  };

  const onSubmit = editingCategory ? handleEditCategory : handleCreateCategory;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">Manage your categories and preferences</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Categories</h2>
          <p className="mt-1 text-sm text-gray-600">Create and manage your activity categories</p>
        </div>

        <div className="p-4 sm:p-6">
          {/* Category Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  {...register('name', { 
                    required: 'Category name is required',
                    minLength: { value: 1, message: 'Category name cannot be empty' },
                    maxLength: { value: 50, message: 'Category name must be 50 characters or less' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Enter category name"
                  disabled={isCreating}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                  Color (Optional)
                </label>
                <input
                  type="color"
                  {...register('color')}
                  className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {isCreating ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
              </button>
              
              {editingCategory && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isCreating}
                  className="bg-gray-300 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Your Categories</h3>
            
            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="mt-2 text-sm sm:text-base">No categories yet</p>
                <p className="text-xs sm:text-sm">Create your first category to organize your activities</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors space-y-3 sm:space-y-0"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {category.color && (
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span className="font-medium text-gray-900 truncate">{category.name}</span>
                      <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
                        Created {new Date(category.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex space-x-4 sm:space-x-2 self-end sm:self-auto">
                      <button
                        onClick={() => startEditing(category)}
                        disabled={isCreating || !!editingCategory}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation p-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={isCreating || deletingCategoryId === category.id}
                        className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation p-1"
                      >
                        {deletingCategoryId === category.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 