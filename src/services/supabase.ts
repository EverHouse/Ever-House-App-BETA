import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const isConfigured = Boolean(
  isValidUrl(supabaseUrl) && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 10
);

const dummyClient = {
  auth: {
    signInWithOtp: async () => ({ error: new Error('Supabase not configured. Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.') }),
    signOut: async () => {},
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    exchangeCodeForSession: async () => ({ data: { session: null }, error: null }),
    setSession: async () => ({ data: { session: null }, error: null }),
  },
} as unknown as SupabaseClient;

let supabaseClient: SupabaseClient;
try {
  supabaseClient = isConfigured 
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : dummyClient;
} catch {
  supabaseClient = dummyClient;
}

export const supabase: SupabaseClient = supabaseClient;
export const isSupabaseConfigured = isConfigured;

export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/#/auth/callback`,
    },
  });
  return { error };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
