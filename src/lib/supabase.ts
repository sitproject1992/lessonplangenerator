import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const url = (import.meta as any).env.VITE_SUPABASE_URL;
  const key = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  return { url, key };
};

const config = getSupabaseConfig();

if (!config.url || !config.key) {
  console.warn('Supabase credentials missing. Please check your .env file.');
}

// Create client only if config is valid
export const supabase = config.url && config.key 
  ? createClient(config.url, config.key)
  : null;
