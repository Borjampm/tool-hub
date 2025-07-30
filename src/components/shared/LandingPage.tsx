import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-indigo-600">Marqness</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Your personal productivity hub for tracking hobbies and managing expenses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-2xl mx-auto">
          {/* Hobby Tracker Button */}
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

          {/* Expense Tracker Button */}
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

        <div className="mt-8 sm:mt-12 text-gray-500">
          <p className="text-sm sm:text-base">Choose your tool and start being more productive today</p>
        </div>
      </div>
    </div>
  );
} 