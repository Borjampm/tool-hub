import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-indigo-600">Marqness</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your personal productivity hub for tracking time and managing expenses
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Time Tracker Button */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
            <div className="text-4xl mb-4">⏱️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Time Tracker</h2>
            <p className="text-gray-600 mb-6">
              Track your time, analyze productivity patterns, and manage your activities efficiently
            </p>
            <button
              onClick={() => navigate('/time-tracker')}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
            >
              Start Time Tracking
            </button>
          </div>

          {/* Expense Tracker Button */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
            <div className="text-4xl mb-4">💰</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Expense Tracker</h2>
            <p className="text-gray-600 mb-6">
              Monitor your spending, categorize expenses, and gain insights into your financial habits
            </p>
            <button
              onClick={() => navigate('/expense-tracker')}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
            >
              Track Expenses
            </button>
          </div>
        </div>

        <div className="mt-12 text-gray-500">
          <p>Choose your tool and start being more productive today</p>
        </div>
      </div>
    </div>
  );
} 