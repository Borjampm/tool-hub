import { useEffect, useState } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { AuthGuard } from '../shared/AuthGuard';
import { MusicToolsNavbar } from './MusicToolsNavbar';
import { EmailVerification } from '../shared/EmailVerification';
import { MetronomeView } from './MetronomeView';
import { ReadingPracticeView } from './ReadingPracticeView';

export function MusicToolsApp() {
  const [activeTab, setActiveTab] = useState<'metronome' | 'reading'>('metronome');
  const [isEmailVerification, setIsEmailVerification] = useState(false);

  useEffect(() => {
    const checkEmailVerification = () => {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');

        if (type === 'signup' && accessToken) {
          setIsEmailVerification(true);
          return;
        }
      }
      setIsEmailVerification(false);
    };

    checkEmailVerification();

    const handleHashChange = () => {
      checkEmailVerification();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleVerificationComplete = () => {
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
          <MusicToolsNavbar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="max-w-5xl mx-auto px-6 py-10">
            {activeTab === 'metronome' && <MetronomeView />}
            {activeTab === 'reading' && <ReadingPracticeView />}
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}

