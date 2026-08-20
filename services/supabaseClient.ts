import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawAnonKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

// Check if the provided credentials are real and not placeholder examples
const isPlaceholder = (val: string) =>
  !val ||
  val.includes('your-project') ||
  val.includes('sb_publishable_xxx') ||
  val.includes('your-anon-key');

export const isSupabaseConfigured = (): boolean => {
  if (isPlaceholder(rawUrl) || isPlaceholder(rawAnonKey)) return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

// Create a single Supabase client instance for the entire app
export const supabase = isSupabaseConfigured()
  ? createClient(rawUrl, rawAnonKey)
  : null;

