import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient(authHeader) {
  // const jwt = authHeader?.replace(/^Bearer\s+/i, '');

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: authHeader || '',
        }
      }
    }
  );
}