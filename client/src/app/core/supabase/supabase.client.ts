import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { env } from '../../../environments/environment';

// Singleton: prevents HMR from creating duplicate instances
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Completely bypass the Web Locks API to prevent the TimeoutError
        lock: <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => {
          return fn();
        }
      }
    });
  }
  return _client;
}

export const supabaseClient = getClient();
