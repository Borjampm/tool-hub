import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-lg md:max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 md:flex md:items-center md:justify-center md:min-h-screen md:pt-0 text-center">
        <div className="md:w-full">
          <div className="mb-6 sm:mb-8 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4">
              Welcome to <span className="text-indigo-600">Marqness</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 md:max-w-2xl md:mx-auto">
              <span className="md:hidden">Your personal productivity hub</span>
              <span className="hidden md:inline">Your personal productivity hub for tracking hobbies and managing expenses</span>
            </p>
          </div>

          {/* Mobile-first two-column grid - visible only on mobile */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 md:hidden">
            {/* Hobby Tracker Button */}
            <button
              onClick={() => navigate('/hobby-tracker')}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 touch-manipulation min-h-[120px] sm:min-h-[140px] flex flex-col items-center justify-center group"
            >
              <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">🎯</div>
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Hobby Tracker</h2>
              <p className="text-xs sm:text-sm text-gray-600 text-center leading-tight">
                Track your hobbies & activities
              </p>
            </button>

            {/* Expense Tracker Button */}
            <button
              onClick={() => navigate('/expense-tracker')}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 touch-manipulation min-h-[120px] sm:min-h-[140px] flex flex-col items-center justify-center group"
            >
              <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">💰</div>
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Expense Tracker</h2>
              <p className="text-xs sm:text-sm text-gray-600 text-center leading-tight">
                Monitor spending & expenses
              </p>
            </button>
          </div>

          {/* Desktop layout - visible only on medium screens and up */}
          <div className="hidden md:grid md:grid-cols-2 gap-6 sm:gap-8 max-w-2xl mx-auto mb-8 sm:mb-12">
            {/* Hobby Tracker Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl sm:text-4xl mb-4">🎯</div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Hobby Tracker</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Track your hobbies, analyze time spent on activities, and manage your personal interests efficiently
              </p>
              <button
                onClick={() => navigate('/hobby-tracker')}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium touch-manipulation min-h-[44px] text-base sm:text-lg"
              >
                Start Hobby Tracking
              </button>
            </div>

            {/* Expense Tracker Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl sm:text-4xl mb-4">💰</div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Expense Tracker</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Monitor your spending, categorize expenses, and gain insights into your financial habits
              </p>
              <button
                onClick={() => navigate('/expense-tracker')}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium touch-manipulation min-h-[44px] text-base sm:text-lg"
              >
                Track Expenses
              </button>
            </div>
          </div>

          <div className="text-gray-500">
            <p className="text-xs sm:text-sm md:text-base">Choose your tool and start being more productive today</p>
          </div>
        </div>
      </div>
    </div>
  );
} 