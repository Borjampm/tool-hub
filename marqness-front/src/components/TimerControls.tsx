import React from 'react';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function TimerControls({ isRunning, onStart, onStop }: TimerControlsProps) {
  return (
    <div className="flex justify-center">
      {!isRunning ? (
        <button
          onClick={onStart}
          className="px-8 py-3 rounded-lg text-lg font-semibold transition-colors bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Start
        </button>
      ) : (
        <button
          onClick={onStop}
          className="px-8 py-3 rounded-lg text-lg font-semibold transition-colors bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Stop
        </button>
      )}
    </div>
  );
} 