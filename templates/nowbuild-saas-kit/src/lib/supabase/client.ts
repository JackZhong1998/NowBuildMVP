'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabasePublicConfig } from './config';

export function createBrowserSupabase() {
  const { url, key } = supabasePublicConfig();
  if (!url || !key) throw new Error('Supabase is not configured');
  return createBrowserClient(url, key);
}
