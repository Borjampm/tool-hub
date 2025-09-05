import { useEffect, useState } from 'react';
import { TransactionService } from '../../services/transactionService';
import { UserAccountService } from '../../services/userAccountService';
import type { Transaction, UserExpenseCategory, UserAccount } from '../../lib/supabase';
import { formatDate } from '../../lib/dateUtils';
import { CSVExportService } from '../../services/csvExportService';

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<UserExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Load transactions and categories
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

  useEffect(() => {
    loadData();
  }, []);

  // Dev-only sample data generator
  const generateSampleTransactions = async () => {
    if (!import.meta.env.DEV) return;
    setGenerateError('');
    setIsGenerating(true);
    try {
      // Ensure we have at least one account
      let userAccounts = accounts;
      if (userAccounts.length === 0) {
        try {
          const createdBank = await UserAccountService.createAccount({ name: 'Bank', type: 'bank', color: '#3B82F6' });
          const createdCash = await UserAccountService.createAccount({ name: 'Cash', type: 'cash', color: '#10B981' });
          userAccounts = [createdBank, createdCash];
          setAccounts(userAccounts);
        } catch {
          // If creating defaults fails, re-fetch accounts in case defaults were auto-created
          userAccounts = await UserAccountService.getUserAccounts();
          setAccounts(userAccounts);
        }
      }

      // Ensure categories are available
      let userCategories = categories;
      if (userCategories.length === 0) {
        userCategories = await TransactionService.getExpenseCategories();
        setCategories(userCategories);
      }

      if (userCategories.length === 0 || userAccounts.length === 0) {
        throw new Error('No categories or accounts available to generate transactions');
      }

      const titles = [
        'Groceries',
        'Coffee',
        'Dinner out',
        'Gas refill',
        'Online purchase',
        'Electricity bill',
        'Phone plan',
        'Gym membership',
        'Book purchase',
        'Gift'
      ];

      const descriptions = [
        'Monthly expense',
        'Quick visit',
        'Weekend treat',
        'Recurring payment',
        'One-time purchase',
        'Discount applied',
        'Subscription renewal'
      ];

      const randomChoice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
      const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

      const today = new Date();
      const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];

      // Generate 15 sample transactions over the last 30 days
      const toCreate: Array<Promise<Transaction>> = [];
      for (let i = 0; i < 15; i++) {
        const dayOffset = randomInt(0, 30);
        const date = new Date(today);
        date.setDate(today.getDate() - dayOffset);

        const type: 'income' | 'expense' = Math.random() < 0.15 ? 'income' : 'expense';
        const amount = type === 'income' ? randomInt(20000, 150000) : randomInt(1000, 60000);
        const category = randomChoice(userCategories);
        const account = randomChoice(userAccounts);

        const payload = {
          type,
          amount,
          currency: 'CLP',
          categoryId: category.id,
          accountId: account.id,
          title: randomChoice(titles),
          description: Math.random() < 0.5 ? randomChoice(descriptions) : '',
          transactionDate: toYYYYMMDD(date),
        };

        toCreate.push(TransactionService.createTransaction(payload));
      }

      // Create in parallel
      await Promise.allSettled(toCreate);

      // Reload data
      await loadData();
    } catch (e) {
      console.error('Error generating sample transactions:', e);
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate sample transactions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      setExportError('No transactions to export');
      return;
    }
    try {
      setIsExporting(true);
      setExportError('');
      CSVExportService.downloadTransactionsCSVDirect(transactions, categories, accounts);
    } catch (err) {
      console.error('Failed to export transactions CSV:', err);
      setExportError('Failed to export transactions as CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const csvInputId = 'transactions-import-csv-file';
  const xlsxInputId = 'transactions-import-xlsx-file';
  const openCsvPicker = () => {
    const input = document.getElementById(csvInputId) as HTMLInputElement | null;
    if (input) input.click();
  };
  const openXlsxPicker = () => {
    const input = document.getElementById(xlsxInputId) as HTMLInputElement | null;
    if (input) input.click();
  };

  const handleCsvImportChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsImporting(true);
      setImportResult(null);
      setExportError('');
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        throw new Error('Please select a CSV file');
      }
      const content = await CSVExportService.readFileAsText(file);
      const result = await CSVExportService.importTransactionsFromCSV(content, transactions);
      setImportResult(result);
      if (result.imported > 0) await loadData();
    } catch (err) {
      console.error('Failed to import transactions CSV:', err);
      setExportError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setIsImporting(false);
      const input = document.getElementById(csvInputId) as HTMLInputElement | null;
      if (input) input.value = '';
    }
  };

  const handleXlsxImportChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsImporting(true);
      setImportResult(null);
      setExportError('');
      if (!file.name.endsWith('.xlsx')) {
        throw new Error('Please select an XLSX file');
      }
      const result = await CSVExportService.importTransactionsFromXlsxFile(file, transactions);
      setImportResult(result);
      if (result.imported > 0) await loadData();
    } catch (err) {
      console.error('Failed to import transactions XLSX:', err);
      setExportError(err instanceof Error ? err.message : 'Failed to import XLSX');
    } finally {
      setIsImporting(false);
      const input = document.getElementById(xlsxInputId) as HTMLInputElement | null;
      if (input) input.value = '';
    }
  };

  // Get category emoji by ID
  const getCategoryEmoji = (categoryId: string | null) => {
    if (!categoryId) return '📝';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.emoji || '📝';
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  // Get account info by ID
  const getAccountInfo = (accountId: string | null) => {
    if (!accountId) return { emoji: '💰', name: 'Unknown Account' };
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      return {
        emoji: UserAccountService.getAccountTypeEmoji(account.type),
        name: account.name
      };
    }
    return { emoji: '💰', name: 'Unknown Account' };
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
            <div className="flex items-center space-x-3">
              {exportError && (
                <span className="text-sm text-red-600">{exportError}</span>
              )}
              {importResult && (
                <span className="text-sm text-gray-600">
                  Imported {importResult.imported}, skipped {importResult.skipped}
                </span>
              )}
              <button
                type="button"
                onClick={openCsvPicker}
                disabled={isImporting}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${
                  isImporting
                    ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Import CSV"
              >
                {isImporting ? 'Importing…' : 'Import CSV'}
              </button>
              <button
                type="button"
                onClick={openXlsxPicker}
                disabled={isImporting}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${
                  isImporting
                    ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Import XLSX"
              >
                {isImporting ? 'Importing…' : 'Import XLSX'}
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isExporting}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${
                  isExporting
                    ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isExporting ? 'Preparing CSV…' : 'Download CSV'}
              </button>
              <input
                id={csvInputId}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvImportChange}
              />
              <input
                id={xlsxInputId}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={handleXlsxImportChange}
              />
              {import.meta.env.DEV && (
                <>
                  {generateError && (
                    <span className="text-sm text-red-600">{generateError}</span>
                  )}
                  <button
                    type="button"
                    onClick={generateSampleTransactions}
                    disabled={isGenerating}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${
                      isGenerating
                        ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Generate sample transactions (development only)"
                  >
                    {isGenerating ? 'Generating…' : 'Generate sample data'}
                  </button>
                </>
              )}
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
                        <span>{getCategoryEmoji(transaction.category_id || transaction.category || null)}</span>
                        <span className="capitalize">{getCategoryName(transaction.category_id || transaction.category || null)}</span>
                      </span>
                      
                      {/* Account */}
                      <span className="inline-flex items-center space-x-1 text-sm text-gray-500">
                        <span>{getAccountInfo(transaction.account_id || transaction.account || null).emoji}</span>
                        <span>{getAccountInfo(transaction.account_id || transaction.account || null).name}</span>
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