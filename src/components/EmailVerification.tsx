import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface EmailVerificationProps {
  onComplete: () => void;
}

export function EmailVerification({ onComplete }: EmailVerificationProps) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the current session to check if verification was successful
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          // User is authenticated, verification was successful
          setStatus('success');
          
          // Start countdown to redirect
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                onComplete();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(timer);
        } else {
          // Check if there are hash parameters in the URL
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');

          if (accessToken && type === 'signup') {
            // This is a verification callback, but session might not be established yet
            // The AuthContext should handle the session automatically
            setStatus('success');
            
            // Start countdown to redirect
            const timer = setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  clearInterval(timer);
                  onComplete();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);

            return () => clearInterval(timer);
          } else {
            throw new Error('Invalid verification link or session expired');
          }
        }
      } catch (err) {
        console.error('Email verification error:', err);
        setError(err instanceof Error ? err.message : 'Verification failed');
        setStatus('error');
      }
    };

    verifyEmail();
  }, [onComplete]);

  const handleManualContinue = () => {
    onComplete();
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verifying Your Email
              </h1>
              <p className="text-gray-600">
                Please wait while we confirm your email address...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verified Successfully!
              </h1>
              <p className="text-gray-600 mb-6">
                Welcome to Marqness! Your account has been confirmed and you're ready to start tracking your time.
              </p>
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  Redirecting to your dashboard in {countdown} seconds...
                </p>
              </div>
              <button
                onClick={handleManualContinue}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
              >
                Continue to App
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verification Failed
              </h1>
              <p className="text-gray-600 mb-4">
                We couldn't verify your email address. This might happen if:
              </p>
              <ul className="text-left text-sm text-gray-600 mb-6 space-y-1">
                <li>• The verification link has expired</li>
                <li>• The link has already been used</li>
                <li>• The link is invalid or corrupted</li>
              </ul>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={handleManualContinue}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
                >
                  Continue to Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 