import React, { useState } from 'react';
import { useTimer } from '../contexts/TimerContext';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { MetadataForm } from './MetadataForm';

interface MetadataFormData {
  name: string;
  description?: string;
  category?: string;
}

export function TimerView() {
  const { state, startTimer, stopTimer, resetTimer } = useTimer();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const generateEntryId = () => {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleStart = () => {
    const entryId = generateEntryId();
    
    // Log where API request would be made
    console.log(`🚀 API Request - POST /api/entries/start`, {
      timestamp: new Date().toISOString(),
      entryId: entryId,
    });

    startTimer(entryId);
  };

  const handleStop = () => {
    stopTimer();
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: MetadataFormData) => {
    // Log where API request would be made
    console.log(`🚀 API Request - POST /api/entries/${state.entryId}/stop`, {
      entryId: state.entryId,
      elapsedTime: state.elapsedTime,
      metadata: data,
      timestamp: new Date().toISOString(),
    });

    // Reset the timer after successful "submission"
    resetTimer();
    setIsFormOpen(false);
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
            />
          </div>

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
      />
    </div>
  );
} 