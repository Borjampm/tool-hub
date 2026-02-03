import { useState, useEffect } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { AuthGuard } from '../shared/AuthGuard';
import { EmailVerification } from '../shared/EmailVerification';
import { FlashcardsNavbar } from './FlashcardsNavbar';
import { QuizView } from './QuizView';
import { EditView } from './EditView';
import { SettingsView } from './SettingsView';

export type FlashcardTab = 'quiz' | 'edit' | 'settings';

export function FlashcardsApp() {
  const [activeTab, setActiveTab] = useState<FlashcardTab>('quiz');
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
        <div className="min-h-screen bg-gray-50">
          <FlashcardsNavbar activeTab={activeTab} onTabChange={setActiveTab} />
          <main>
            {activeTab === 'quiz' && <QuizView />}
            {activeTab === 'edit' && <EditView />}
            {activeTab === 'settings' && <SettingsView />}
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
