import React, { useState, useEffect } from 'react';
import { TransactionService } from '../../services/transactionService';
import { ExpenseCategoryService } from '../../services/expenseCategoryService';
import { UserAccountService } from '../../services/userAccountService';
import type { CreateTransactionData } from '../../services/transactionService';
import type { UserAccount } from '../../lib/supabase';
import { RecurringTransactionService } from '../../services/recurringTransactionService';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '../../lib/currencies';

export function AddTransaction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successSubtitle, setSuccessSubtitle] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string; emoji: string; created_at: string }[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [dateDisplayValue, setDateDisplayValue] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recurringInterval, setRecurringInterval] = useState<number>(1);
  const [endDateDisplayValue, setEndDateDisplayValue] = useState('');
  const [endDateISO, setEndDateISO] = useState<string>('');

  // Get current date in YYYY-MM-DD format for internal storage
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD for storage
  const parseDateFromDisplay = (displayDate: string) => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    
    // Validate the parts
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
      return '';
    }
    
    // Pad with zeros and return in YYYY-MM-DD format
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Form state
  const initialDate = getCurrentDate();
  const [formData, setFormData] = useState<CreateTransactionData>({
    type: 'expense', // preselected as expense
    amount: 0,
    currency: DEFAULT_CURRENCY,
    categoryId: '',
    accountId: '',
    title: '',
    description: '',
    transactionDate: initialDate, // default to today
  });

  // Initialize display value on component mount
  useEffect(() => {
    setDateDisplayValue(formatDateForDisplay(initialDate));
  }, []);

  // Load categories and accounts on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [allCategories, userAccounts] = await Promise.all([
          ExpenseCategoryService.getAllAvailableExpenseCategories(),
          UserAccountService.getUserAccounts()
        ]);
        
        // Ensure all categories have emoji property for consistent display
        const formattedCategories = allCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          emoji: 'emoji' in cat ? cat.emoji : '📝', // Use default emoji for user categories
          created_at: cat.created_at
        }));
        
        setCategories(formattedCategories);
        setAccounts(userAccounts);
        
        if (allCategories.length > 0) {
          const currentDate = getCurrentDate();
          // Set default account to first available account
          const defaultAccountId = userAccounts.length > 0 ? userAccounts[0].id : '';
          setFormData(prev => ({ 
            ...prev, 
            categoryId: allCategories[0].id,
            accountId: defaultAccountId,
            transactionDate: currentDate
          }));
          setDateDisplayValue(formatDateForDisplay(currentDate));
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load categories and accounts');
      }
    };

    loadData();
  }, []);

  const handleInputChange = (field: keyof CreateTransactionData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user starts typing
  };

  // Special handler for date input with auto-formatting
  const handleDateChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY as user types
    let formatted = '';
    if (digitsOnly.length > 0) {
      formatted = digitsOnly.substring(0, 2);
      if (digitsOnly.length >= 3) {
        formatted += '/' + digitsOnly.substring(2, 4);
        if (digitsOnly.length >= 5) {
          formatted += '/' + digitsOnly.substring(4, 8);
        }
      }
    }
    
    // Update display value immediately for user feedback
    setDateDisplayValue(formatted);
    
    // If we have a complete date (DD/MM/YYYY), validate and store it
    if (formatted.length === 10) {
      const isoDate = parseDateFromDisplay(formatted);
      if (isoDate) {
        setFormData(prev => ({ ...prev, transactionDate: isoDate }));
      } else {
        setFormData(prev => ({ ...prev, transactionDate: '' }));
      }
    } else {
      // Store empty for incomplete dates
      setFormData(prev => ({ ...prev, transactionDate: '' }));
    }
    
    setError('');
  };

  const handleEndDateChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    let formatted = '';
    if (digitsOnly.length > 0) {
      formatted = digitsOnly.substring(0, 2);
      if (digitsOnly.length >= 3) {
        formatted += '/' + digitsOnly.substring(2, 4);
        if (digitsOnly.length >= 5) {
          formatted += '/' + digitsOnly.substring(4, 8);
        }
      }
    }
    setEndDateDisplayValue(formatted);
    if (formatted.length === 10) {
      const iso = parseDateFromDisplay(formatted);
      setEndDateISO(iso);
    } else {
      setEndDateISO('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate amount
      if (formData.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      if (!formData.categoryId) {
        throw new Error('Category is required');
      }

      if (!formData.accountId) {
        throw new Error('Account is required');
      }

      if (!formData.transactionDate) {
        throw new Error('Transaction date is required');
      }

      if (isRecurring) {
        // Create recurring rule (do not create one-off transaction to avoid duplicates)
        await RecurringTransactionService.createRule({
          type: formData.type,
          amount: formData.amount,
          currency: formData.currency,
          categoryId: formData.categoryId || undefined,
          accountId: formData.accountId || undefined,
          title: formData.title,
          description: formData.description,
          startDate: formData.transactionDate,
          endDate: endDateISO || undefined,
          frequency: recurringFrequency,
          interval: recurringInterval,
        });
        setSuccessTitle('Recurring Transaction Created! 🔄');
        const frequencyText = recurringInterval > 1 
          ? `Every ${recurringInterval} ${recurringFrequency === 'daily' ? 'days' : recurringFrequency === 'weekly' ? 'weeks' : recurringFrequency === 'monthly' ? 'months' : 'years'}`
          : recurringFrequency === 'daily' ? 'Daily' : recurringFrequency === 'weekly' ? 'Weekly' : recurringFrequency === 'monthly' ? 'Monthly' : 'Yearly';
        setSuccessSubtitle(`${frequencyText} transactions will appear automatically in your history.`);
        setSuccess(true);
      } else {
        const { isPending } = await TransactionService.createTransactionOfflineAware(formData);
        if (isPending) {
          setSuccessTitle('Saved Offline');
          setSuccessSubtitle('Transaction will sync when you reconnect.');
        } else {
          setSuccessTitle('Transaction Added!');
          setSuccessSubtitle('Your transaction has been successfully recorded.');
        }
        setSuccess(true);
      }
      
      // Show success message briefly, then reset form for next transaction
      setTimeout(() => {
        setSuccess(false);
        // Reset form to initial state for next transaction
        const currentDate = getCurrentDate();
        setFormData({
          type: 'expense', // keep expense preselected
          amount: 0,
          currency: DEFAULT_CURRENCY,
          categoryId: categories.length > 0 ? categories[0].id : '',
          accountId: accounts.length > 0 ? accounts[0].id : '', // Reset to first available account
          title: '',
          description: '',
          transactionDate: currentDate, // reset to current date
        });
        setDateDisplayValue(formatDateForDisplay(currentDate));
        setIsRecurring(false);
        setRecurringFrequency('monthly');
        setRecurringInterval(1);
        setEndDateDisplayValue('');
        setEndDateISO('');
      }, 1500);

    } catch (err) {
      console.error('Error creating transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">{successTitle}</h2>
            {successSubtitle && (
              <p className="text-gray-600 mb-2">{successSubtitle}</p>
            )}
            <p className="text-sm text-gray-500">
              Preparing form for next transaction...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Transaction</h2>
          <p className="text-gray-600">
            Track your expenses and income with detailed categorization.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleInputChange('type', 'expense')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  formData.type === 'expense'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💸 Expense
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('type', 'income')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  formData.type === 'income'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 Income
              </button>
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <input
                type="number"
                id="amount"
                min="0"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              id="category"
              value={formData.categoryId}
              onChange={(e) => handleInputChange('categoryId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* User Accounts */}
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleInputChange('accountId', account.id)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors duration-200 text-center ${
                    formData.accountId === account.id
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={formData.accountId === account.id ? { backgroundColor: account.color || '#6B7280' } : {}}
                  title={account.description || account.name}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-lg">
                      {UserAccountService.getAccountTypeEmoji(account.type)}
                    </span>
                    <span className="text-xs truncate max-w-full">
                      {account.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {accounts.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                No accounts available. Please create an account in the Settings tab first.
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter transaction title"
              required
              disabled={isLoading}
            />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="transactionDate" className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Date * <span className="text-xs text-gray-500">(dd/mm/yyyy)</span>
            </label>
            <input
              type="text"
              id="transactionDate"
              value={dateDisplayValue}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="DD/MM/YYYY"
              maxLength={10}
              pattern="\d{2}/\d{2}/\d{4}"
              required
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              placeholder="Optional description or notes..."
              disabled={isLoading}
            />
          </div>

          {/* Recurring (basic) */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Make recurring</label>
              <button
                type="button"
                onClick={() => setIsRecurring(v => !v)}
                className={`px-3 py-1 rounded-md text-sm ${isRecurring ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {isRecurring ? 'On' : 'Off'}
              </button>
            </div>
            {isRecurring && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interval</label>
                  <input
                    type="number"
                    min={1}
                    value={recurringInterval}
                    onChange={(e) => setRecurringInterval(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End date (optional) <span className="text-xs text-gray-500">(dd/mm/yyyy)</span></label>
                  <input
                    type="text"
                    value={endDateDisplayValue}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    pattern="\d{2}/\d{2}/\d{4}"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding Transaction...' : 'Add Transaction'}
            </button>
            <button
              type="button"
              onClick={() => {
                // Reset form to initial state
                const currentDate = getCurrentDate();
                setFormData({
                  type: 'expense',
                  amount: 0,
                  currency: DEFAULT_CURRENCY,
                  categoryId: categories.length > 0 ? categories[0].id : '',
                  accountId: accounts.length > 0 ? accounts[0].id : '', // Reset to first available account
                  title: '',
                  description: '',
                  transactionDate: currentDate,
                });
                setDateDisplayValue(formatDateForDisplay(currentDate));
                setError('');
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
              disabled={isLoading}
            >
              Reset
            </button>
        </div>
        </form>
      </div>
    </div>
  );
} 