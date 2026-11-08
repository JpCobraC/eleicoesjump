import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '');

let authBlocked = false;

export const markSupabaseAuthFailed = () => {
  if (!authBlocked) {
    authBlocked = true;
    console.warn(
      'Aviso: Chave anon do Supabase retornou 401 Unauthorized (chave incorreta ou JWT expirado). O sistema continuará operando normalmente em modo local.'
    );
  }
};

export const isSupabaseConfigured = (): boolean => {
  if (authBlocked) return false;
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    !supabaseUrl.includes('seu-projeto') &&
    supabaseAnonKey !== 'sua-chave-anonima-aqui' &&
    supabaseAnonKey !== 'sua-chave-anon-publica-aqui' &&
    supabaseAnonKey.length > 40
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

