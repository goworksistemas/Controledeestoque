import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

/**
 * Supabase Client Singleton
 * 
 * IMPORTANT: Use this instance everywhere in the app to avoid
 * "Multiple GoTrueClient instances" warnings
 * 
 * Usage:
 * import { supabase } from './utils/supabase/client';
 */
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Use PKCE flow for better security and compatibility
      flowType: 'pkce',
      // Use a consistent storage key
      storageKey: 'supabase-auth-token',
    },
  }
);