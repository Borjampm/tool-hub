import { useState, useEffect } from 'react';
import { ExpenseCategoryService } from '../../services/expenseCategoryService';
import { UserAccountService } from '../../services/userAccountService';
import type { UserExpenseCategory, UserAccount } from '../../lib/supabase';

export function ExpenseSettings() {
  const [allCategories, setAllCategories] = useState<UserExpenseCategory[]>([]);
  const [defaultAccounts, setDefaultAccounts] = useState<{ name: string; type: string; emoji: string; color: string }[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<UserExpenseCategory | null>(null);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);

  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', emoji: '📝', color: '#6B7280' });
  const [accountForm, setAccountForm] = useState({ 
    name: '', 
    type: 'bank' as 'bank' | 'cash' | 'credit_card' | 'investment' | 'other', 
    color: '#6B7280',
    description: '' 
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  // Dropdown functions
  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const loadData = async () => {
      try {
        setIsLoading(true);
        const [allCategoriesData, accounts] = await Promise.all([
          ExpenseCategoryService.getAllAvailableExpenseCategories(),
          UserAccountService.getUserAccounts()
        ]);
        
        setAllCategories(allCategoriesData);
        setUserAccounts(accounts);
        
        // Set up default accounts (bank and cash)
        setDefaultAccounts([
          { name: 'bank', type: 'Bank', emoji: '🏦', color: '#3B82F6' },
          { name: 'cash', type: 'Cash', emoji: '💵', color: '#10B981' }
        ]);
    } catch (err) {
      console.error('Error loading settings data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Category functions
  const handleCreateCategory = async () => {
    try {
      setError('');
      await ExpenseCategoryService.createUserExpenseCategory({
        name: categoryForm.name,
        emoji: categoryForm.emoji,
        color: categoryForm.color
      });
      setCategoryForm({ name: '', emoji: '📝', color: '#6B7280' });
      setShowCategoryModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    try {
      setError('');
      await ExpenseCategoryService.updateUserExpenseCategory(editingCategory.id, {
        name: categoryForm.name,
        emoji: categoryForm.emoji,
        color: categoryForm.color
      });
      setCategoryForm({ name: '', emoji: '📝', color: '#6B7280' });
      setEditingCategory(null);
      setShowCategoryModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (category: UserExpenseCategory) => {
    closeDropdown();
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;
    try {
      setError('');
      await ExpenseCategoryService.deleteUserExpenseCategory(category.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  // Helper function to check if category is default (non-editable)
  const isDefaultCategory = (category: UserExpenseCategory): boolean => {
    return category.is_default === true;
  };

  // Account functions
  const handleCreateAccount = async () => {
    try {
      setError('');
      await UserAccountService.createAccount({
        name: accountForm.name,
        type: accountForm.type,
        color: accountForm.color,
        description: accountForm.description || undefined
      });
      setAccountForm({ name: '', type: 'bank', color: '#6B7280', description: '' });
      setShowAccountModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;
    try {
      setError('');
      await UserAccountService.updateAccount(editingAccount.id, {
        name: accountForm.name,
        type: accountForm.type,
        color: accountForm.color,
        description: accountForm.description || undefined
      });
      setAccountForm({ name: '', type: 'bank', color: '#6B7280', description: '' });
      setEditingAccount(null);
      setShowAccountModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  const handleDeleteAccount = async (account: UserAccount) => {
    closeDropdown();
    if (!confirm(`Are you sure you want to delete "${account.name}"?`)) return;
    try {
      setError('');
      await UserAccountService.deleteAccount(account.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  // Modal functions
  const openCategoryModal = (category?: UserExpenseCategory) => {
    closeDropdown();
    if (category) {
      // Allow editing any category, including default ones
      setEditingCategory(category);
      setCategoryForm({ 
        name: category.name, 
        emoji: category.emoji || '📝',
        color: category.color || '#6B7280' 
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', emoji: '📝', color: '#6B7280' });
    }
    setShowCategoryModal(true);
    setError('');
  };

  const openAccountModal = (account?: UserAccount) => {
    closeDropdown();
    if (account) {
      setEditingAccount(account);
      setAccountForm({ 
        name: account.name, 
        type: account.type, 
        color: account.color || '#6B7280',
        description: account.description || '' 
      });
    } else {
      setEditingAccount(null);
      setAccountForm({ name: '', type: 'bank', color: '#6B7280', description: '' });
    }
    setShowAccountModal(true);
    setError('');
  };

  if (isLoading) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* All Categories Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
            <button
              onClick={() => openCategoryModal()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
            >
              Add Custom Category
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCategories.map((category) => (
              <div
                key={category.id}
                className="border-2 rounded-lg p-4 transition-all hover:shadow-lg"
                style={{ 
                  backgroundColor: category.color || '#6B7280',
                  borderColor: category.color || '#6B7280'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{category.emoji}</span>
                    <span className="font-medium text-white text-shadow">{category.name}</span>
                  </div>
                  <div className="dropdown-container relative">
                    <button
                      onClick={() => toggleDropdown(`category-${category.id}`)}
                      className="text-white hover:text-gray-200 p-2 rounded-full bg-black bg-opacity-20 hover:bg-opacity-40 transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    {openDropdown === `category-${category.id}` && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                        <button
                          onClick={() => openCategoryModal(category)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </button>
                        {!isDefaultCategory(category) && (
                          <button
                            onClick={() => handleDeleteCategory(category as UserExpenseCategory)}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Accounts Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Accounts</h3>
            <button
              onClick={() => openAccountModal()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
            >
              Add Custom Account
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Default Accounts */}
            {defaultAccounts.map((account) => (
              <div
                key={account.name}
                className="border-2 rounded-lg p-4 transition-all hover:shadow-lg"
                style={{ 
                  backgroundColor: account.color,
                  borderColor: account.color
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{account.emoji}</span>
                      <span className="font-medium text-white text-shadow capitalize">{account.name}</span>
                      <span className="text-xs bg-white text-gray-800 px-2 py-0.5 rounded-full font-medium shadow-sm">
                        Default
                      </span>
                    </div>
                    <p className="text-sm text-white text-shadow">{account.type}</p>
                  </div>
                  <div className="dropdown-container relative ml-2">
                    <button
                      onClick={() => toggleDropdown(`default-account-${account.name}`)}
                      className="text-white hover:text-gray-200 p-2 rounded-full bg-black bg-opacity-20 hover:bg-opacity-40 transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    {openDropdown === `default-account-${account.name}` && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                        <button
                          onClick={() => alert('Editing default accounts is not yet implemented')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Custom Accounts */}
            {userAccounts.map((account) => (
              <div
                key={account.id}
                className="border-2 rounded-lg p-4 transition-all hover:shadow-lg"
                style={{ 
                  backgroundColor: account.color || '#6B7280',
                  borderColor: account.color || '#6B7280'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">
                        {UserAccountService.getAccountTypeEmoji(account.type)}
                      </span>
                      <span className="font-medium text-white text-shadow">{account.name}</span>
                    </div>
                    <p className="text-sm text-white text-shadow">
                      {UserAccountService.getAccountTypeDisplayName(account.type)}
                    </p>
                    {account.description && (
                      <p className="text-xs text-white text-shadow mt-1">{account.description}</p>
                    )}
                  </div>
                  <div className="dropdown-container relative ml-2">
                    <button
                      onClick={() => toggleDropdown(`account-${account.id}`)}
                      className="text-white hover:text-gray-200 p-2 rounded-full bg-black bg-opacity-20 hover:bg-opacity-40 transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    {openDropdown === `account-${account.id}` && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                        <button
                          onClick={() => openAccountModal(account)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Personal Care"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emoji *
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={categoryForm.emoji}
                    onChange={(e) => {
                      // Allow only single emoji character
                      const value = e.target.value;
                      if (value.length <= 2) { // Most emojis are 1-2 characters
                        setCategoryForm(prev => ({ ...prev, emoji: value }));
                      }
                    }}
                    className="w-16 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-lg"
                    placeholder="😀"
                    maxLength={2}
                  />
                  <div className="text-sm text-gray-500">
                    Choose an emoji to represent this category
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* Common emojis for quick selection */}
                  {[
                    '📝', '💼', '🏠', '🎯', '💡', '🎨', '🏃‍♂️', '📚', 
                    '🛒', '🎵', '🍕', '☕', '🚗', '✈️', '🎮', '📱',
                    '💻', '👔', '🏥', '💊', '🎪', '🎭', '🎬', '📷'
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCategoryForm(prev => ({ ...prev, emoji }))}
                      className={`w-8 h-8 text-lg rounded hover:bg-gray-100 transition-colors ${
                        categoryForm.emoji === emoji ? 'bg-indigo-100 ring-2 ring-indigo-500' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-20 h-10 border border-gray-300 rounded-md cursor-pointer"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                disabled={!categoryForm.name.trim() || !categoryForm.emoji.trim()}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingCategory ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingAccount ? 'Edit Account' : 'Add Account'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Main Checking Account"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type *
                </label>
                <select
                  value={accountForm.type}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, type: e.target.value as 'bank' | 'cash' | 'credit_card' | 'investment' | 'other' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="bank">🏦 Bank Account</option>
                  <option value="cash">💵 Cash</option>
                  <option value="credit_card">💳 Credit Card</option>
                  <option value="investment">📈 Investment</option>
                  <option value="other">💰 Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={accountForm.color}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-20 h-10 border border-gray-300 rounded-md cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={accountForm.description}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                  placeholder="Optional description..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={editingAccount ? handleUpdateAccount : handleCreateAccount}
                disabled={!accountForm.name.trim()}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingAccount ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => setShowAccountModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 