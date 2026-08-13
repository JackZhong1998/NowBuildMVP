import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
  '/dashboard(.*)',
]);

async function handleRouting(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  const isRootPath = pathname === '/';
  const isStaticAsset = /\.[^/]+$/.test(pathname);
  const isApiRoute = pathname.startsWith('/api');
  const isProjectPreview = pathname.startsWith('/p/');

  if (isApiRoute || isProjectPreview) {
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

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkConfigured = Boolean(clerkKey && !clerkKey.includes('xxxxx'));

export default clerkConfigured
  ? clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        const { userId } = await auth();
        if (!userId) {
          const locale = routing.locales.find((value) => request.nextUrl.pathname === `/${value}` || request.nextUrl.pathname.startsWith(`/${value}/`)) || routing.defaultLocale;
          const signIn = new URL(`/${locale}/sign-in`, request.url);
          signIn.searchParams.set('redirect_url', `${request.nextUrl.pathname}${request.nextUrl.search}`);
          return NextResponse.redirect(signIn);
        }
      }
      return handleRouting(request);
    })
  : handleRouting;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
