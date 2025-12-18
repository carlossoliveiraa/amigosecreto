import { createClient } from '@supabase/supabase-js';

// Client-side Supabase instance. Do NOT use the service role key in the frontend.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
