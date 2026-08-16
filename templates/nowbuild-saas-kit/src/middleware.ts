import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { isSupabaseConfigured, supabasePublicConfig } from '@/lib/supabase/config';

const handleI18nRouting = createMiddleware(routing);

const isProtectedRoute = (pathname: string) => routing.locales.some((locale) => pathname.startsWith(`/${locale}/dashboard`)) || pathname.startsWith('/dashboard');

async function route(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  const isRootPath = pathname === '/';
  const isStaticAsset = /\.[^/]+$/.test(pathname);
  const isApiRoute = pathname.startsWith('/api') || pathname.startsWith('/auth/');

  if (isApiRoute) {
    return NextResponse.next();
  }

  // Internally rewrite routes like /pricing to /en/pricing while keeping the URL.
  if (!hasLocalePrefix && !isRootPath && !isStaticAsset) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${routing.defaultLocale}${pathname}`;
    rewriteUrl.search = search;
    return NextResponse.rewrite(rewriteUrl);
  }

  return handleI18nRouting(request);
}

export default async function middleware(request: NextRequest) {
  let authResponse = NextResponse.next({ request });
  let user = null;
  if (isSupabaseConfigured()) {
    const { url, key } = supabasePublicConfig();
    const supabase = createServerClient(url, key, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        authResponse = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => authResponse.cookies.set(name, value, options));
      },
    } });
    user = (await supabase.auth.getUser()).data.user;
  }
  if (isSupabaseConfigured() && isProtectedRoute(request.nextUrl.pathname) && !user) {
    const locale = routing.locales.find((item) => request.nextUrl.pathname.startsWith(`/${item}/`)) || routing.defaultLocale;
    const signIn = new URL(`/${locale}/sign-in`, request.url);
    signIn.searchParams.set('redirect_url', request.nextUrl.pathname + request.nextUrl.search);
    const response = NextResponse.redirect(signIn);
    authResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }
  const response = await route(request);
  authResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
