import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-8 sm:pt-12 text-center">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            Welcome to <span className="text-indigo-600">Marqness</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Your personal productivity hub
          </p>
        </div>

        {/* Mobile-first two-column grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
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

        <div className="text-gray-500">
          <p className="text-xs sm:text-sm">Choose your tool and start being more productive today</p>
        </div>
      </div>
    </div>
  );
} 