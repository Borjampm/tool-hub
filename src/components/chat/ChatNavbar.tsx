import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ChatNavbar() {
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

  const handleAccountClick = () => {
    navigate('/account');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-slate-800/80 backdrop-blur-sm shadow-lg border-b border-cyan-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="text-xl font-semibold text-white mr-4 sm:mr-8 hover:text-cyan-400 transition-colors duration-200 cursor-pointer touch-manipulation min-h-[44px] flex items-center"
            >
              Tool Hub
            </button>

            <div className="hidden md:flex items-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                💬 Chat
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <button
                  onClick={handleAccountClick}
                  className="text-sm text-slate-300 hover:text-cyan-400 hover:underline truncate max-w-32 lg:max-w-48 transition-colors duration-200 cursor-pointer"
                  title="Click to manage your account"
                >
                  {user.email}
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md transition-colors touch-manipulation min-h-[44px]"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-300 hover:text-white focus:outline-none focus:text-white p-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
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

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700">
            <div className="pt-2 pb-3 space-y-1">
              <div className="px-3 py-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  💬 Chat
                </span>
              </div>

              {user && (
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <button
                    onClick={handleAccountClick}
                    className="block w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-cyan-400 hover:bg-slate-700 truncate transition-colors duration-200 touch-manipulation min-h-[44px]"
                    title="Tap to manage your account"
                  >
                    {user.email}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700 touch-manipulation min-h-[44px]"
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

