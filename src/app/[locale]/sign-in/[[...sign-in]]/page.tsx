import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect_url?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'zh' ? '登录' : 'Sign In',
    description: locale === 'zh' ? '登录您的账户。' : 'Sign in to your account.',
    alternates: {
      canonical: `/${locale}/sign-in`,
      languages: { en: '/en/sign-in', zh: '/zh/sign-in' },
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default async function SignInPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const requested = String(query.redirect_url || '');
  const redirectUrl = requested.startsWith(`/${locale}/`) ? requested : `/${locale}/dashboard`;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <SignIn
        forceRedirectUrl={redirectUrl}
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl border border-gray-100 rounded-2xl',
          },
        }}
      />
    </div>
  );
}
