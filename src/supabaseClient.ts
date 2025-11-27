import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables safely
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Check if keys are present (for real production mode)
const isConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create the client
export const supabase = isConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const isSupabaseConfigured = () => !!supabase;