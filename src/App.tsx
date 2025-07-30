import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/shared/LandingPage';
import { HobbyTrackerApp } from './components/hobby-tracker/HobbyTrackerApp';
import { ExpenseTracker } from './components/expense-tracker/ExpenseTracker';
import { AccountManagement } from './components/shared/AccountManagement';
import { SignInPage } from './components/shared/SignInPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/hobby-tracker" element={<HobbyTrackerApp />} />
        <Route path="/expense-tracker" element={<ExpenseTracker />} />
        <Route path="/account" element={<AccountManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
