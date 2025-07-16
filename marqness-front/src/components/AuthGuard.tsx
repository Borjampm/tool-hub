import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-6xl mb-4">⏱️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Marqness
            </h1>
            <p className="text-gray-600 mb-6">
              Track your time and boost your productivity. Sign in to get started.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
            >
              Sign In / Create Account
            </button>
          </div>
        </div>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  return <>{children}</>;
} 