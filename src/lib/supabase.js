import { createClient } from '@supabase/supabase-js';

// Trim whitespace and any trailing slash. A trailing slash makes the client
// build requests like ".../auth/v1//signup", which the Supabase gateway
// rejects with "Invalid path specified in request URL".
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const url = rawUrl.replace(/\/+$/, '');
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// If env vars are missing we still create a client object so imports don't
// crash; calls will fail with a clear message and the UI flags configuration.
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
);
