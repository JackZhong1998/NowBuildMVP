import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Hero from '@/components/landing/Hero';
import FeatureComparison from '@/components/landing/FeatureComparison';
import FeatureHighlights from '@/components/landing/FeatureHighlights';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import { buildAbsoluteUrl, getBaseUrl, getSiteName } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata.home' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: { en: '/en', zh: '/zh' },
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'FAQ' });
  const faqItems = Array.from({ length: 6 }, (_, i) => ({
    question: t(`items.${i}.question`),
    answer: t(`items.${i}.answer`),
  }));

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const orgStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: getSiteName(),
    url: getBaseUrl(),
    logo: buildAbsoluteUrl('/logo.png'),
    sameAs: [],
  };

  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: getSiteName(),
    url: getBaseUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: buildAbsoluteUrl(`/${locale}/blog?q={search_term_string}`),
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <Navbar />
      <main>
        <Hero />
        <FeatureComparison />
        <FeatureHighlights />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
