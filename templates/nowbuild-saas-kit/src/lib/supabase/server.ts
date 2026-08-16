import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabasePublicConfig } from './config';

export async function createServerSupabase() {
  const { url, key } = supabasePublicConfig();
  if (!url || !key) throw new Error('Supabase is not configured');
  const store = await cookies();
  return createServerClient(url, key, { cookies: {
    getAll: () => store.getAll(),
    setAll: (values) => {
      try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
      catch { /* Middleware refreshes sessions when Server Components cannot write. */ }
    },
  } });
}
