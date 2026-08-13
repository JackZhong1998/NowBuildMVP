import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getServiceSupabase } from '@/lib/supabase';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import BillingPortalButton from '@/components/BillingPortalButton';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export default async function DashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { payment } = await searchParams;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  const t = await getTranslations({ locale, namespace: 'Common' });
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        {locale === 'zh' ? '产品工作台' : 'Product Dashboard'}
      </h1>
      <p className="mt-3 text-gray-600">
        {locale === 'zh'
          ? '你已经进入产品内页。这里可作为登录后主工作区的起点。'
          : 'You are now inside the product. This page can be your post-login workspace.'}
      </p>

      {payment === 'success' && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          {locale === 'zh'
            ? '支付已完成，正在同步订阅状态。如果你刚完成支付，请等待几秒再刷新。'
            : 'Payment completed. Subscription status is syncing. If this is a fresh payment, wait a few seconds and refresh.'}
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          {locale === 'zh' ? '当前订阅状态' : 'Current Subscription'}
        </h2>
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-medium">{locale === 'zh' ? '方案：' : 'Plan: '}</span>
            {data?.plan ?? (locale === 'zh' ? '未找到' : 'Not found')}
          </p>
          <p>
            <span className="font-medium">{locale === 'zh' ? '状态：' : 'Status: '}</span>
            {data?.status ?? (locale === 'zh' ? '未找到' : 'Not found')}
          </p>
          <p>
            <span className="font-medium">
              {locale === 'zh' ? '当前周期结束：' : 'Current period end: '}
            </span>
            {data?.current_period_end
              ? new Date(data.current_period_end).toLocaleString()
              : locale === 'zh'
                ? '暂无'
                : 'N/A'}
          </p>
        </div>
        {data?.stripe_customer_id && <BillingPortalButton locale={locale} />}
      </section>

      <a
        href={`/${locale}/pricing`}
        className="mt-8 inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {locale === 'zh' ? '返回定价页' : 'Back to pricing'}
      </a>

      <p className="mt-4 text-xs text-gray-500">{t('loading')}</p>
    </main>
  );
}
