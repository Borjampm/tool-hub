import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/shared/LandingPage';
import { TimeTrackerApp } from './components/time-tracker/TimeTrackerApp';
import { ExpenseTracker } from './components/expense-tracker/ExpenseTracker';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/time-tracker" element={<TimeTrackerApp />} />
        <Route path="/expense-tracker" element={<ExpenseTracker />} />
      </Routes>
    </Router>
  );
}

export default App;
