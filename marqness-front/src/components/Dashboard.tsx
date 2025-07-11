import React from 'react';

export function Dashboard() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Your time tracking analytics and history</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Dashboard Coming Soon
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              This section will display your time tracking history, analytics, and productivity insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 