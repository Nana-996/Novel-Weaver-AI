import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  tier: 'free' | 'writer' | 'novelist';
}

// Sign up with email and password
export async function signUp(email: string, password: string, displayName: string): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) return { user: null, error: 'Authentication not configured.' };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName },
    },
  });

  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) return { user: null, error: 'Authentication not configured.' };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

// Sign in with Google OAuth
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Authentication not configured.' };

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) return { error: error.message };
  return { error: null };
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

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, tier')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  const session = await getSession();
  return {
    id: data.id,
    email: session?.user?.email || '',
    displayName: data.display_name || session?.user?.email || 'Writer',
    avatarUrl: data.avatar_url,
    tier: data.tier || 'free',
  };
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
