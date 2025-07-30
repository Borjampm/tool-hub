import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/shared/LandingPage';
import { HobbyTrackerApp } from './components/hobby-tracker/HobbyTrackerApp';
import { ExpenseTracker } from './components/expense-tracker/ExpenseTracker';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/hobby-tracker" element={<HobbyTrackerApp />} />
        <Route path="/expense-tracker" element={<ExpenseTracker />} />
      </Routes>
    </Router>
  );
}

export default App;
