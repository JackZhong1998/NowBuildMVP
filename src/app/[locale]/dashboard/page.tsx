import { redirect } from 'next/navigation';
import NowBuildStudio from '@/components/studio/NowBuildStudio';
import { getNowBuildUserId, isClerkConfigured } from '@/lib/nowbuild/auth';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ prompt?: string; project?: string }>;
};

export default async function DashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const userId = await getNowBuildUserId();
  if (!userId && isClerkConfigured()) {
    const target = `/${locale}/dashboard${query.prompt ? `?prompt=${encodeURIComponent(query.prompt)}` : query.project ? `?project=${encodeURIComponent(query.project)}` : ''}`;
    redirect(`/${locale}/sign-in?redirect_url=${encodeURIComponent(target)}`);
  }
  return <NowBuildStudio locale={locale === 'zh' ? 'zh' : 'en'} initialPrompt={query.prompt || ''} initialProjectId={query.project || ''} />;
}
