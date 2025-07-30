import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CategoryService } from '../../services/categoryService';
import type { TimeEntry, UserCategory } from '../../lib/supabase';
import { toLocalDateTimeString } from '../../lib/dateUtils';

export interface ActivityFormData {
  name: string;
  description?: string;
  category?: string;
  startTime: string;
  endTime: string;
}

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ActivityFormData) => Promise<void>;
  isLoading: boolean;
  existingEntry?: TimeEntry;
  mode: 'create' | 'edit';
}

export function ActivityModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  existingEntry,
  mode
}: ActivityModalProps) {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ActivityFormData>();

  // Load categories when modal opens
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
      });
      setCategories([...categories, newCategory]);
      setValue('category', newCategory.name);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (err) {
      console.error('Failed to create category:', err);
      // Could show error but for now just log it
    } finally {
      setCreatingCategory(false);
    }
  };

  // Set default values for create mode or existing values for edit mode
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && existingEntry) {
        setValue('name', existingEntry.name);
        setValue('description', existingEntry.description || '');
        setValue('category', existingEntry.category || '');
        
        // Format dates for datetime-local input - convert UTC to local time
        if (existingEntry.start_time) {
          setValue('startTime', toLocalDateTimeString(existingEntry.start_time));
        }
        if (existingEntry.end_time) {
          setValue('endTime', toLocalDateTimeString(existingEntry.end_time));
        }
      } else if (mode === 'create') {
        // Set default times for new entries (1 hour ago to now) in local time
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        setValue('startTime', toLocalDateTimeString(oneHourAgo.toISOString()));
        setValue('endTime', toLocalDateTimeString(now.toISOString()));
        setValue('name', '');
        setValue('description', '');
        setValue('category', '');
      }
    }
  }, [isOpen, mode, existingEntry, setValue]);

  const handleFormSubmit = async (data: ActivityFormData) => {
    try {
      await onSubmit(data);
      reset();
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleClose = () => {
    reset();
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {mode === 'create' ? 'Create Activity' : 'Edit Activity'}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Activity Name *
              </label>
              <input
                {...register('name', { required: 'Activity name is required' })}
                type="text"
                id="name"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="What did you work on?"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional details..."
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category (Optional)
              </label>
              <div className="mt-1 space-y-2">
                <select
                  {...register('category')}
                  id="category"
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  disabled={isLoading || loadingCategories || showNewCategoryInput}
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
                    disabled={isLoading || loadingCategories}
                    className="w-full text-left px-3 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Create new category
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      disabled={creatingCategory}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateNewCategory();
                        } else if (e.key === 'Escape') {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewCategory}
                      disabled={!newCategoryName.trim() || creatingCategory}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingCategory ? '...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName('');
                      }}
                      disabled={creatingCategory}
                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                  Start Time *
                </label>
                <input
                  {...register('startTime', { required: 'Start time is required' })}
                  type="datetime-local"
                  id="startTime"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
                {errors.startTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                  End Time *
                </label>
                <input
                  {...register('endTime', { required: 'End time is required' })}
                  type="datetime-local"
                  id="endTime"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
                {errors.endTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : mode === 'create' ? 'Create Activity' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 