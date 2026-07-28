import { createBrowserClient } from "@/lib/supabase/client";

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, name?: string) {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const supabase = createBrowserClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Get session
 */
export async function getSession() {
  const supabase = createBrowserClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : '',
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = createBrowserClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
