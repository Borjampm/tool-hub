import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);

  // Get the redirect destination from URL parameters
  const redirectTo = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password confirmation for sign up
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error.message);
        } else {
          // Show verification email sent message
          setVerificationEmailSent(true);
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error.message);
        } else {
          // Success - navigate to intended destination or home
          navigate(redirectTo);
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setConfirmPassword('');
    setVerificationEmailSent(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show verification email sent message
  if (verificationEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center justify-center min-h-screen px-4 sm:px-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h1>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Verification Email Sent!
              </h2>
              <p className="text-gray-600 mb-6">
                We&apos;ve sent a verification email to <strong>{email}</strong>. 
                Please check your inbox and click the verification link to activate your account.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setVerificationEmailSent(false);
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
                >
                  Try Again
                </button>
                
                <Link
                  to="/"
                  className="block w-full text-center text-indigo-600 hover:text-indigo-700 py-2 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Don&apos;t see the email? Check your spam folder.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex items-center justify-center min-h-screen px-4 sm:px-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link 
              to="/"
              className="text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center gap-2 transition-colors"
            >
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to <span className="text-indigo-600">Marqness</span>
            </h1>
            <p className="text-gray-600">
              {isSignUp ? 'Create your account to get started' : 'Sign in to your account'}
            </p>
          </div>

          {/* Sign In/Up Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                {isSignUp && (
                  <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
                )}
              </div>

              {/* Confirm Password Field - Only for Sign Up */}
              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Confirm your password"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (isSignUp && password !== confirmPassword)}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </form>

            {/* Toggle Sign In/Up */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleToggleMode}
                className="text-indigo-600 hover:text-indigo-700 text-sm transition-colors"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in instead' 
                  : "Don&apos;t have an account? Create one now"
                }
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Your data is private and secure.</p>
            <p>Start tracking your productivity today!</p>
          </div>
        </div>
      </div>
    </div>
  );
} 