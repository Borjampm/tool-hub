import { supabase } from '../lib/supabase';
import type { UserAccount } from '../lib/supabase';

export interface CreateUserAccountData {
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'investment' | 'other';
  color?: string;
  description?: string;
}

export interface UpdateUserAccountData {
  name?: string;
  type?: 'bank' | 'cash' | 'credit_card' | 'investment' | 'other';
  color?: string;
  description?: string;
  is_active?: boolean;
}

export class UserAccountService {
  /**
   * Get all accounts for the authenticated user
   */
  static async getUserAccounts(): Promise<UserAccount[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access accounts');
    }

    const { data: accounts, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching user accounts:', error);
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    return accounts || [];
  }

  /**
   * Create a new account for the authenticated user
   */
  static async createAccount(data: CreateUserAccountData): Promise<UserAccount> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create accounts');
    }

    // Check if account name already exists for this user
    const { data: existingAccounts } = await supabase
      .from('user_accounts')
      .select('name')
      .eq('user_id', user.id)
      .eq('name', data.name)
      .eq('is_active', true);

    if (existingAccounts && existingAccounts.length > 0) {
      throw new Error(`Account "${data.name}" already exists`);
    }

    const { data: account, error } = await supabase
      .from('user_accounts')
      .insert({
        user_id: user.id,
        name: data.name.trim(),
        type: data.type,
        color: data.color || '#6B7280', // Default gray color
        description: data.description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      throw new Error(`Failed to create account: ${error.message}`);
    }

    return account;
  }

  /**
   * Update an existing account
   */
  static async updateAccount(accountId: string, data: UpdateUserAccountData): Promise<UserAccount> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update accounts');
    }

    // If updating name, check if it already exists for this user
    if (data.name) {
      const { data: existingAccounts } = await supabase
        .from('user_accounts')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('name', data.name)
        .eq('is_active', true)
        .neq('id', accountId);

      if (existingAccounts && existingAccounts.length > 0) {
        throw new Error(`Account "${data.name}" already exists`);
      }
    }

    const updateData: {
      name?: string;
      type?: 'bank' | 'cash' | 'credit_card' | 'investment' | 'other';
      color?: string;
      description?: string | null;
      is_active?: boolean;
    } = {};
    
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: account, error } = await supabase
      .from('user_accounts')
      .update(updateData)
      .eq('id', accountId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating account:', error);
      throw new Error(`Failed to update account: ${error.message}`);
    }

    return account;
  }

  /**
   * Delete an account (soft delete by setting is_active to false)
   */
  static async deleteAccount(accountId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to delete accounts');
    }

    // Check if this account is being used in any transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('account', accountId)
      .limit(1);

    if (transactions && transactions.length > 0) {
      // Soft delete - just deactivate the account
      const { error } = await supabase
        .from('user_accounts')
        .update({ is_active: false })
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deactivating account:', error);
        throw new Error(`Failed to deactivate account: ${error.message}`);
      }
    } else {
      // Hard delete if no transactions reference this account
      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting account:', error);
        throw new Error(`Failed to delete account: ${error.message}`);
      }
    }
  }

  /**
   * Get account type emoji
   */
  static getAccountTypeEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      bank: '🏦',
      cash: '💵',
      credit_card: '💳',
      investment: '📈',
      other: '💰'
    };
    return emojiMap[type] || '💰';
  }

  /**
   * Get account type display name
   */
  static getAccountTypeDisplayName(type: string): string {
    const nameMap: Record<string, string> = {
      bank: 'Bank Account',
      cash: 'Cash',
      credit_card: 'Credit Card',
      investment: 'Investment',
      other: 'Other'
    };
    return nameMap[type] || 'Other';
  }
}