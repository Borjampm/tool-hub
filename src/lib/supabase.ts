import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface TimeEntry {
  id: string;
  entry_id: string;
  name: string;
  description?: string;
  category?: string;
  start_time: string;
  end_time?: string;
  elapsed_time?: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserCategory {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
} 