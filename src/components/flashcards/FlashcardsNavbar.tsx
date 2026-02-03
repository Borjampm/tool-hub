import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { FlashcardTab } from './FlashcardsApp';

interface FlashcardsNavbarProps {
  activeTab: FlashcardTab;
  onTabChange: (tab: FlashcardTab) => void;
}

export function FlashcardsNavbar({ activeTab, onTabChange }: FlashcardsNavbarProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleTabChange = (tab: FlashcardTab) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  const handleAccountClick = () => {
    navigate('/account');
    setIsMobileMenuOpen(false);
  };

  const navigationItems = [
    { id: 'quiz' as const, label: 'Study' },
    { id: 'edit' as const, label: 'Edit' },
    { id: 'settings' as const, label: 'Settings' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="text-xl font-semibold text-gray-900 mr-4 sm:mr-8 hover:text-indigo-600 transition-colors duration-200 cursor-pointer touch-manipulation min-h-[44px] flex items-center"
            >
              Tool Hub
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-8">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium touch-manipulation min-h-[44px] ${
                    activeTab === item.id
                      ? 'border-amber-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <button
                  onClick={handleAccountClick}
                  className="text-sm text-gray-600 hover:text-indigo-600 hover:underline truncate max-w-32 lg:max-w-48 transition-colors duration-200 cursor-pointer"
                  title="Click to manage your account"
                >
                  {user.email}
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors touch-manipulation min-h-[44px]"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 p-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`block w-full text-left px-3 py-3 text-base font-medium touch-manipulation min-h-[44px] ${
                    activeTab === item.id
                      ? 'text-amber-600 bg-amber-50 border-r-4 border-amber-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* Mobile User Section */}
              {user && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <button
                    onClick={handleAccountClick}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-gray-50 truncate transition-colors duration-200 touch-manipulation min-h-[44px]"
                    title="Tap to manage your account"
                  >
                    {user.email}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-3 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 touch-manipulation min-h-[44px]"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
