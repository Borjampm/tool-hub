import { useState, useEffect } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { AuthGuard } from '../shared/AuthGuard';
import { EmailVerification } from '../shared/EmailVerification';
import { ExpenseNavbar } from './ExpenseNavbar';
import { AddTransaction } from './AddTransaction';
import { Transactions } from './Transactions';
import { ExpenseDashboard } from './ExpenseDashboard';
import { ExpenseSettings } from './ExpenseSettings';
import { CurrencyConverter } from './CurrencyConverter';

export function ExpenseTracker() {
  const [activeTab, setActiveTab] = useState<'add' | 'transactions' | 'dashboard' | 'converter' | 'settings'>('add');
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
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
          <ExpenseNavbar activeTab={activeTab} onTabChange={setActiveTab} />
          <main>
            {activeTab === 'add' && <AddTransaction />}
            {activeTab === 'transactions' && <Transactions />}
            {activeTab === 'dashboard' && <ExpenseDashboard />}
            {activeTab === 'converter' && <CurrencyConverter />}
            {activeTab === 'settings' && <ExpenseSettings />}
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
} 