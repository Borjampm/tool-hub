import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function EmailVerified() {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: Auto-redirect after a few seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex items-center justify-center min-h-screen px-4 sm:px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
            {/* Success Icon */}
            <div className="text-8xl mb-6">✅</div>
            
            {/* Success Message */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Email Verified!
            </h1>
            
            <p className="text-gray-600 mb-8">
              Your email has been successfully verified. You can now access all features of Marqness and start tracking your productivity!
            </p>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium text-lg"
              >
                Go to App Hub
              </button>
              
              <button
                onClick={() => navigate('/hobby-tracker')}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
              >
                Start Hobby Tracking
              </button>
            </div>

            {/* Auto-redirect notice */}
            <p className="text-sm text-gray-500 mt-6">
              You&apos;ll be automatically redirected to the app hub in 10 seconds
            </p>
          </div>

          {/* Welcome message */}
          <div className="mt-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to <span className="text-indigo-600">Marqness</span>!
            </h2>
            <p className="text-gray-600">
              Ready to boost your productivity and track your journey?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 