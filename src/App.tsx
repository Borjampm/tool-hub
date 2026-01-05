import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/shared/LandingPage';
import { HobbyTrackerApp } from './components/hobby-tracker/HobbyTrackerApp';
import { ExpenseTracker } from './components/expense-tracker/ExpenseTracker';
import { AccountManagement } from './components/shared/AccountManagement';
import { SignInPage } from './components/shared/SignInPage';
import { EmailVerified } from './components/shared/EmailVerified';
import { EmailVerificationCallback } from './components/shared/EmailVerificationCallback';
import { MusicToolsApp } from './components/music-tools/MusicToolsApp';
import { OfflineIndicator } from './components/shared/OfflineIndicator';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/email-verified" element={<EmailVerified />} />
        <Route path="/verify-email" element={<EmailVerificationCallback />} />
        <Route path="/hobby-tracker" element={<HobbyTrackerApp />} />
        <Route path="/expense-tracker" element={<ExpenseTracker />} />
        <Route path="/music-tools" element={<MusicToolsApp />} />
        <Route path="/account" element={<AccountManagement />} />
      </Routes>
      <OfflineIndicator />
    </Router>
  );
}

export default App;
