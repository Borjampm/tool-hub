import { useState } from 'react';
import { TimerProvider } from './contexts/TimerContext';
import { Navbar } from './components/Navbar';
import { TimerView } from './components/TimerView';
import { Dashboard } from './components/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState<'timer' | 'dashboard'>('timer');

  return (
    <TimerProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        <main>
          {activeTab === 'timer' ? <TimerView /> : <Dashboard />}
        </main>
      </div>
    </TimerProvider>
  );
}

export default App;
