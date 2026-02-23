import { useState, useEffect, useCallback } from 'react';
import { DebtService } from '../../services/debtService';
import { UserContactService } from '../../services/userContactService';
import { TransactionService } from '../../services/transactionService';
import { formatDate } from '../../lib/dateUtils';
import { formatCurrency, SUPPORTED_CURRENCIES, CURRENCY_INFO } from '../../lib/currencies';
import { ExchangeRateService } from '../../services/exchangeRateService';
import { useUserSettings } from '../../hooks/useUserSettings';
import type { DebtWithPayments, ContactDebtSummary, DebtStatus } from '../../services/debtService';
import type { UserContact, UserExpenseCategory, UserAccount } from '../../lib/supabase';
import type { SupportedCurrency } from '../../lib/currencies';

type ViewMode = 'list' | 'summary';
type FilterType = 'all' | 'owed_to_me' | 'owed_by_me';
type FilterStatus = 'all' | 'pending' | 'partial' | 'settled';

const STATUS_COLORS: Record<DebtStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  partial: 'bg-blue-100 text-blue-800',
  settled: 'bg-green-100 text-green-800',
};

export function DebtTracker() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [debts, setDebts] = useState<DebtWithPayments[]>([]);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [summary, setSummary] = useState<ContactDebtSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { defaultCurrency } = useUserSettings();

  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Expanded debt (show payments)
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  // Add debt modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [debtForm, setDebtForm] = useState({
    type: 'owed_to_me' as 'owed_to_me' | 'owed_by_me',
    contactId: '',
    title: '',
    description: '',
    amount: '',
    currency: (defaultCurrency || 'USD') as string,
    createTransaction: false,
    categoryId: '',
    accountId: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  // Transaction selectors data
  const [categories, setCategories] = useState<UserExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);

  // Add payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [addingPaymentForDebt, setAddingPaymentForDebt] = useState<string | null>(null);

  // Currency conversion
  const [showConversion, setShowConversion] = useState(false);
  const [convertFrom, setConvertFrom] = useState<SupportedCurrency>('USD');
  const [convertAmount, setConvertAmount] = useState<number>(0);
  const [convertPreview, setConvertPreview] = useState('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const [debtsData, contactsData] = await Promise.all([
        DebtService.getDebts(),
        UserContactService.getContacts(),
      ]);
      setDebts(debtsData);
      setContacts(contactsData);

      if (viewMode === 'summary') {
        const summaryData = await DebtService.getDebtSummaryByContact();
        setSummary(summaryData);
      }
    } catch (err) {
      console.error('Error loading debt data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update currency when default changes
  useEffect(() => {
    if (defaultCurrency) {
      setDebtForm(prev => ({ ...prev, currency: defaultCurrency }));
    }
  }, [defaultCurrency]);

  const loadTransactionData = async () => {
    try {
      const [cats, accts] = await Promise.all([
        TransactionService.getExpenseCategories(),
        TransactionService.getUserAccounts(),
      ]);
      setCategories(cats);
      setAccounts(accts);
    } catch (err) {
      console.error('Error loading transaction data:', err);
    }
  };

  const filteredDebts = debts.filter(debt => {
    if (filterType !== 'all' && debt.type !== filterType) return false;
    if (filterStatus !== 'all' && debt.status !== filterStatus) return false;
    return true;
  });

  const getContactName = (contactId: string) => {
    return contacts.find(c => c.id === contactId)?.name || 'Unknown';
  };

  const handleConvert = async () => {
    if (convertAmount <= 0) return;
    try {
      const converted = await ExchangeRateService.convert(
        convertAmount,
        convertFrom,
        debtForm.currency as SupportedCurrency,
      );
      if (converted !== null) {
        setDebtForm(prev => ({ ...prev, amount: (Math.round(converted * 100) / 100).toString() }));
        const rate = await ExchangeRateService.convert(1, convertFrom, debtForm.currency as SupportedCurrency);
        setConvertPreview(`1 ${convertFrom} = ${rate !== null ? rate.toFixed(4) : '?'} ${debtForm.currency}`);
      }
    } catch (err) {
      console.error('Conversion failed:', err);
      setError('Currency conversion failed. Try again later.');
    }
  };

  const handleCreateDebt = async () => {
    try {
      setError('');
      const amount = parseFloat(debtForm.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      const transactionData = debtForm.createTransaction
        ? {
            categoryId: debtForm.categoryId,
            accountId: debtForm.accountId,
            transactionDate: debtForm.transactionDate,
          }
        : undefined;

      await DebtService.createDebtOfflineAware(
        {
          contactId: debtForm.contactId,
          type: debtForm.type,
          title: debtForm.title,
          description: debtForm.description || undefined,
          amount,
          currency: debtForm.currency,
        },
        transactionData
      );

      setShowAddModal(false);
      resetDebtForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create debt');
    }
  };

  const resetDebtForm = () => {
    setDebtForm({
      type: 'owed_to_me',
      contactId: '',
      title: '',
      description: '',
      amount: '',
      currency: (defaultCurrency || 'USD') as string,
      createTransaction: false,
      categoryId: '',
      accountId: '',
      transactionDate: new Date().toISOString().split('T')[0],
    });
    setShowConversion(false);
    setConvertFrom('USD');
    setConvertAmount(0);
    setConvertPreview('');
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (!confirm('Are you sure you want to delete this debt and all its payments?')) return;
    try {
      setError('');
      await DebtService.deleteDebt(debtId);
      setExpandedDebtId(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete debt');
    }
  };

  const handleAddPayment = async (debtId: string, directAmount?: number) => {
    try {
      setError('');
      const amount = directAmount ?? parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Payment amount must be a positive number');
        return;
      }

      await DebtService.addPayment(debtId, {
        amount,
        paymentDate: directAmount ? new Date().toISOString().split('T')[0] : paymentForm.paymentDate,
        note: directAmount ? 'Full settlement' : (paymentForm.note || undefined),
      });

      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        note: '',
      });
      setAddingPaymentForDebt(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
      setError('');
      await DebtService.deletePayment(paymentId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
    }
  };

  const openAddModal = () => {
    resetDebtForm();
    setShowAddModal(true);
    loadTransactionData();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading debts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Debts</h2>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium touch-manipulation min-h-[44px] ${
                viewMode === 'list'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 text-sm font-medium touch-manipulation min-h-[44px] ${
                viewMode === 'summary'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Summary
            </button>
          </div>
          <button
            onClick={openAddModal}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors duration-200 text-sm font-medium touch-manipulation min-h-[44px]"
          >
            Add Debt
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Type filters */}
            {([['all', 'All'], ['owed_to_me', 'Owed to me'], ['owed_by_me', 'I owe']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilterType(value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium touch-manipulation min-h-[44px] ${
                  filterType === value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="w-px bg-gray-300 mx-1 self-stretch"></div>
            {/* Status filters */}
            {([['all', 'All status'], ['pending', 'Pending'], ['partial', 'Partial'], ['settled', 'Settled']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium touch-manipulation min-h-[44px] ${
                  filterStatus === value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Debt List */}
          {filteredDebts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">
                {debts.length === 0
                  ? 'No debts yet. Add one to get started.'
                  : 'No debts match the selected filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDebts.map(debt => (
                <div
                  key={debt.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Debt Card Header */}
                  <button
                    onClick={() => setExpandedDebtId(expandedDebtId === debt.id ? null : debt.id)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors touch-manipulation"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 truncate">{debt.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[debt.status]}`}>
                            {debt.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{getContactName(debt.contact_id)}</span>
                          <span>·</span>
                          <span className={debt.type === 'owed_to_me' ? 'text-green-600' : 'text-red-600'}>
                            {debt.type === 'owed_to_me' ? 'Owed to me' : 'I owe'}
                          </span>
                          <span>·</span>
                          <span>{formatDate(debt.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-lg font-bold ${debt.type === 'owed_to_me' ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Number(debt.amount), debt.currency)}
                        </div>
                        {debt.totalPaid > 0 && (
                          <div className="text-xs text-gray-500">
                            Paid: {formatCurrency(debt.totalPaid, debt.currency)}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    {debt.totalPaid > 0 && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${debt.status === 'settled' ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, (debt.totalPaid / Number(debt.amount)) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </button>

                  {/* Expanded: Payments */}
                  {expandedDebtId === debt.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {debt.description && (
                        <p className="text-sm text-gray-600 mb-3">{debt.description}</p>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Payments ({debt.payments.length})
                        </h4>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(debt.totalPaid, debt.currency)} of {formatCurrency(Number(debt.amount), debt.currency)}
                          {debt.status !== 'settled' && (
                            <span className="ml-1">
                              ({formatCurrency(Number(debt.amount) - debt.totalPaid, debt.currency)} remaining)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Payment list */}
                      {debt.payments.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {debt.payments.map(payment => (
                            <div key={payment.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(Number(payment.amount), debt.currency)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(payment.payment_date)}
                                  {payment.note && <span className="ml-1">· {payment.note}</span>}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeletePayment(payment.id)}
                                className="text-red-500 hover:text-red-700 p-1 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Delete payment"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Payment Form */}
                      {debt.status !== 'settled' && (
                        <>
                          {addingPaymentForDebt === debt.id ? (
                            <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={Number(debt.amount) - debt.totalPaid}
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                                  <input
                                    type="date"
                                    value={paymentForm.paymentDate}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
                                  <input
                                    type="text"
                                    value={paymentForm.note}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, note: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    placeholder="Optional note"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAddPayment(debt.id)}
                                  disabled={!paymentForm.amount || !paymentForm.paymentDate}
                                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                                >
                                  Add Payment
                                </button>
                                <button
                                  onClick={() => {
                                    setAddingPaymentForDebt(null);
                                    setPaymentForm({ amount: '', paymentDate: new Date().toISOString().split('T')[0], note: '' });
                                  }}
                                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium touch-manipulation min-h-[44px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setAddingPaymentForDebt(debt.id)}
                                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium touch-manipulation min-h-[44px]"
                              >
                                + Add Payment
                              </button>
                              <button
                                onClick={() => handleAddPayment(debt.id, Number(debt.amount) - debt.totalPaid)}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium touch-manipulation min-h-[44px]"
                              >
                                Settle Full Amount ({formatCurrency(Number(debt.amount) - debt.totalPaid, debt.currency)})
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Delete debt */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleDeleteDebt(debt.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium touch-manipulation min-h-[44px]"
                        >
                          Delete Debt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Summary View */
        <div className="space-y-4">
          {/* Overall totals */}
          {summary.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Overall</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total owed to me</div>
                  <div className="text-lg font-bold text-green-600">
                    {(() => {
                      const byCurrency = new Map<string, number>();
                      summary.forEach(s => {
                        byCurrency.set(s.currency, (byCurrency.get(s.currency) || 0) + s.totalOwedToMe);
                      });
                      return Array.from(byCurrency.entries())
                        .filter(([, v]) => v > 0)
                        .map(([cur, val]) => formatCurrency(val, cur))
                        .join(', ') || formatCurrency(0, defaultCurrency || 'USD');
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total I owe</div>
                  <div className="text-lg font-bold text-red-600">
                    {(() => {
                      const byCurrency = new Map<string, number>();
                      summary.forEach(s => {
                        byCurrency.set(s.currency, (byCurrency.get(s.currency) || 0) + s.totalOwedByMe);
                      });
                      return Array.from(byCurrency.entries())
                        .filter(([, v]) => v > 0)
                        .map(([cur, val]) => formatCurrency(val, cur))
                        .join(', ') || formatCurrency(0, defaultCurrency || 'USD');
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Net balance</div>
                  <div className={`text-lg font-bold ${
                    summary.reduce((sum, s) => sum + s.netBalance, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(() => {
                      const byCurrency = new Map<string, number>();
                      summary.forEach(s => {
                        byCurrency.set(s.currency, (byCurrency.get(s.currency) || 0) + s.netBalance);
                      });
                      return Array.from(byCurrency.entries())
                        .filter(([, v]) => v !== 0)
                        .map(([cur, val]) => `${val >= 0 ? '+' : ''}${formatCurrency(val, cur)}`)
                        .join(', ') || formatCurrency(0, defaultCurrency || 'USD');
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Per-contact cards */}
          {summary.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No active debts to summarize.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {summary.map(s => (
                <div key={`${s.contactId}-${s.currency}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{s.contactName}</h4>
                    <span className="text-xs text-gray-500">{s.currency}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Owed to me</span>
                      <span className="text-green-600 font-medium">{formatCurrency(s.totalOwedToMe, s.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">I owe</span>
                      <span className="text-red-600 font-medium">{formatCurrency(s.totalOwedByMe, s.currency)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
                      <span className="text-gray-700">Net</span>
                      <span className={s.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {s.netBalance >= 0 ? '+' : ''}{formatCurrency(s.netBalance, s.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Debt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Debt</h3>

            <div className="space-y-4">
              {/* Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDebtForm(prev => ({ ...prev, type: 'owed_to_me' }))}
                    className={`flex-1 px-4 py-2 text-sm font-medium touch-manipulation min-h-[44px] ${
                      debtForm.type === 'owed_to_me'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Owed to me
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtForm(prev => ({ ...prev, type: 'owed_by_me' }))}
                    className={`flex-1 px-4 py-2 text-sm font-medium touch-manipulation min-h-[44px] ${
                      debtForm.type === 'owed_by_me'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    I owe
                  </button>
                </div>
              </div>

              {/* Contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
                <select
                  value={debtForm.contactId}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, contactId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select a contact</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {contacts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No contacts yet. Add contacts in Settings first.</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={debtForm.title}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g., Dinner split"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={debtForm.description}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
                  placeholder="Optional description"
                />
              </div>

              {/* Amount + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={debtForm.amount}
                    onChange={(e) => setDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                  <select
                    value={debtForm.currency}
                    onChange={(e) => setDebtForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {SUPPORTED_CURRENCIES.map(code => (
                      <option key={code} value={code}>{CURRENCY_INFO[code].symbol} {code}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Currency Conversion Helper */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setShowConversion(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation"
                >
                  <span>Convert from another currency</span>
                  <span className="text-gray-400">{showConversion ? '\u25B2' : '\u25BC'}</span>
                </button>
                {showConversion && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 pt-3">
                      Enter an amount in a foreign currency to auto-fill the amount above in {debtForm.currency}.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Paid in</label>
                        <select
                          value={convertFrom}
                          onChange={e => setConvertFrom(e.target.value as SupportedCurrency)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                        >
                          {SUPPORTED_CURRENCIES.filter(c => c !== debtForm.currency).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={convertAmount || ''}
                          onChange={e => setConvertAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                          placeholder="0.00"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleConvert}
                        disabled={convertAmount <= 0}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation min-h-[44px]"
                      >
                        Convert
                      </button>
                    </div>
                    {convertPreview && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-md">{convertPreview}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Create Transaction Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createTransaction"
                  checked={debtForm.createTransaction}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, createTransaction: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="createTransaction" className="text-sm text-gray-700">
                  Also create as transaction
                </label>
              </div>

              {/* Transaction fields (conditional) */}
              {debtForm.createTransaction && (
                <div className="space-y-3 pl-6 border-l-2 border-emerald-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      value={debtForm.categoryId}
                      onChange={(e) => setDebtForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
                    <select
                      value={debtForm.accountId}
                      onChange={(e) => setDebtForm(prev => ({ ...prev, accountId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select account</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date *</label>
                    <input
                      type="date"
                      value={debtForm.transactionDate}
                      onChange={(e) => setDebtForm(prev => ({ ...prev, transactionDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCreateDebt}
                disabled={
                  !debtForm.contactId ||
                  !debtForm.title.trim() ||
                  !debtForm.amount ||
                  (debtForm.createTransaction && (!debtForm.categoryId || !debtForm.accountId))
                }
                className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              >
                Create
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium touch-manipulation min-h-[44px]"
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
