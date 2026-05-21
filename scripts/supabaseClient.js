import { createClient } from '@supabase/supabase-js';

const viteSupabaseUrl = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_URL
  : undefined;
const viteSupabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : undefined;

const supabaseUrl = typeof viteSupabaseUrl === 'string' ? viteSupabaseUrl.trim() : '';
const supabaseAnonKey = typeof viteSupabaseAnonKey === 'string' ? viteSupabaseAnonKey.trim() : '';

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL' || !/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error(
    'Invalid or missing VITE_SUPABASE_URL. In your .env file, set VITE_SUPABASE_URL=https://your-project-id.supabase.co'
  );
}
if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  throw new Error(
    'Invalid or missing VITE_SUPABASE_ANON_KEY. In your .env file, set VITE_SUPABASE_ANON_KEY=your-public-anon-key'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);