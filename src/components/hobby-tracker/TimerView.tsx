import { useState } from 'react';
import { useTimer } from '../../contexts/TimerContext';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { MetadataForm } from './MetadataForm';
import { ActivityModal, type ActivityFormData } from './ActivityModal';
import { TimeEntryService, type ManualTimeEntryData } from '../../services/timeEntryService';
import { CategoryService } from '../../services/categoryService';

interface MetadataFormData {
  name: string;
  description?: string;
  category?: string;
}

export function TimerView() {
  const { state, startTimer, stopTimer, resetTimer } = useTimer();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualEntryLoading, setIsManualEntryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateEntryId = () => {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleStart = async () => {
    const entryId = generateEntryId();
    setIsLoading(true);
    setError(null);
    
    try {
      // Create entry in database
      await TimeEntryService.createEntry({
        entryId,
        startTime: new Date(),
      });
      
      // Start the timer in local state
      startTimer(entryId);
      
      console.log(`✅ Time entry created:`, entryId);
    } catch (err) {
      console.error('Failed to start timer:', err);
      setError('Failed to start timer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    stopTimer();
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: MetadataFormData) => {
    if (!state.entryId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Find the category ID if a category was selected
      let categoryId: string | undefined;
      if (data.category) {
        const categories = await CategoryService.getHobbyCategories();
        const selectedCategory = categories.find(cat => cat.name === data.category);
        categoryId = selectedCategory?.id;
      }

      // Complete the entry in database
      await TimeEntryService.completeEntry(state.entryId, {
        name: data.name,
        description: data.description,
        categoryId: categoryId,
        endTime: new Date(),
        elapsedTime: state.elapsedTime,
      });
      
      console.log(`✅ Time entry completed:`, state.entryId);
      
      // Reset the timer after successful submission
      resetTimer();
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save time entry:', err);
      setError('Failed to save time entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    // If user cancels, we should reset the timer
    resetTimer();
  };

  const handleManualEntrySubmit = async (data: ActivityFormData) => {
    try {
      setIsManualEntryLoading(true);
      setError(null);

      const startTime = new Date(data.startTime);
      const endTime = new Date(startTime.getTime() + data.duration * 60 * 1000); // Add duration in milliseconds
      
      if (data.duration <= 0) {
        throw new Error('Duration must be greater than 0');
      }

      const elapsedTime = data.duration * 60; // Convert duration to seconds

      // Find the category ID if a category was selected
      let categoryId: string | undefined;
      if (data.category) {
        const categories = await CategoryService.getHobbyCategories();
        const selectedCategory = categories.find(cat => cat.name === data.category);
        categoryId = selectedCategory?.id;
      }

      const manualEntryData: ManualTimeEntryData = {
        name: data.name,
        description: data.description,
        categoryId: categoryId,
        startTime,
        endTime,
        elapsedTime,
      };
      
      await TimeEntryService.createManualEntry(manualEntryData);
      console.log('✅ Manual time entry created successfully');
      
      setIsManualEntryOpen(false);
    } catch (err) {
      console.error('Failed to save manual entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to save manual entry');
    } finally {
      setIsManualEntryLoading(false);
    }
  };

  const handleManualEntryClose = () => {
    setIsManualEntryOpen(false);
    setIsManualEntryLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="text-center space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Hobby Tracker</h1>
          <p className="text-sm sm:text-base text-gray-600">Track your hobbies and interests</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <TimerDisplay elapsedTime={state.elapsedTime} />
          
          <div className="mt-6 sm:mt-8">
            <TimerControls
              isRunning={state.isRunning}
              onStart={handleStart}
              onStop={handleStop}
              isLoading={isLoading}
            />
          </div>

          {/* Manual Entry Button */}
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
            <div className="flex flex-col items-center space-y-3">
              <p className="text-sm text-gray-600">Already completed an activity?</p>
              <button
                onClick={() => setIsManualEntryOpen(true)}
                disabled={isLoading || isManualEntryLoading}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Manual Entry
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {state.entryId && (
            <div className="mt-4 text-xs sm:text-sm text-gray-500 break-all">
              Entry ID: {state.entryId}
            </div>
          )}
        </div>

        {!state.isRunning && state.elapsedTime === 0 && (
          <div className="text-center text-gray-500">
            <p className="text-sm sm:text-base">Click &ldquo;Start&rdquo; to begin tracking your time</p>
          </div>
        )}
      </div>

      <MetadataForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        elapsedTime={state.elapsedTime}
        isLoading={isLoading}
      />

      <ActivityModal
        isOpen={isManualEntryOpen}
        onClose={handleManualEntryClose}
        onSubmit={handleManualEntrySubmit}
        isLoading={isManualEntryLoading}
        mode="create"
      />
    </div>
  );
} 