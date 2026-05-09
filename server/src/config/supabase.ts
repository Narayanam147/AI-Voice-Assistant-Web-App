import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from './env';

let client: SupabaseClient | null = null;

export const getSupabaseClient = () => {
  if (!client) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    client = createClient(env.SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
};
