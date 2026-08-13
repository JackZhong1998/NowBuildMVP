import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PricingPageClient from '@/components/pricing/PricingPageClient';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata.pricing' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/pricing`,
      languages: { en: '/en/pricing', zh: '/zh/pricing' },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `/${locale}/pricing`,
      type: 'website',
    },
    twitter: {
      title: t('title'),
      description: t('description'),
      card: 'summary_large_image',
    },
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PricingPageClient />;
}
