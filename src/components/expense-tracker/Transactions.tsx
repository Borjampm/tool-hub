import { useEffect, useState } from 'react';
import { TransactionService } from '../../services/transactionService';
import { UserAccountService } from '../../services/userAccountService';
import type { Transaction, UserExpenseCategory, UserAccount } from '../../lib/supabase';
import { formatDate } from '../../lib/dateUtils';

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<UserExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load transactions and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [transactionData, categoryData, accountData] = await Promise.all([
          TransactionService.getAllTransactions(),
          TransactionService.getExpenseCategories(),
          UserAccountService.getUserAccounts()
        ]);
        setTransactions(transactionData);
        setCategories(categoryData);
        setAccounts(accountData);
      } catch (err) {
        console.error('Error loading transactions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Get category emoji by name
  const getCategoryEmoji = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.emoji || '📝';
  };

  // Get account info by name
  const getAccountInfo = (accountName: string) => {
    const account = accounts.find(acc => acc.name === accountName);
    if (account) {
      return {
        emoji: UserAccountService.getAccountTypeEmoji(account.type),
        name: account.name
      };
    }
    // Fallback for old hardcoded values or if account not found
    if (accountName === 'bank') return { emoji: '🏦', name: 'Bank' };
    if (accountName === 'cash') return { emoji: '💵', name: 'Cash' };
    return { emoji: '💰', name: accountName };
  };

  // Format currency amount with appropriate locale
  const formatAmount = (amount: number, currency: string) => {
    // Use en-GB for consistent day/month/year date formatting context
    // but maintain proper currency symbol handling
    const locale = currency === 'CLP' ? 'es-CL' : 'en-GB';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };



  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Transactions</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
              <p className="text-gray-600 mt-1">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="divide-y divide-gray-200">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-600">
                Start by adding your first transaction using the Add Transaction tab.
              </p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  {/* Left side - Transaction info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      {/* Type indicator */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'income' ? '💰 Income' : '💸 Expense'}
                      </span>
                      
                      {/* Category */}
                      <span className="inline-flex items-center space-x-1 text-sm text-gray-600">
                        <span>{getCategoryEmoji(transaction.category)}</span>
                        <span className="capitalize">{transaction.category}</span>
                      </span>
                      
                      {/* Account */}
                      <span className="inline-flex items-center space-x-1 text-sm text-gray-500">
                        <span>{getAccountInfo(transaction.account).emoji}</span>
                        <span>{getAccountInfo(transaction.account).name}</span>
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {transaction.title}
                    </h3>
                    
                    {/* Description */}
                    {transaction.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {transaction.description}
                      </p>
                    )}
                    
                    {/* Date */}
                    <p className="text-sm text-gray-500">
                      {formatDate(transaction.transaction_date)}
                    </p>
                  </div>
                  
                  {/* Right side - Amount */}
                  <div className="ml-4 flex-shrink-0 text-right">
                    <div className={`text-xl font-bold ${
                      transaction.type === 'income' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatAmount(transaction.amount, transaction.currency)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 