import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { AuthGuard } from './components/AuthGuard';
import { Navbar } from './components/Navbar';
import { TimerView } from './components/TimerView';
import { Dashboard } from './components/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState<'timer' | 'dashboard'>('timer');

  return (
    <AuthProvider>
      <AuthGuard>
        <TimerProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
            <main>
              {activeTab === 'timer' ? <TimerView /> : <Dashboard />}
            </main>
          </div>
        </TimerProvider>
      </AuthGuard>
    </AuthProvider>
  );
}

export default App;
