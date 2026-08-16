import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next');
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/en/dashboard';
  const basePath = process.env.NOWBUILD_PREVIEW_BASE_PATH || '';
  if (code) {
    const result = await (await createServerSupabase()).auth.exchangeCodeForSession(code);
    if (!result.error) return NextResponse.redirect(new URL(basePath + destination, url.origin));
  }
  return NextResponse.redirect(new URL(basePath + '/en/sign-in?error=confirmation_failed', url.origin));
}
