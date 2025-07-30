import { useState } from 'react';
import { useTimer } from '../../contexts/TimerContext';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { MetadataForm } from './MetadataForm';
import { TimeEntryService } from '../../services/timeEntryService';

interface MetadataFormData {
  name: string;
  description?: string;
  category?: string;
}

export function TimerView() {
  const { state, startTimer, stopTimer, resetTimer } = useTimer();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      // Complete the entry in database
      await TimeEntryService.completeEntry(state.entryId, {
        name: data.name,
        description: data.description,
        category: data.category,
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Tracker</h1>
          <p className="text-gray-600">Track your activities and productivity</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <TimerDisplay elapsedTime={state.elapsedTime} />
          
          <div className="mt-8">
            <TimerControls
              isRunning={state.isRunning}
              onStart={handleStart}
              onStop={handleStop}
              isLoading={isLoading}
            />
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
            <div className="mt-4 text-sm text-gray-500">
              Entry ID: {state.entryId}
            </div>
          )}
        </div>

        {!state.isRunning && state.elapsedTime === 0 && (
          <div className="text-center text-gray-500">
            <p>Click &ldquo;Start&rdquo; to begin tracking your time</p>
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
    </div>
  );
} 