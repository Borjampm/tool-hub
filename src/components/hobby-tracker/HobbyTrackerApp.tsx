import { useState, useEffect } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { TimerProvider } from '../../contexts/TimerContext';
import { AuthGuard } from '../shared/AuthGuard';
import { EmailVerification } from '../shared/EmailVerification';
import { Navbar } from './Navbar';
import { TimerView } from './TimerView';
import { Activities } from './Activities';
import { Dashboard } from './Dashboard';
import { Settings } from './Settings';

export function HobbyTrackerApp() {
  const [activeTab, setActiveTab] = useState<'timer' | 'activities' | 'dashboard' | 'settings'>('timer');
  const [isEmailVerification, setIsEmailVerification] = useState(false);

  useEffect(() => {
    // Check if this is an email verification callback
    const checkEmailVerification = () => {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        // Check if this is a Supabase auth callback for email verification
        if (type === 'signup' && accessToken) {
          setIsEmailVerification(true);
          return;
        }
      }
      setIsEmailVerification(false);
    };

    checkEmailVerification();

    // Listen for hash changes in case user navigates back/forward
    const handleHashChange = () => {
      checkEmailVerification();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleVerificationComplete = () => {
    // Clear the hash from URL
    window.history.replaceState(null, '', window.location.pathname);
    setIsEmailVerification(false);
  };

  if (isEmailVerification) {
    return (
      <AuthProvider>
        <EmailVerification onComplete={handleVerificationComplete} />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <TimerProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
            <main>
              {activeTab === 'timer' && <TimerView />}
              {activeTab === 'activities' && <Activities />}
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'settings' && <Settings />}
            </main>
          </div>
        </TimerProvider>
      </AuthGuard>
    </AuthProvider>
  );
} 