import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

const apps = [
  {
    name: 'Hobby Tracker',
    emoji: '🎯',
    description: 'Track your hobbies & activities',
    route: '/hobby-tracker',
    color: 'bg-indigo-600 hover:bg-indigo-700',
    buttonText: 'Start Tracking',
  },
  {
    name: 'Expense Tracker',
    emoji: '💰',
    description: 'Monitor spending & expenses',
    route: '/expense-tracker',
    color: 'bg-green-600 hover:bg-green-700',
    buttonText: 'Track Expenses',
  },
  {
    name: 'Music Tools',
    emoji: '🎵',
    description: 'Audio utilities & practice aids',
    route: '/music-tools',
    color: 'bg-purple-600 hover:bg-purple-700',
    buttonText: 'Explore Tools',
  },
  {
    name: 'Chat',
    emoji: '💬',
    description: 'Chat interface & messaging',
    route: '/chat',
    color: 'bg-cyan-600 hover:bg-cyan-700',
    buttonText: 'Start Chatting',
  },
  {
    name: 'Flashcards',
    emoji: '🧠',
    description: 'Spaced repetition learning',
    route: '/flashcards',
    color: 'bg-amber-600 hover:bg-amber-700',
    buttonText: 'Start Learning',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Check for email verification callback and redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');

      // If this is an email verification callback, redirect to verification handler
      if (type === 'signup' && accessToken) {
        navigate('/verify-email');
        return;
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 md:pt-16 pb-8 text-center">
        <div className="mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4">
            Welcome to <span className="text-indigo-600">Tool Hub</span>
          </h1>

          {/* Authentication Status */}
          <div className="mb-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : user ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  Currently signed in as <span className="font-medium">{user.email}</span>
                </p>
                <button
                  onClick={() => navigate('/account')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 underline transition-colors"
                >
                  Manage Account
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Currently not signed in</p>
                <button
                  onClick={() => navigate('/signin')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 underline transition-colors"
                >
                  Sign in?
                </button>
              </div>
            )}
          </div>

          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            <span className="md:hidden">Your everyday tools and experiments</span>
            <span className="hidden md:inline">A personal hub for everyday tools — track hobbies, manage expenses — and a sandbox to build, try, and deploy new experiments</span>
          </p>
        </div>

        {/* Responsive grid: 2 cols mobile, 3 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-8">
          {apps.map((app) => (
            <button
              key={app.route}
              onClick={() => navigate(app.route)}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-95 touch-manipulation flex flex-col items-center text-center group"
            >
              <div className="text-2xl sm:text-3xl md:text-4xl mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-200">
                {app.emoji}
              </div>
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">
                {app.name}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-tight mb-3 md:mb-4 flex-1">
                {app.description}
              </p>
              <span className={`hidden md:inline-block w-full ${app.color} text-white py-2 px-4 rounded-lg transition-colors duration-200 font-medium text-sm`}>
                {app.buttonText}
              </span>
            </button>
          ))}
        </div>

        <div className="text-gray-500">
          <p className="text-xs sm:text-sm md:text-base">Choose your tool and start being more productive today</p>
        </div>
      </div>
    </div>
  );
}
