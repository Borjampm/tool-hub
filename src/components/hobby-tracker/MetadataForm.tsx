
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { CategoryService } from '../../services/categoryService';
import type { UserCategory } from '../../lib/supabase';

interface MetadataFormData {
  name: string;
  description?: string;
  category?: string;
}

interface MetadataFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MetadataFormData) => void;
  elapsedTime: number;
  isLoading?: boolean;
}

export function MetadataForm({ isOpen, onClose, onSubmit, elapsedTime, isLoading = false }: MetadataFormProps) {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [creatingCategory, setCreatingCategory] = useState(false);
  
  // Predefined color options for categories
  const colorOptions = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
  ];
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<MetadataFormData>();

  // Load categories when component mounts or when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const userCategories = await CategoryService.getUserCategories();
      setCategories(userCategories);
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Don't show error to user, just show no categories
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      setCreatingCategory(true);
      const newCategory = await CategoryService.createCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor
      });
      setCategories([...categories, newCategory]);
      setValue('category', newCategory.name);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6'); // Reset to default
    } catch (err) {
      console.error('Failed to create category:', err);
      // Could show error but for now just log it
    } finally {
      setCreatingCategory(false);
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFormSubmit = (data: MetadataFormData) => {
    onSubmit(data);
    reset();
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setNewCategoryColor('#3B82F6');
    onClose();
  };

  const handleCancel = () => {
    reset();
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setNewCategoryColor('#3B82F6');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Activity Details</h2>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs sm:text-sm text-gray-600">Time tracked:</div>
          <div className="text-base sm:text-lg font-mono font-semibold text-gray-900">
            {formatTime(elapsedTime)}
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Activity Name *
            </label>
            <input
              type="text"
              id="name"
              {...register('name', { required: 'Activity name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="What were you working on?"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base resize-y"
              placeholder="Optional details about the activity..."
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category (Optional)
            </label>
            <div className="space-y-2">
              <select
                id="category"
                {...register('category')}
                disabled={loadingCategories || showNewCategoryInput}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-base"
              >
                <option value="">No category</option>
                {loadingCategories ? (
                  <option disabled>Loading categories...</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
              
              {!showNewCategoryInput ? (
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(true)}
                  disabled={loadingCategories}
                  className="w-full text-left px-3 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm touch-manipulation min-h-[44px]"
                >
                  + Create new category
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    disabled={creatingCategory}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-base"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNewCategory();
                      } else if (e.key === 'Escape') {
                        setShowNewCategoryInput(false);
                        setNewCategoryName('');
                        setNewCategoryColor('#3B82F6');
                      }
                    }}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategoryColor(color)}
                          className={`w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 touch-manipulation ${
                            newCategoryColor === color ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          disabled={creatingCategory}
                          title={`Select ${color}`}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      type="button"
                      onClick={handleCreateNewCategory}
                      disabled={!newCategoryName.trim() || creatingCategory}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                    >
                      {creatingCategory ? 'Creating...' : 'Add Category'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName('');
                        setNewCategoryColor('#3B82F6');
                      }}
                      disabled={creatingCategory}
                      className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {isLoading ? 'Saving...' : 'Save Activity'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 