import React, { useState, useEffect } from 'react';
import { TransactionService } from '../../services/transactionService';
import type { CreateTransactionData } from '../../services/transactionService';
import type { ExpenseCategory } from '../../lib/supabase';

export function AddTransaction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [dateDisplayValue, setDateDisplayValue] = useState('');

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
    currency: 'CLP', // default to CLP
    category: '',
    account: 'bank', // default to bank
    title: '',
    description: '',
    transactionDate: initialDate, // default to today
  });

  // Initialize display value on component mount
  useEffect(() => {
    setDateDisplayValue(formatDateForDisplay(initialDate));
  }, []);

  // Load expense categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const expenseCategories = await TransactionService.getExpenseCategories();
        setCategories(expenseCategories);
        if (expenseCategories.length > 0) {
          const currentDate = getCurrentDate();
          setFormData(prev => ({ 
            ...prev, 
            category: expenseCategories[0].name,
            transactionDate: currentDate // Ensure current date on load
          }));
          setDateDisplayValue(formatDateForDisplay(currentDate));
        }
      } catch (err) {
        console.error('Error loading categories:', err);
        setError('Failed to load categories');
      }
    };

    loadCategories();
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

      if (!formData.category) {
        throw new Error('Category is required');
      }

      if (!formData.transactionDate) {
        throw new Error('Transaction date is required');
      }

      await TransactionService.createTransaction(formData);
      setSuccess(true);
      
      // Show success message briefly, then reset form for next transaction
      setTimeout(() => {
        setSuccess(false);
        // Reset form to initial state for next transaction
        const currentDate = getCurrentDate();
        setFormData({
          type: 'expense', // keep expense preselected
          amount: 0,
          currency: 'CLP', // keep CLP default
          category: categories.length > 0 ? categories[0].name : '',
          account: 'bank', // keep bank default
          title: '',
          description: '',
          transactionDate: currentDate, // reset to current date
        });
        setDateDisplayValue(formatDateForDisplay(currentDate));
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
            <h2 className="text-2xl font-bold text-green-900 mb-2">Transaction Added!</h2>
            <p className="text-gray-600 mb-2">
              Your transaction has been successfully recorded.
            </p>
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
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
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
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
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
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleInputChange('account', 'bank')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  formData.account === 'bank'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏦 Bank
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('account', 'cash')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  formData.account === 'cash'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💵 Cash
              </button>
            </div>
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
                  currency: 'CLP',
                  category: categories.length > 0 ? categories[0].name : '',
                  account: 'bank',
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