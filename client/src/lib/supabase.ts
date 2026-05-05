import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1/', '') || '';
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
      // Refresh token 60 seconds before expiry to avoid race conditions
      shouldRefreshToken: (expiresAt: number) => {
        const expiryMs = expiresAt * 1000;
        const nowMs = Date.now();
        const refreshThresholdMs = 60 * 1000; // 60 seconds before expiry
        return expiryMs - nowMs < refreshThresholdMs;
      },
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
