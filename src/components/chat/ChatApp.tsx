import { useEffect, useState } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { AuthGuard } from '../shared/AuthGuard';
import { ChatNavbar } from './ChatNavbar';
import { EmailVerification } from '../shared/EmailVerification';
import { ChatView } from './ChatView';

export function ChatApp() {
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 flex flex-col">
          <ChatNavbar />
          <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
            <ChatView />
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}

