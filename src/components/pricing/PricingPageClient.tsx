'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';

export default function PricingPageClient() {
  const t = useTranslations('Pricing');
  const locale = useLocale();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const plans = ['free', 'pro', 'enterprise'] as const;

  async function handleSubscribe(plan: string) {
    if (plan === 'free') return;
    if (plan === 'enterprise') {
      window.location.href = 'mailto:sales@nowbuild.com';
      return;
    }
    setLoadingPlan(plan);
    setCheckoutError(null);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle, locale }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Checkout request failed:', response.status, errorText);
        setCheckoutError(t('checkoutError'));
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const errorText = await response.text();
        console.error('Checkout response is not JSON:', errorText);
        setCheckoutError(t('checkoutError'));
        return;
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      setCheckoutError(t('checkoutError'));
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                {t('title')}
              </h1>
              <p className="mt-4 text-lg text-gray-500">{t('subtitle')}</p>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-gray-100 p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('monthly')}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('yearly')}
                  <span className="ml-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {t('yearlyDiscount')}
                  </span>
                </button>
              </div>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3">
              {plans.map((planKey) => {
                const isPro = planKey === 'pro';
                const price = billingCycle === 'monthly'
                  ? t(`plans.${planKey}.priceMonthly`)
                  : t(`plans.${planKey}.priceYearly`);
                const period = billingCycle === 'monthly' ? t('perMonth') : t('perYear');

                const rawFeatures = t.raw(`plans.${planKey}.features`);
                const features = Array.isArray(rawFeatures)
                  ? rawFeatures.filter((item): item is string => typeof item === 'string')
                  : [];

                return (
                  <div
                    key={planKey}
                    className={`relative flex flex-col rounded-2xl border p-8 transition-shadow hover:shadow-lg ${
                      isPro
                        ? 'border-primary-200 bg-primary-50/30 shadow-lg ring-2 ring-primary-600'
                        : 'border-gray-200 bg-white shadow-sm'
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white">
                        {t('mostPopular')}
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="font-display text-xl font-bold text-gray-900">
                        {t(`plans.${planKey}.name`)}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {t(`plans.${planKey}.description`)}
                      </p>
                    </div>

                    <div className="mb-8">
                      <span className="font-display text-4xl font-bold text-gray-900">{price}</span>
                      {planKey !== 'enterprise' && (
                        <span className="text-base text-gray-500">{period}</span>
                      )}
                    </div>

                    <ul className="mb-8 flex-1 space-y-3.5">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSubscribe(planKey)}
                      disabled={loadingPlan !== null}
                      className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                        isPro
                          ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {loadingPlan === planKey ? t('processing') : planKey === 'free'
                        ? t('getStarted')
                        : planKey === 'enterprise'
                        ? t('contactSales')
                        : t('subscribe')}
                    </button>
                  </div>
                );
              })}
            </div>
            {checkoutError && <p role="alert" className="mx-auto mt-6 max-w-xl text-center text-sm text-red-600">{checkoutError}</p>}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
