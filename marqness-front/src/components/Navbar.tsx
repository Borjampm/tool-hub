import React from 'react';

interface NavbarProps {
  activeTab: 'timer' | 'dashboard';
  onTabChange: (tab: 'timer' | 'dashboard') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex space-x-8">
              <button
                onClick={() => onTabChange('timer')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === 'timer'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Timer
              </button>
              <button
                onClick={() => onTabChange('dashboard')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
            </div>
          </div>
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Marqness</h1>
          </div>
        </div>
      </div>
    </nav>
  );
} 