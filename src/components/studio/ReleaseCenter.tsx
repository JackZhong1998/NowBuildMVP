'use client';

import type { ProjectLaunchState, ProjectSession, ProjectTestingState } from '@/lib/nowbuild/types';

export type EnvironmentReadiness = {
  supabaseReady: boolean;
  paymentsReady: boolean;
  paymentsProductionReady: boolean;
  deployReady: boolean;
};

function CheckRow({ done, title, note, action, onAction }: { done: boolean; title: string; note: string; action?: string; onAction?: () => void }) {
  return <li className="flex items-start gap-3 border-b border-black/6 py-4 last:border-0">
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{done ? '✓' : '!'}</span>
    <div className="min-w-0 flex-1"><div className="text-sm font-bold">{title}</div><p className="mt-1 text-[11px] leading-5 text-black/45">{note}</p></div>
    {!done && action && onAction && <button type="button" onClick={onAction} className="shrink-0 rounded-lg border border-black/10 px-3 py-2 text-[10px] font-bold hover:bg-black/[.03]">{action}</button>}
  </li>;
}

export default function ReleaseCenter({
  locale,
  project,
  testing,
  environment,
  launch,
  publishing,
  onConfigure,
  onReturnToTesting,
  onPublish,
  onLaunchChange,
}: {
  locale: 'zh' | 'en';
  project: ProjectSession | null;
  testing: ProjectTestingState | null;
  environment: EnvironmentReadiness | null;
  launch: ProjectLaunchState | null;
  publishing: boolean;
  onConfigure: (provider: 'supabase' | 'stripe' | 'vercel') => void;
  onReturnToTesting: () => void;
  onPublish: () => void;
  onLaunchChange: (next: ProjectLaunchState) => void;
}) {
  const zh = locale === 'zh';
  const testReady = testing?.status === 'passed';
  const supabaseReady = Boolean(environment?.supabaseReady);
  const stripeReady = Boolean(environment?.paymentsReady);
  const vercelReady = Boolean(environment?.deployReady);
  const preflightReady = Boolean(project?.result && testReady && supabaseReady && stripeReady && vercelReady);
  const productionUrl = project?.deployment?.url;
  const redirectUrl = productionUrl ? `${productionUrl}/auth/confirm` : '';
  const webhookUrl = productionUrl ? `${productionUrl}/api/webhooks/stripe` : '';
  const externalSetupReady = Boolean(productionUrl && launch?.supabaseRedirectConfirmed && launch?.stripeWebhookConfirmed && environment?.paymentsProductionReady);
  const productionReady = Boolean(externalSetupReady && launch?.productionEnvironmentSynced);

  function updateLaunch(update: Partial<ProjectLaunchState>) {
    onLaunchChange({ ...launch, ...update, updatedAt: new Date().toISOString() });
  }

  return <section className="h-full min-h-[720px] overflow-auto rounded-2xl bg-[#f7f7f4] p-5 sm:p-8" aria-labelledby="release-title">
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.15em] text-[#5b4bd9]">Release center</div>
          <h1 id="release-title" className="mt-2 text-3xl font-black tracking-[-.04em]">{zh ? '把测试通过的产品发布上线' : 'Publish the tested product'}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/50">{zh ? '先完成核心流程验收，再连接 Supabase、Stripe 和 Vercel。首次部署后还要补充登录回调和支付 Webhook。' : 'Complete acceptance testing, connect the three required services, then finish redirects and webhooks after the first deployment.'}</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${productionReady ? 'bg-emerald-100 text-emerald-800' : productionUrl ? 'bg-blue-100 text-blue-800' : 'bg-black/5 text-black/45'}`}>{productionReady ? '● LIVE READY' : productionUrl ? '● DEPLOYED · SETUP NEEDED' : 'PRE-LAUNCH'}</span>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-black/8 bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">{zh ? '发布前检查' : 'Preflight checklist'}</h2><span className="text-[10px] font-bold text-black/35">{[testReady, supabaseReady, stripeReady, vercelReady].filter(Boolean).length}/4</span></div>
          <ul className="mt-2">
            <CheckRow done={Boolean(testReady)} title={zh ? '核心流程已人工测试' : 'Core flow manually tested'} note={zh ? '构建通过不等于业务体验正确，需要完成测试清单。' : 'A successful build still needs human acceptance.'} action={zh ? '返回测试' : 'Test now'} onAction={onReturnToTesting} />
            <CheckRow done={supabaseReady} title="Supabase" note={zh ? 'Project URL、Publishable Key 和服务端 Secret Key。' : 'Project URL, publishable key, and server secret key.'} action={zh ? '配置' : 'Configure'} onAction={() => onConfigure('supabase')} />
            <CheckRow done={stripeReady} title="Stripe" note={zh ? 'Test Mode API Keys，以及月付、年付 Price ID。' : 'Test-mode API keys plus monthly and yearly Price IDs.'} action={zh ? '配置' : 'Configure'} onAction={() => onConfigure('stripe')} />
            <CheckRow done={vercelReady} title="Vercel" note={zh ? 'Access Token；发布到团队时还需要 Team ID。' : 'Access token, plus Team ID for team deployments.'} action={zh ? '配置' : 'Configure'} onAction={() => onConfigure('vercel')} />
          </ul>
        </div>

        <aside className="rounded-2xl bg-[#171816] p-5 text-white">
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-white/40">{zh ? '下一步' : 'Next action'}</div>
          <h2 className="mt-3 text-xl font-black">{productionUrl ? (zh ? '完成生产环境设置' : 'Finish production setup') : preflightReady ? (zh ? '创建 Vercel 生产部署' : 'Create the Vercel deployment') : (zh ? '先完成左侧缺失项目' : 'Complete the missing items')}</h2>
          <p className="mt-3 text-xs leading-5 text-white/55">{productionUrl ? (zh ? 'Vercel 已返回正式网址。现在把这个网址登记到 Supabase 和 Stripe。' : 'Use the production URL in Supabase and Stripe.') : (zh ? 'NowBuild 会上传当前验证通过的源码，并同步项目运行变量。' : 'NowBuild uploads the validated source and syncs runtime variables.')}</p>
          {!productionUrl && <button type="button" onClick={onPublish} disabled={!preflightReady || publishing} className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-25">{publishing ? (zh ? '正在上传、构建并等待 Vercel…' : 'Uploading and building…') : (zh ? '发布到 Vercel →' : 'Publish to Vercel →')}</button>}
          {!preflightReady && !productionUrl && <p className="mt-3 text-[10px] leading-4 text-white/35">{zh ? '缺失配置不会在发布时才报错；完成检查后按钮会自动启用。' : 'The button enables automatically when preflight is complete.'}</p>}
        </aside>
      </div>

      {project?.deployment?.error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"><b>{zh ? '发布失败：' : 'Publish failed: '}</b>{project.deployment.error}</div>}

      {productionUrl && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-700">Production URL</div><a href={productionUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-black text-emerald-950 underline decoration-emerald-300">{productionUrl}</a></div>
          <span className="w-fit rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-emerald-800">Vercel deployment ready</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-4">
            <div className="text-xs font-black">1. Supabase Redirect URL</div>
            <p className="mt-2 text-[10px] leading-4 text-black/50">{zh ? `在 Authentication → URL Configuration 中把 Site URL 设为 ${productionUrl}，并加入下面的 Redirect URL：` : `Set Site URL to ${productionUrl}, then add this Redirect URL:`}</p>
            <code className="mt-2 block break-all rounded-lg bg-black/[.04] p-2 text-[10px]">{redirectUrl}</code>
            <label className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-black/60"><input type="checkbox" checked={Boolean(launch?.supabaseRedirectConfirmed)} onChange={(event) => updateLaunch({ supabaseRedirectConfirmed: event.target.checked })} className="mt-0.5" />{zh ? '我已添加并保存该回调地址' : 'I added and saved this redirect URL'}</label>
          </div>
          <div className="rounded-xl bg-white p-4">
            <div className="text-xs font-black">2. Stripe Webhook</div>
            <p className="mt-2 text-[10px] leading-4 text-black/50">{zh ? '在 Stripe Workbench → Webhooks 创建 endpoint，然后把 Signing secret 填回配置。' : 'Create the endpoint in Workbench → Webhooks, then save its signing secret.'}</p>
            <code className="mt-2 block break-all rounded-lg bg-black/[.04] p-2 text-[10px]">{webhookUrl}</code>
            {!environment?.paymentsProductionReady && <button type="button" onClick={() => onConfigure('stripe')} className="mt-3 rounded-lg border border-black/10 px-3 py-2 text-[10px] font-bold">{zh ? '填写 Webhook Secret' : 'Add webhook secret'}</button>}
            <label className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-black/60"><input type="checkbox" checked={Boolean(launch?.stripeWebhookConfirmed)} onChange={(event) => updateLaunch({ stripeWebhookConfirmed: event.target.checked })} className="mt-0.5" />{zh ? '我已创建 Webhook 并保存 Signing secret' : 'I created the webhook and saved its secret'}</label>
          </div>
        </div>
        {externalSetupReady && !launch?.productionEnvironmentSynced && <button type="button" onClick={onPublish} disabled={publishing} className="mt-4 w-full rounded-xl bg-[#171816] px-4 py-3 text-sm font-black text-white disabled:opacity-40">{publishing ? (zh ? '正在同步最终配置…' : 'Syncing final settings…') : (zh ? '同步最终配置并重新部署 →' : 'Sync final settings and redeploy →')}</button>}
        <div className={`mt-4 rounded-xl p-4 text-xs font-bold ${productionReady ? 'bg-emerald-800 text-white' : 'bg-amber-100 text-amber-950'}`}>{productionReady ? (zh ? '✓ 发布配置完成，产品可以开始接受真实用户。' : '✓ Launch setup is complete.') : externalSetupReady ? (zh ? '最后一步：把 Webhook Secret 同步到 Vercel 生产环境。' : 'Final step: sync the webhook secret to Vercel.') : (zh ? '完成上面两项后，再同步最终生产配置。' : 'Complete both items, then sync the final production settings.')}</div>
      </div>}
    </div>
  </section>;
}
