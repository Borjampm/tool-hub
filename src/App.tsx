import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { AuthGuard } from './components/AuthGuard';
import { EmailVerification } from './components/EmailVerification';
import { Navbar } from './components/Navbar';
import { TimerView } from './components/TimerView';
import { Activities } from './components/Activities';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';

function App() {
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

export default App;
