export function supabasePublicConfig() {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    key: (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
  };
}

export function isSupabaseConfigured() {
  const { url, key } = supabasePublicConfig();
  return Boolean(url && key && !url.includes('xxxxx') && !key.includes('xxxxx'));
}
