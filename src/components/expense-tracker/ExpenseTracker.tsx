import { useNavigate } from 'react-router-dom';

export function ExpenseTracker() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-12">
          <div className="text-6xl mb-6">🚧</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Under Construction</h1>
          <p className="text-xl text-gray-600 mb-8">
            The Expense Tracker feature is currently being developed. 
            We&apos;re working hard to bring you an amazing expense management experience!
          </p>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Coming Soon:</h2>
            <ul className="text-left text-gray-600 space-y-2">
              <li>• 📊 Expense categorization and tracking</li>
              <li>• 💳 Multiple payment method support</li>
              <li>• 📈 Spending analytics and insights</li>
              <li>• 📱 Receipt capture and storage</li>
              <li>• 📊 Budget planning and monitoring</li>
            </ul>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/time-tracker')}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
            >
              Try Time Tracker Instead
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 