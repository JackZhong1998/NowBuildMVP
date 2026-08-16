import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import SupabaseAuthForm from '@/components/auth/SupabaseAuthForm';

type Props = {
  params: Promise<{ locale: string }>;
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

export default async function SignInPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SupabaseAuthForm mode="sign-in" locale={locale === 'zh' ? 'zh' : 'en'} />;
}
