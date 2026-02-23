import { supabase } from '../lib/supabase';
import type { UserContact } from '../lib/supabase';

export interface CreateContactData {
  name: string;
}

export interface UpdateContactData {
  name: string;
}

export class UserContactService {
  static async getContacts(): Promise<UserContact[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to access contacts');
    }

    const { data: contacts, error } = await supabase
      .from('user_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching contacts:', error);
      throw new Error(`Failed to fetch contacts: ${error.message}`);
    }

    return contacts || [];
  }

  static async createContact(data: CreateContactData): Promise<UserContact> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to create contacts');
    }

    const contacts = await this.getContacts();
    const existing = contacts.find(c =>
      c.name.toLowerCase() === data.name.trim().toLowerCase()
    );

    if (existing) {
      throw new Error(`Contact "${data.name}" already exists`);
    }

    const { data: contact, error } = await supabase
      .from('user_contacts')
      .insert({
        user_id: user.id,
        name: data.name.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      throw new Error(`Failed to create contact: ${error.message}`);
    }

    return contact;
  }

  static async updateContact(contactId: string, data: UpdateContactData): Promise<UserContact> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to update contacts');
    }

    if (data.name) {
      const contacts = await this.getContacts();
      const existing = contacts.find(c =>
        c.name.toLowerCase() === data.name.trim().toLowerCase() && c.id !== contactId
      );

      if (existing) {
        throw new Error(`Contact "${data.name}" already exists`);
      }
    }

    const { data: contact, error } = await supabase
      .from('user_contacts')
      .update({ name: data.name.trim() })
      .eq('id', contactId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      throw new Error(`Failed to update contact: ${error.message}`);
    }

    return contact;
  }

  static async deleteContact(contactId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to delete contacts');
    }

    // Check if contact is referenced by any debts
    const { data: debts } = await supabase
      .from('debts')
      .select('id')
      .eq('user_id', user.id)
      .eq('contact_id', contactId)
      .limit(1);

    if (debts && debts.length > 0) {
      throw new Error('Cannot delete contact that has associated debts');
    }

    const { error } = await supabase
      .from('user_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting contact:', error);
      throw new Error(`Failed to delete contact: ${error.message}`);
    }
  }
}
