import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { TransactionService } from '../../services/transactionService';
import { UserAccountService } from '../../services/userAccountService';
import { RecurringTransactionService } from '../../services/recurringTransactionService';
import type { UpdateScope } from '../../services/recurringTransactionService';
import type { Transaction, UserExpenseCategory, UserAccount } from '../../lib/supabase';
import { formatDate } from '../../lib/dateUtils';
import { CSVExportService } from '../../services/csvExportService';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, formatCurrency as formatCurrencyUtil } from '../../lib/currencies';
import type { SupportedCurrency } from '../../lib/currencies';
import { ExchangeRateService } from '../../services/exchangeRateService';
import { useUserSettings } from '../../hooks/useUserSettings';

export function Transactions() {
  const { defaultCurrency } = useUserSettings();
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
  const [showDeletedTransactions, setShowDeletedTransactions] = useState(false);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [editDateDisplayValue, setEditDateDisplayValue] = useState('');
  const [recurringStartDateDisplayValue, setRecurringStartDateDisplayValue] = useState('');
  const [recurringEndDateDisplayValue, setRecurringEndDateDisplayValue] = useState('');
  const [editForm, setEditForm] = useState<{
    transactionId: string;
    type: 'income' | 'expense';
    amount: number;
    currency: string;
    categoryId: string;
    accountId: string;
    title: string;
    description: string;
    transactionDate: string; // YYYY-MM-DD
    isRecurring: boolean;
    recurringRuleId: string | null;
    // Schedule fields (only for recurring)
    recurringFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    recurringInterval: number;
    recurringStartDate: string; // YYYY-MM-DD
    recurringEndDate: string; // YYYY-MM-DD or empty
  }>({
    transactionId: '',
    type: 'expense',
    amount: 0,
    currency: DEFAULT_CURRENCY,
    categoryId: '',
    accountId: '',
    title: '',
    description: '',
    transactionDate: '',
    isRecurring: false,
    recurringRuleId: null,
    recurringFrequency: 'monthly',
    recurringInterval: 1,
    recurringStartDate: '',
    recurringEndDate: '',
  });
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [recurringUpdateScope, setRecurringUpdateScope] = useState<UpdateScope>('this-only');
  const editDateInputRef = useRef<HTMLInputElement>(null);

  // Historical conversion: track which transaction is expanded
  const [expandedConversionId, setExpandedConversionId] = useState<string | null>(null);
  const [conversionResult, setConversionResult] = useState<string | null>(null);
  const [isConvertingHistory, setIsConvertingHistory] = useState(false);

  // Edit modal: currency conversion helper
  const [showEditConversion, setShowEditConversion] = useState(false);
  const [editConvertFrom, setEditConvertFrom] = useState<SupportedCurrency>(DEFAULT_CURRENCY);
  const [editConvertAmount, setEditConvertAmount] = useState<number>(0);
  const [editConvertPreview, setEditConvertPreview] = useState<string>('');

  // Export with conversion
  const [exportConvertCurrency, setExportConvertCurrency] = useState<SupportedCurrency | ''>('');

  const toYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const parseDateFromDisplay = (displayDate: string) => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    if (Number.isNaN(dayNum) || Number.isNaN(monthNum) || Number.isNaN(yearNum)) return '';
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const getMonthRange = (monthDate: Date) => {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    return {
      startDate: toYYYYMMDD(start),
      endDate: toYYYYMMDD(end),
    };
  };

  // Load transactions for the visible month along with categories and accounts
  const loadMonthData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getMonthRange(currentMonthDate);

      // First, materialize recurring transactions for this month range
      try {
        await RecurringTransactionService.materializeForRange(startDate, endDate);
      } catch (materializeErr) {
        console.error('Error materializing recurring transactions:', materializeErr);
        // Continue loading even if materialization fails
      }

      // Then load the transactions
      const [transactionData, categoryData, accountData] = await Promise.all([
        TransactionService.getTransactionsInDateRange(startDate, endDate),
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
  }, [currentMonthDate]);

  useEffect(() => {
    loadMonthData();
  }, [currentMonthDate, loadMonthData]);

  const goToPreviousMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getMonthLabel = (monthDate: Date) => {
    const month = String(monthDate.getMonth() + 1).padStart(2, '0');
    const year = monthDate.getFullYear();
    return `${month}/${year}`; // Follows dd/mm/yyyy family style for UI consistency
  };

  // Filter out deleted (skipped) transactions unless showDeletedTransactions is true
  const filteredTransactions = useMemo(() => {
    if (showDeletedTransactions) {
      return transactions;
    }
    return transactions.filter(t => !('is_recurring_skipped' in t && t.is_recurring_skipped));
  }, [transactions, showDeletedTransactions]);

  // Count deleted transactions for the toggle button label
  const deletedTransactionCount = useMemo(() => {
    return transactions.filter(t => 'is_recurring_skipped' in t && t.is_recurring_skipped).length;
  }, [transactions]);

  const summary = useMemo(() => {
    const incomesByCurrency: Record<string, number> = {};
    const expensesByCurrency: Record<string, number> = {};
    // Use filtered transactions for summary (exclude deleted)
    for (const t of filteredTransactions.filter(tx => !('is_recurring_skipped' in tx && tx.is_recurring_skipped))) {
      const curr = t.currency;
      if (t.type === 'income') {
        incomesByCurrency[curr] = (incomesByCurrency[curr] || 0) + t.amount;
      } else {
        expensesByCurrency[curr] = (expensesByCurrency[curr] || 0) + t.amount;
      }
    }
    const currencies = Array.from(new Set([...Object.keys(incomesByCurrency), ...Object.keys(expensesByCurrency)]));
    const netByCurrency: Record<string, number> = {};
    currencies.forEach(c => {
      netByCurrency[c] = (incomesByCurrency[c] || 0) - (expensesByCurrency[c] || 0);
    });
    return { incomesByCurrency, expensesByCurrency, netByCurrency, currencies };
  }, [filteredTransactions]);

  const openEditModal = async (t: Transaction) => {
    const transactionId = t.transaction_id;
    const categoryId = t.category_id || '';
    const accountId = t.account_id || '';
    const transactionDate = t.transaction_date; // already YYYY-MM-DD
    const isRecurring = !!('recurring_rule_id' in t && t.recurring_rule_id);
    const recurringRuleId = ('recurring_rule_id' in t && t.recurring_rule_id ? String(t.recurring_rule_id) : null);
    
    // Load rule data if recurring
    let ruleData: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval: number;
      startDate: string;
      endDate: string;
    } = {
      frequency: 'monthly',
      interval: 1,
      startDate: transactionDate,
      endDate: '',
    };
    
    if (isRecurring && recurringRuleId) {
      try {
        const rule = await RecurringTransactionService.getRuleForTransaction(transactionId);
        if (rule) {
          ruleData = {
            frequency: rule.frequency,
            interval: rule.interval,
            startDate: rule.start_date,
            endDate: rule.end_date ?? '',
          };
        }
      } catch (err) {
        console.error('Error loading recurring rule:', err);
      }
    }
    
    setEditForm({
      transactionId,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      categoryId,
      accountId,
      title: t.title,
      description: t.description || '',
      transactionDate,
      isRecurring,
      recurringRuleId,
      recurringFrequency: ruleData.frequency,
      recurringInterval: ruleData.interval,
      recurringStartDate: ruleData.startDate,
      recurringEndDate: ruleData.endDate,
    });
    setEditDateDisplayValue(formatDateForDisplay(transactionDate));
    setRecurringStartDateDisplayValue(formatDateForDisplay(ruleData.startDate));
    setRecurringEndDateDisplayValue(formatDateForDisplay(ruleData.endDate));
    setEditError('');
    setRecurringUpdateScope('this-only'); // Default to editing just this occurrence
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
  };

  const handleEditInputChange = (field: keyof typeof editForm, value: string | number) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setEditError('');
  };

  const handleEditDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = input.value;
    const cursorPosition = input.selectionStart || 0;
    
    // Get digits only from the current value
    const digitsOnly = value.replace(/\D/g, '');
    
    // Count digits before cursor position
    let digitsBeforeCursor = 0;
    for (let i = 0; i < cursorPosition && i < value.length; i++) {
      if (/\d/.test(value[i])) {
        digitsBeforeCursor++;
      }
    }
    
    // Format the digits
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
    
    // Calculate new cursor position
    let newCursorPosition = formatted.length;
    if (digitsBeforeCursor > 0) {
      // Count digits before cursor to determine cursor position
      let digitsCounted = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (formatted[i] !== '/') {
          digitsCounted++;
          if (digitsCounted === digitsBeforeCursor) {
            newCursorPosition = i + 1;
            break;
          }
        }
      }
    }
    
    setEditDateDisplayValue(formatted);
    if (formatted.length === 10) {
      const iso = parseDateFromDisplay(formatted);
      handleEditInputChange('transactionDate', iso || '');
    } else {
      handleEditInputChange('transactionDate', '');
    }
    
    // Restore cursor position after state update
    setTimeout(() => {
      if (editDateInputRef.current) {
        editDateInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const saveEdit = async () => {
    // If recurring, show scope dialog first
    if (editForm.isRecurring && !showRecurringDialog) {
      setShowRecurringDialog(true);
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError('');

      if (!editForm.title.trim()) throw new Error('Title is required');
      if (!editForm.categoryId) throw new Error('Category is required');
      if (!editForm.accountId) throw new Error('Account is required');
      if (!editForm.transactionDate) throw new Error('Transaction date is required');
      if (editForm.amount <= 0) throw new Error('Amount must be greater than 0');

      if (editForm.isRecurring) {
        // Use recurring transaction update method
        const updateData: Record<string, unknown> = {
          type: editForm.type,
          amount: editForm.amount,
          currency: editForm.currency,
          categoryId: editForm.categoryId,
          accountId: editForm.accountId,
          title: editForm.title,
          description: editForm.description,
        };
        
        // Only include transactionDate for 'this-only' scope
        // For other scopes, date changes don't make sense (rule defines the schedule)
        if (recurringUpdateScope === 'this-only') {
          updateData.transactionDate = editForm.transactionDate;
        }
        
        // Include schedule fields for 'this-and-future' and 'rule-only' scopes
        if (recurringUpdateScope === 'this-and-future' || recurringUpdateScope === 'rule-only') {
          updateData.frequency = editForm.recurringFrequency;
          updateData.interval = editForm.recurringInterval;
          updateData.startDate = editForm.recurringStartDate;
          updateData.endDate = editForm.recurringEndDate || null;
        }
        
        await RecurringTransactionService.updateRecurringTransaction(
          editForm.transactionId,
          updateData,
          recurringUpdateScope
        );
      } else {
        // Regular transaction update
        await TransactionService.updateTransaction(editForm.transactionId, {
          type: editForm.type,
          amount: editForm.amount,
          currency: editForm.currency,
          categoryId: editForm.categoryId,
          accountId: editForm.accountId,
          title: editForm.title,
          description: editForm.description,
          transactionDate: editForm.transactionDate,
        });
      }

      setShowRecurringDialog(false);
      closeEditModal();
      await loadMonthData();
    } catch (e) {
      console.error('Failed to save transaction edit:', e);
      setEditError(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (t: Transaction) => {
    const isRecurring = !!('recurring_rule_id' in t && t.recurring_rule_id);
    
    if (isRecurring) {
      // For recurring transactions, offer options
      const choice = window.confirm(
        'This is a recurring transaction.\n\n' +
        'Click OK to skip just this occurrence (it won\'t appear again).\n' +
        'Click Cancel to keep it.'
      );
      
      if (!choice) return;
      
      try {
        await RecurringTransactionService.skipOccurrence(t.transaction_id);
        await loadMonthData();
      } catch (e) {
        console.error('Failed to skip recurring transaction:', e);
        setError(e instanceof Error ? e.message : 'Failed to skip transaction');
      }
    } else {
      // Regular transaction - permanent delete
      const ok = window.confirm('Delete this transaction? This action cannot be undone.');
      if (!ok) return;
      try {
        await TransactionService.deleteTransaction(t.transaction_id);
        await loadMonthData();
      } catch (e) {
        console.error('Failed to delete transaction:', e);
        setError(e instanceof Error ? e.message : 'Failed to delete transaction');
      }
    }
  };

  // Toggle historical conversion for a transaction
  const toggleConversion = async (t: Transaction) => {
    if (expandedConversionId === t.id) {
      setExpandedConversionId(null);
      setConversionResult(null);
      return;
    }
    if (t.currency === defaultCurrency) {
      setExpandedConversionId(t.id);
      setConversionResult('Same as your default currency');
      return;
    }
    setExpandedConversionId(t.id);
    setConversionResult(null);
    setIsConvertingHistory(true);
    try {
      const converted = await ExchangeRateService.convert(t.amount, t.currency, defaultCurrency, t.transaction_date);
      if (converted !== null) {
        setConversionResult(`≈ ${formatCurrencyUtil(converted, defaultCurrency)} on this date`);
      } else {
        setConversionResult('Conversion unavailable');
      }
    } catch {
      setConversionResult('Conversion error');
    } finally {
      setIsConvertingHistory(false);
    }
  };

  // Edit modal: conversion helper
  const handleEditConvert = async () => {
    if (editConvertAmount <= 0) return;
    try {
      const converted = await ExchangeRateService.convert(
        editConvertAmount,
        editConvertFrom,
        editForm.currency,
        editForm.transactionDate || undefined
      );
      if (converted !== null) {
        handleEditInputChange('amount', Math.round(converted * 100) / 100);
        const rate = await ExchangeRateService.convert(1, editConvertFrom, editForm.currency, editForm.transactionDate || undefined);
        setEditConvertPreview(`1 ${editConvertFrom} = ${rate !== null ? rate.toFixed(4) : '?'} ${editForm.currency}`);
      }
    } catch {
      setEditConvertPreview('Conversion error');
    }
  };

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

      // Reload current month's data
      await loadMonthData();
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
      await CSVExportService.downloadTransactionsCSVDirect(
        transactions,
        categories,
        accounts,
        undefined,
        exportConvertCurrency || undefined
      );
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
      if (result.imported > 0) await loadMonthData();
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
      if (result.imported > 0) await loadMonthData();
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 touch-manipulation"
                  title="Previous month"
                >
                  ‹
                </button>
                <span className="text-gray-900 font-medium">
                  {getMonthLabel(currentMonthDate)}
                </span>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 touch-manipulation"
                  title="Next month"
                >
                  ›
                </button>
              </div>
              <p className="text-gray-600 mt-1">
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} in {getMonthLabel(currentMonthDate)}
                {deletedTransactionCount > 0 && !showDeletedTransactions && (
                  <span className="text-gray-400 ml-1">
                    ({deletedTransactionCount} deleted hidden)
                  </span>
                )}
              </p>
              {deletedTransactionCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDeletedTransactions(!showDeletedTransactions)}
                  className="mt-2 inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 touch-manipulation"
                >
                  {showDeletedTransactions ? 'Hide' : 'Show'} deleted ({deletedTransactionCount})
                </button>
              )}
              {summary.currencies.length > 0 && (
                <div className="mt-3 space-y-2">
                  {summary.currencies.map((curr) => (
                    <div key={curr} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-red-50 text-red-700">
                        Expenses: -{formatAmount(summary.expensesByCurrency[curr] || 0, curr)}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700">
                        Income: +{formatAmount(summary.incomesByCurrency[curr] || 0, curr)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded ${
                        (summary.netByCurrency[curr] || 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        Total: {(summary.netByCurrency[curr] || 0) >= 0 ? '+' : '-'}
                        {formatAmount(Math.abs(summary.netByCurrency[curr] || 0), curr)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
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
              <select
                value={exportConvertCurrency}
                onChange={e => setExportConvertCurrency(e.target.value as SupportedCurrency | '')}
                className="px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="Add converted column to export"
              >
                <option value="">No conversion</option>
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c} value={c}>Convert to {c}</option>
                ))}
              </select>
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
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {transactions.length === 0 ? 'No transactions yet' : 'No visible transactions'}
              </h3>
              <p className="text-gray-600">
                {transactions.length === 0
                  ? 'Start by adding your first transaction using the Add Transaction tab.'
                  : `All ${deletedTransactionCount} transaction${deletedTransactionCount !== 1 ? 's' : ''} in this month ${deletedTransactionCount !== 1 ? 'are' : 'is'} deleted.`}
              </p>
              {deletedTransactionCount > 0 && !showDeletedTransactions && (
                <button
                  type="button"
                  onClick={() => setShowDeletedTransactions(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  Show deleted transactions
                </button>
              )}
            </div>
          ) : (
            filteredTransactions.map((transaction) => {
              const isRecurring = !!('recurring_rule_id' in transaction && transaction.recurring_rule_id);
              const isSkipped = !!('is_recurring_skipped' in transaction && transaction.is_recurring_skipped);
              
              return (
              <div key={transaction.id} className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors ${isSkipped ? 'opacity-50' : ''}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  {/* Left side - Transaction info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                      {/* Type indicator */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'income' ? '💰 Income' : '💸 Expense'}
                      </span>
                      
                      {/* Recurring indicator */}
                      {isRecurring && !isSkipped && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title="Recurring transaction">
                          🔄 Recurring
                        </span>
                      )}
                      
                      {isSkipped && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800" title="Skipped occurrence">
                          ⏭️ Skipped
                        </span>
                      )}
                      
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
                    <h3 className="text-lg font-medium text-gray-900 mb-1 break-words leading-tight">
                      {transaction.title}
                    </h3>
                    
                    {/* Description */}
                    {transaction.description && (
                      <p className="text-sm text-gray-600 mb-2 break-words">
                        {transaction.description}
                      </p>
                    )}
                    
                    {/* Date */}
                    <p className="text-sm text-gray-500">
                      {formatDate(transaction.transaction_date)}
                    </p>

                    {/* Historical conversion toggle */}
                    {!isSkipped && transaction.currency !== defaultCurrency && (
                      <button
                        type="button"
                        onClick={() => toggleConversion(transaction)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 mt-1"
                      >
                        {expandedConversionId === transaction.id ? 'Hide' : `Show in ${defaultCurrency}`}
                      </button>
                    )}
                    {expandedConversionId === transaction.id && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isConvertingHistory ? 'Converting...' : conversionResult}
                      </p>
                    )}
                  </div>
                  
                  {/* Right side - Amount */}
                  <div className="flex-shrink-0 text-left md:ml-4 md:text-right">
                    <div className={`text-xl font-bold leading-tight ${
                      transaction.type === 'income' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatAmount(transaction.amount, transaction.currency)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 justify-start md:justify-end">
                      {!isSkipped && (
                        <button
                          type="button"
                          onClick={() => openEditModal(transaction)}
                          className="px-3 py-1 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 touch-manipulation"
                          title="Edit transaction"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(transaction)}
                        className="px-3 py-1 text-sm rounded-md border border-red-300 bg-white text-red-700 hover:bg-red-50 touch-manipulation"
                        title={isRecurring ? 'Skip this occurrence' : 'Delete transaction'}
                      >
                        {isSkipped ? 'Deleted' : isRecurring ? 'Skip' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {/* Recurring Update Scope Dialog */}
      {showRecurringDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Update Recurring Transaction</h3>
              <p className="text-sm text-gray-500 mt-2">How would you like to update this recurring transaction?</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="this-only"
                  checked={recurringUpdateScope === 'this-only'}
                  onChange={(e) => setRecurringUpdateScope(e.target.value as UpdateScope)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Just this occurrence</div>
                  <div className="text-sm text-gray-500">Only update this month&apos;s transaction (including date changes). Schedule changes will be ignored.</div>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="this-and-future"
                  checked={recurringUpdateScope === 'this-and-future'}
                  onChange={(e) => setRecurringUpdateScope(e.target.value as UpdateScope)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">This and all future occurrences</div>
                  <div className="text-sm text-gray-500">Update this month and all future months. Schedule changes will be applied.</div>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="rule-only"
                  checked={recurringUpdateScope === 'rule-only'}
                  onChange={(e) => setRecurringUpdateScope(e.target.value as UpdateScope)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Rule only</div>
                  <div className="text-sm text-gray-500">Update the rule (affects future materializations). Schedule changes will be applied.</div>
                </div>
              </label>
            </div>
            
            {recurringUpdateScope === 'this-and-future' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Schedule changes (frequency, interval, dates) will be applied. Transaction date changes only apply when updating &quot;Just this occurrence&quot;.
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowRecurringDialog(false);
                  setIsSavingEdit(false);
                }}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={isSavingEdit}
                className={`px-4 py-2 rounded-md text-white ${isSavingEdit ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {isSavingEdit ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit {editForm.isRecurring ? 'Recurring ' : ''}Transaction
              </h3>
              <p className="text-sm text-gray-500">Update the details and save your changes.</p>
              {editForm.isRecurring && (
                <p className="text-sm text-blue-600 mt-1">
                  🔄 This is a recurring transaction
                </p>
              )}
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => handleEditInputChange('type', 'expense')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      editForm.type === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    💸 Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditInputChange('type', 'income')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      editForm.type === 'income' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    💰 Income
                  </button>
                </div>
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.amount || ''}
                    onChange={(e) => handleEditInputChange('amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select
                    value={editForm.currency}
                    onChange={(e) => handleEditInputChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={editForm.categoryId}
                  onChange={(e) => handleEditInputChange('categoryId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {'emoji' in category && category.emoji ? `${category.emoji} ` : ''}{category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account *</label>
                <select
                  value={editForm.accountId}
                  onChange={(e) => handleEditInputChange('accountId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => handleEditInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter transaction title"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Date * <span className="text-xs text-gray-500">(dd/mm/yyyy)</span>
                </label>
                <input
                  ref={editDateInputRef}
                  type="text"
                  value={editDateDisplayValue}
                  onChange={handleEditDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DD/MM/YYYY"
                  maxLength={10}
                  pattern="\d{2}/\d{2}/\d{4}"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => handleEditInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  placeholder="Optional description or notes..."
                />
              </div>

              {/* Recurring Schedule Fields */}
              {editForm.isRecurring && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Recurring Schedule</h4>
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Schedule changes will only be applied when you select &quot;This and all future occurrences&quot; or &quot;Rule only&quot; in the next step.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        value={editForm.recurringFrequency}
                        onChange={(e) => handleEditInputChange('recurringFrequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        value={editForm.recurringInterval}
                        onChange={(e) => handleEditInputChange('recurringInterval', Math.max(1, parseInt(e.target.value || '1', 10)))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-xs text-gray-500">(dd/mm/yyyy)</span>
                    </label>
                    <input
                      type="text"
                      value={recurringStartDateDisplayValue}
                      onChange={(e) => {
                        const formatted = e.target.value.replace(/\D/g, '');
                        let display = '';
                        if (formatted.length > 0) {
                          display = formatted.substring(0, 2);
                          if (formatted.length >= 3) {
                            display += '/' + formatted.substring(2, 4);
                            if (formatted.length >= 5) {
                              display += '/' + formatted.substring(4, 8);
                            }
                          }
                        }
                        setRecurringStartDateDisplayValue(display);
                        if (display.length === 10) {
                          const iso = parseDateFromDisplay(display);
                          if (iso) handleEditInputChange('recurringStartDate', iso);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="DD/MM/YYYY"
                      maxLength={10}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date (optional) <span className="text-xs text-gray-500">(dd/mm/yyyy)</span>
                    </label>
                    <input
                      type="text"
                      value={recurringEndDateDisplayValue}
                      onChange={(e) => {
                        const formatted = e.target.value.replace(/\D/g, '');
                        let display = '';
                        if (formatted.length > 0) {
                          display = formatted.substring(0, 2);
                          if (formatted.length >= 3) {
                            display += '/' + formatted.substring(2, 4);
                            if (formatted.length >= 5) {
                              display += '/' + formatted.substring(4, 8);
                            }
                          }
                        }
                        setRecurringEndDateDisplayValue(display);
                        if (display.length === 10) {
                          const iso = parseDateFromDisplay(display);
                          handleEditInputChange('recurringEndDate', iso || '');
                        } else {
                          handleEditInputChange('recurringEndDate', '');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="DD/MM/YYYY"
                      maxLength={10}
                    />
                    {recurringEndDateDisplayValue && (
                      <button
                        type="button"
                        onClick={() => {
                          setRecurringEndDateDisplayValue('');
                          handleEditInputChange('recurringEndDate', '');
                        }}
                        className="mt-1 text-xs text-red-600 hover:text-red-800"
                      >
                        Clear end date
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Currency conversion helper */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditConversion(v => !v); setEditConvertPreview(''); }}
                  className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                >
                  {showEditConversion ? 'Hide conversion helper' : 'Convert from another currency'}
                </button>
                {showEditConversion && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Paid amount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editConvertAmount || ''}
                          onChange={e => setEditConvertAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                        <select
                          value={editConvertFrom}
                          onChange={e => setEditConvertFrom(e.target.value as SupportedCurrency)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {SUPPORTED_CURRENCIES.filter(c => c !== editForm.currency).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleEditConvert}
                      disabled={editConvertAmount <= 0}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Convert to {editForm.currency}
                    </button>
                    {editConvertPreview && (
                      <p className="text-xs text-gray-500">{editConvertPreview}</p>
                    )}
                  </div>
                )}
              </div>

              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{editError}</div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={isSavingEdit}
                  className={`px-4 py-2 rounded-md text-white touch-manipulation ${isSavingEdit ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {isSavingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 