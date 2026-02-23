import { supabase } from '../lib/supabase';
import { TransactionService } from './transactionService';
import { offlineQueue } from './offlineQueueService';
import type { Debt, DebtPayment } from '../lib/supabase';

export interface CreateDebtData {
  contactId: string;
  type: 'owed_to_me' | 'owed_by_me';
  title: string;
  description?: string;
  amount: number;
  currency: string;
}

export interface CreateDebtTransactionData {
  categoryId: string;
  accountId: string;
  transactionDate: string;
}

export interface AddPaymentData {
  amount: number;
  paymentDate: string;
  note?: string;
}

export type DebtStatus = 'pending' | 'partial' | 'settled';

export interface DebtWithPayments extends Debt {
  payments: DebtPayment[];
  status: DebtStatus;
  totalPaid: number;
}

export interface ContactDebtSummary {
  contactId: string;
  contactName: string;
  totalOwedToMe: number;
  totalOwedByMe: number;
  netBalance: number;
  currency: string;
}

export function computeDebtStatus(amount: number, totalPaid: number): DebtStatus {
  if (totalPaid <= 0) return 'pending';
  if (totalPaid >= amount) return 'settled';
  return 'partial';
}

export class DebtService {
  static async createDebt(
    data: CreateDebtData,
    transactionData?: CreateDebtTransactionData
  ): Promise<Debt> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to create debts');
    }

    let transactionId: string | undefined;

    // Optionally create a linked transaction
    if (transactionData) {
      const txnType = data.type === 'owed_by_me' ? 'expense' : 'income';
      const transaction = await TransactionService.createTransaction({
        type: txnType as 'income' | 'expense',
        amount: data.amount,
        currency: data.currency,
        categoryId: transactionData.categoryId,
        accountId: transactionData.accountId,
        title: data.title,
        description: data.description,
        transactionDate: transactionData.transactionDate,
      });
      transactionId = transaction.id;
    }

    const { data: debt, error } = await supabase
      .from('debts')
      .insert({
        user_id: user.id,
        contact_id: data.contactId,
        type: data.type,
        title: data.title,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        transaction_id: transactionId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating debt:', error);
      throw new Error(`Failed to create debt: ${error.message}`);
    }

    return debt;
  }

  static async createDebtOfflineAware(
    data: CreateDebtData,
    transactionData?: CreateDebtTransactionData
  ): Promise<{ debt: Debt | null; isPending: boolean }> {
    if (navigator.onLine) {
      try {
        const debt = await this.createDebt(data, transactionData);
        return { debt, isPending: false };
      } catch (error) {
        if (error instanceof Error && error.message.includes('network')) {
          await offlineQueue.addToQueue('debt', 'create', {
            ...data,
            createTransaction: !!transactionData,
            transactionData,
          } as unknown as Record<string, unknown>);
          return { debt: null, isPending: true };
        }
        throw error;
      }
    }

    await offlineQueue.addToQueue('debt', 'create', {
      ...data,
      createTransaction: !!transactionData,
      transactionData,
    } as unknown as Record<string, unknown>);
    return { debt: null, isPending: true };
  }

  static async getDebts(): Promise<DebtWithPayments[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to fetch debts');
    }

    const { data: debts, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching debts:', error);
      throw new Error(`Failed to fetch debts: ${error.message}`);
    }

    if (!debts || debts.length === 0) return [];

    // Fetch all payments for these debts
    const debtIds = debts.map(d => d.id);
    const { data: payments, error: paymentsError } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('user_id', user.id)
      .in('debt_id', debtIds)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching debt payments:', paymentsError);
      throw new Error(`Failed to fetch debt payments: ${paymentsError.message}`);
    }

    const paymentsByDebt = new Map<string, DebtPayment[]>();
    for (const payment of (payments || [])) {
      const existing = paymentsByDebt.get(payment.debt_id) || [];
      existing.push(payment);
      paymentsByDebt.set(payment.debt_id, existing);
    }

    return debts.map(debt => {
      const debtPayments = paymentsByDebt.get(debt.id) || [];
      const totalPaid = debtPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        ...debt,
        payments: debtPayments,
        status: computeDebtStatus(Number(debt.amount), totalPaid),
        totalPaid,
      };
    });
  }

  static async deleteDebt(debtId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to delete debts');
    }

    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting debt:', error);
      throw new Error(`Failed to delete debt: ${error.message}`);
    }
  }

  static async addPayment(debtId: string, data: AddPaymentData): Promise<DebtPayment> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to add payments');
    }

    // Validate payment doesn't exceed remaining amount
    const { data: debt, error: debtError } = await supabase
      .from('debts')
      .select('amount')
      .eq('id', debtId)
      .eq('user_id', user.id)
      .single();

    if (debtError || !debt) {
      throw new Error('Debt not found');
    }

    const { data: existingPayments, error: paymentsError } = await supabase
      .from('debt_payments')
      .select('amount')
      .eq('debt_id', debtId)
      .eq('user_id', user.id);

    if (paymentsError) {
      throw new Error(`Failed to check existing payments: ${paymentsError.message}`);
    }

    const totalPaid = (existingPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(debt.amount) - totalPaid;

    if (data.amount > remaining) {
      throw new Error(`Payment amount (${data.amount}) exceeds remaining balance (${remaining.toFixed(2)})`);
    }

    const { data: payment, error } = await supabase
      .from('debt_payments')
      .insert({
        user_id: user.id,
        debt_id: debtId,
        amount: data.amount,
        payment_date: data.paymentDate,
        note: data.note,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding payment:', error);
      throw new Error(`Failed to add payment: ${error.message}`);
    }

    return payment;
  }

  static async deletePayment(paymentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to delete payments');
    }

    const { error } = await supabase
      .from('debt_payments')
      .delete()
      .eq('id', paymentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting payment:', error);
      throw new Error(`Failed to delete payment: ${error.message}`);
    }
  }

  static async getDebtSummaryByContact(): Promise<ContactDebtSummary[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to fetch debt summary');
    }

    // Get all debts with their payments
    const debtsWithPayments = await this.getDebts();

    // Get contacts for names
    const { data: contacts, error: contactsError } = await supabase
      .from('user_contacts')
      .select('id, name')
      .eq('user_id', user.id);

    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
    }

    const contactMap = new Map<string, string>();
    for (const c of (contacts || [])) {
      contactMap.set(c.id, c.name);
    }

    // Group by contact and currency
    const summaryMap = new Map<string, ContactDebtSummary>();

    for (const debt of debtsWithPayments) {
      if (debt.status === 'settled') continue;

      const remaining = Number(debt.amount) - debt.totalPaid;
      const key = `${debt.contact_id}-${debt.currency}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          contactId: debt.contact_id,
          contactName: contactMap.get(debt.contact_id) || 'Unknown',
          totalOwedToMe: 0,
          totalOwedByMe: 0,
          netBalance: 0,
          currency: debt.currency,
        });
      }

      const summary = summaryMap.get(key)!;
      if (debt.type === 'owed_to_me') {
        summary.totalOwedToMe += remaining;
      } else {
        summary.totalOwedByMe += remaining;
      }
      summary.netBalance = summary.totalOwedToMe - summary.totalOwedByMe;
    }

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.contactName.localeCompare(b.contactName)
    );
  }
}
