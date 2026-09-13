import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const noopAuth = {
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured') }),
  signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured') }),
  signOut: async () => ({ error: null }),
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  updateUser: async (data: any) => ({ data: { user: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
};

const createSupabaseClient = () => {
  if (!hasSupabaseConfig) {
    return { auth: noopAuth } as const;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createSupabaseClient();

export const createServerSupabase = () => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return createClient(
    process.env.SUPABASE_URL || supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};
