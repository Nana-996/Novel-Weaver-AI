import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  tier: 'free' | 'writer' | 'novelist';
}

function formatAuthError(error: any): string {
  if (!error) return 'An unknown error occurred.';
  const msg = error.message || String(error);
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
    return 'Unable to connect to Supabase. Please verify your VITE_SUPABASE_URL and key in .env.local, and ensure your Supabase project is active.';
  }
  return msg;
}

// Sign up with email and password
export async function signUp(email: string, password: string, displayName: string): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: 'Authentication is not configured. Please add your Supabase credentials to .env.local.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
      },
    });

    if (error) return { user: null, error: formatAuthError(error) };
    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: formatAuthError(err) };
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: 'Authentication is not configured. Please add your Supabase credentials to .env.local.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { user: null, error: formatAuthError(error) };
    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: formatAuthError(err) };
  }
}

// Sign in with Google OAuth
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Authentication is not configured. Please add your Supabase credentials to .env.local.' };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) return { error: formatAuthError(error) };
    return { error: null };
  } catch (err: any) {
    return { error: formatAuthError(err) };
  }
}

// Sign out
export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// Get current session
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Get current access token (JWT) for API calls
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token || null;
}

// Get user profile from the profiles table
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;

  const session = await getSession();
  const email = session?.user?.email || '';
  const displayName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Writer';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, tier')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // If profile doesn't exist yet, insert a default free tier row
      await supabase
        .from('profiles')
        .insert({ id: userId, tier: 'free' });
    }

    return {
      id: userId,
      email,
      displayName,
      tier: data?.tier || 'free',
    };
  } catch (err) {
    console.warn('[authService] Could not load profile from Supabase database, using session fallback:', err);
    return {
      id: userId,
      email,
      displayName,
      tier: 'free',
    };
  }
}

// Subscribe to auth state changes
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): (() => void) | undefined {
  if (!supabase) return undefined;

  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// Check if auth is available
export { isSupabaseConfigured };
