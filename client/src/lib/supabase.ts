import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(rawUrl: string | undefined): string {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  // Accept either project root URL or REST endpoint URL in env config.
  return value.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are not configured');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

// Helper functions for common operations
export async function uploadFile(bucket: string, path: string, file: File) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file);
  
  if (error) throw error;
  return data;
}

export async function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
