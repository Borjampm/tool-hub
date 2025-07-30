import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function EmailVerificationCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleVerification = async () => {
      try {
        // Check if this is an email verification callback
        const hash = window.location.hash;
        if (!hash) {
          // No hash parameters, redirect to home
          navigate('/');
          return;
        }

        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // Check if this is an email verification (signup) callback
        if (type === 'signup' && accessToken) {
          // Set the session using the tokens from the URL
          if (refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              throw sessionError;
            }
          }

          // Verification successful
          setStatus('success');
          
          // Clear the hash from URL and redirect to email verified page
          window.history.replaceState(null, '', window.location.pathname);
          
          // Short delay to show success before redirect
          setTimeout(() => {
            navigate('/email-verified');
          }, 1500);
        } else {
          // Not a valid verification callback, redirect to home
          navigate('/');
        }
      } catch (err) {
        console.error('Email verification error:', err);
        setError(err instanceof Error ? err.message : 'Verification failed');
        setStatus('error');
      }
    };

    handleVerification();
  }, [navigate]);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex items-center justify-center min-h-screen px-4 sm:px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
            {status === 'processing' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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
                  Email Verified!
                </h1>
                <p className="text-gray-600 mb-4">
                  Your account has been successfully verified.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting you now...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="text-6xl mb-4">❌</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Verification Failed
                </h1>
                <p className="text-gray-600 mb-4">
                  We couldn&apos;t verify your email address. This might happen if:
                </p>
                <ul className="text-left text-sm text-gray-600 mb-6 space-y-1">
                  <li>• The verification link has expired</li>
                  <li>• The link has already been used</li>
                  <li>• The link is invalid or corrupted</li>
                </ul>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    onClick={handleRetry}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleGoHome}
                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Go to Home
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 