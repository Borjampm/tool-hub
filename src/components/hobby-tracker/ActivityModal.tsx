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
  duration: number; // duration in minutes
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
  
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<ActivityFormData>();
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const data = await CategoryService.getUserCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      setCreatingCategory(true);
      const newCategory = await CategoryService.createCategory({
        name: newCategoryName.trim(),
        color: '#3B82F6' // Default blue color
      });
      
      setCategories([...categories, newCategory]);
      setValue('category', newCategory.name);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Failed to create category:', error);
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
        
        // Set start time - convert UTC to local time
        if (existingEntry.start_time) {
          setValue('startTime', toLocalDateTimeString(existingEntry.start_time));
        }
        
        // Calculate duration from start and end time
        if (existingEntry.start_time && existingEntry.end_time) {
          const startTime = new Date(existingEntry.start_time);
          const endTime = new Date(existingEntry.end_time);
          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          setValue('duration', durationMinutes);
        } else if (existingEntry.elapsed_time) {
          // Fallback to elapsed_time if available
          setValue('duration', Math.round(existingEntry.elapsed_time / 60));
        }
      } else if (mode === 'create') {
        // Set default start time to 1 hour ago and duration to 60 minutes
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        setValue('startTime', toLocalDateTimeString(oneHourAgo.toISOString()));
        setValue('duration', 60); // 1 hour default
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 
                    flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Create Activity' : 'Edit Activity'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
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
              Category
            </label>
            
            {!showNewCategoryInput ? (
              <div className="flex items-center space-x-2">
                <select
                  {...register('category')}
                  id="category"
                  className="flex-1 mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(true)}
                  className="mt-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={isLoading}
                >
                  New
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Category name"
                  disabled={isLoading || creatingCategory}
                />
                <button
                  type="button"
                  onClick={handleCreateNewCategory}
                  disabled={isLoading || creatingCategory || !newCategoryName.trim()}
                  className="mt-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {creatingCategory ? '...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategoryName('');
                  }}
                  className="mt-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            )}
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
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                Duration (minutes) *
              </label>
              <input
                {...register('duration', { 
                  required: 'Duration is required',
                  min: { value: 1, message: 'Duration must be at least 1 minute' },
                  max: { value: 1440, message: 'Duration cannot exceed 24 hours' }
                })}
                type="number"
                id="duration"
                min="1"
                max="1440"
                step="1"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="60"
                disabled={isLoading}
              />
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
              )}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </div>
              ) : (
                mode === 'create' ? 'Create Activity' : 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 