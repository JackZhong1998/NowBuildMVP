import 'server-only';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { styleCatalogById } from './style-catalog';
import type { ProjectBrief, ProjectPlan } from './types';

function literal(value: unknown) {
  return JSON.stringify(value);
}

function landingPage(brief: ProjectBrief, plan?: ProjectPlan) {
  const profile = styleCatalogById[brief.style];
  const theme = profile.theme;
  const centered = profile.preview.align === 'center';
  const poster = profile.preview.motif === 'raw' || profile.preview.motif === 'shapes';
  const atmosphericBackground = profile.preview.motif === 'gradient' || profile.preview.motif === 'glass'
    ? `radial-gradient(circle at 82% 10%, ${theme.accent}55, transparent 34%), linear-gradient(135deg, ${theme.bg}, ${theme.surface})`
    : profile.preview.motif === 'dark-grid' || profile.preview.motif === 'grid' || profile.preview.motif === 'mono'
      ? `linear-gradient(${theme.muted}16 1px, transparent 1px), linear-gradient(90deg, ${theme.muted}16 1px, transparent 1px)`
      : `linear-gradient(135deg, ${theme.bg}, ${theme.surface})`;
  const backgroundSize = ['dark-grid', 'grid', 'mono'].includes(profile.preview.motif) ? '64px 64px' : 'cover';
  const name = literal(brief.name);
  const idea = literal(brief.idea);
  const audience = literal(brief.audience);
  const feature = literal(brief.coreFeature);
  const marketing = literal(plan ? { copy: plan.copy, seo: plan.seo } : null);
  return `import type { Metadata } from 'next';

type MarketingPlan = {
  copy: { eyebrow: string; headline: string; subheadline: string; cta: string; secondaryCta: string; problemTitle: string; problemBody: string };
  seo: { title: string; description: string; canonical: string };
};

const product = { name: ${name}, idea: ${idea}, audience: ${audience}, feature: ${feature} };
const marketing = JSON.parse(${literal(marketing)}) as MarketingPlan | null;

export const metadata: Metadata = {
  title: marketing?.seo.title || product.name + ' — ' + product.idea,
  description: marketing?.seo.description || product.idea + '，专为' + product.audience + '打造。',
  alternates: { canonical: marketing?.seo.canonical || '/${brief.locale}' },
  openGraph: { title: marketing?.seo.title || product.name, description: marketing?.seo.description || product.idea, type: 'website' },
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale === 'zh';
  const copy = zh ? {
    badge: '从今天开始，少做重复工作', cta: '免费开始', demo: '进入产品',
    trusted: '内置登录 · 支付 · 数据库 · SEO', problem: '真正影响结果的，不该是繁琐流程。',
    problemBody: '把零散步骤收进一条清晰路径，让团队更快获得结果，并持续知道下一步做什么。',
    how: '从输入到结果，只需三步', faq: '常见问题', final: '准备好完成第一步了吗？'
  } : {
    badge: 'Spend less time on repeat work', cta: 'Start free', demo: 'Open product',
    trusted: 'Auth · Payments · Database · SEO included', problem: 'Busywork should never stand between you and the outcome.',
    problemBody: 'Bring scattered steps into one clear workflow, get results faster, and always know what comes next.',
    how: 'From input to outcome in three steps', faq: 'Questions, answered', final: 'Ready to get your first result?'
  };
  if (marketing?.copy) Object.assign(copy, { badge: marketing.copy.eyebrow, cta: marketing.copy.cta, demo: marketing.copy.secondaryCta, problem: marketing.copy.problemTitle, problemBody: marketing.copy.problemBody });
  const steps = zh ? ['告诉我们你要完成什么', '由产品工作流处理核心任务', '检查结果并继续迭代'] : ['Describe the outcome', 'Run the focused product workflow', 'Review and iterate'];
  const faqs = zh ? [
    ['需要安装软件吗？', '不需要。登录后即可在浏览器使用。'],
    ['可以先免费试用吗？', '可以。先完成一次核心流程，再决定是否购买。'],
    ['我的数据安全吗？', '账户数据通过受控服务保存，业务草稿默认仅保存在当前会话。']
  ] : [
    ['Do I need to install anything?', 'No. Sign in and use the product in your browser.'],
    ['Can I try it first?', 'Yes. Complete the core flow before deciding to pay.'],
    ['Is my data safe?', 'Account data uses managed storage; product drafts stay in the current session by default.']
  ];
  return <main style={{ background: '${theme.bg}', backgroundImage: '${atmosphericBackground}', backgroundSize: '${backgroundSize}', color: '${theme.ink}', minHeight: '100vh' }}>
    <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
      <a href={'/' + locale} className="text-lg font-black tracking-[-.04em]">{product.name}</a>
      <nav className="flex items-center gap-2 text-sm"><a href={'/' + locale + '/pricing'} className="hidden rounded-full px-4 py-2 sm:block">{zh ? '定价' : 'Pricing'}</a><a href={'/' + locale + '/sign-in'} className="rounded-full border px-4 py-2" style={{ borderColor: '${theme.muted}55' }}>{zh ? '登录' : 'Sign in'}</a></nav>
    </header>
    <section className="mx-auto ${centered ? 'block text-center' : 'grid lg:grid-cols-[1.1fr_.9fr]'} max-w-7xl gap-14 px-5 pb-24 pt-16 sm:px-8 lg:pb-32 lg:pt-24">
      <div className="${centered ? 'mx-auto max-w-5xl' : ''}"><div className="inline-flex rounded-full border px-3 py-1.5 text-xs font-bold" style={{ borderColor: '${theme.accent}88', color: '${theme.accent}' }}>{copy.badge}</div><div className="mt-5 text-[10px] font-black uppercase tracking-[.22em]" style={{ color: '${theme.muted}' }}>${profile.inspiration} · ${profile.name}</div><h1 className="mt-5 ${poster ? 'sm:text-8xl lg:text-9xl' : 'sm:text-7xl'} max-w-5xl text-5xl font-black leading-[.88] tracking-[-.075em] ${centered ? 'mx-auto' : ''}">{marketing?.copy.headline || product.idea}</h1><p className="mt-7 ${centered ? 'mx-auto' : ''} max-w-2xl text-lg leading-8" style={{ color: '${theme.muted}' }}>{marketing?.copy.subheadline || ((zh ? '专为' : 'Built for ') + product.audience + (zh ? '，把最重要的工作变成简单、可靠、可重复的产品体验。' : '—turning important work into a simple, reliable, repeatable product experience.'))}</p><div className="mt-9 flex flex-col gap-3 sm:flex-row ${centered ? 'justify-center' : ''}"><a href={'/' + locale + '/sign-up'} className="rounded-[${theme.radius}] px-6 py-3.5 text-center text-sm font-black" style={{ background: '${theme.accent}', color: '${theme.accentInk}' }}>{copy.cta} →</a><a href={'/' + locale + '/dashboard'} className="rounded-[${theme.radius}] border px-6 py-3.5 text-center text-sm font-bold" style={{ borderColor: '${theme.muted}55' }}>{copy.demo}</a></div><div className="mt-12 text-xs font-semibold" style={{ color: '${theme.muted}' }}>{copy.trusted}</div></div>
      <div className="${centered ? 'mx-auto mt-16 max-w-3xl -rotate-1' : 'self-center'} rounded-[${theme.radius}] border p-3 shadow-2xl" style={{ background: '${theme.surface}', borderColor: '${theme.muted}33' }}><div className="flex items-center gap-2 border-b p-3" style={{ borderColor: '${theme.muted}22' }}><span className="h-2.5 w-2.5 rounded-full bg-red-400"/><span className="h-2.5 w-2.5 rounded-full bg-yellow-400"/><span className="h-2.5 w-2.5 rounded-full bg-green-400"/><span className="ml-3 text-xs" style={{ color: '${theme.muted}' }}>app.{product.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com</span></div><div className="p-5 sm:p-7"><div className="text-xs font-bold uppercase tracking-[.15em]" style={{ color: '${theme.accent}' }}>{zh ? '核心工作流' : 'Core workflow'}</div><div className="mt-4 text-2xl font-black leading-tight">{product.feature}</div><div className="mt-8 space-y-3">{steps.map((step, index) => <div key={step} className="flex items-center gap-3 rounded-[${theme.radius}] border p-3 text-sm" style={{ borderColor: '${theme.muted}22' }}><span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black" style={{ background: '${theme.accent}', color: '${theme.accentInk}' }}>{index + 1}</span>{step}</div>)}</div></div></div>
    </section>
    <section className="border-y" style={{ background: '${theme.surface}', borderColor: '${theme.muted}22' }}><div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2"><h2 className="text-3xl font-black leading-tight tracking-[-.04em] sm:text-5xl">{copy.problem}</h2><div><p className="text-lg leading-8" style={{ color: '${theme.muted}' }}>{copy.problemBody}</p><div className="mt-8 grid grid-cols-3 gap-3">{['10×', '24/7', '1 flow'].map((value) => <div key={value} className="rounded-[${theme.radius}] border p-4 text-center" style={{ borderColor: '${theme.muted}22' }}><div className="text-xl font-black">{value}</div><div className="mt-1 text-[10px] uppercase" style={{ color: '${theme.muted}' }}>{zh ? '更清晰' : 'clarity'}</div></div>)}</div></div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8"><div className="text-xs font-black uppercase tracking-[.15em]" style={{ color: '${theme.accent}' }}>{copy.how}</div><div className="mt-8 grid gap-4 md:grid-cols-3">{steps.map((step, index) => <div key={step} className="rounded-[${theme.radius}] border p-6" style={{ borderColor: '${theme.muted}2f' }}><div className="text-sm font-black" style={{ color: '${theme.accent}' }}>0{index + 1}</div><h3 className="mt-10 text-xl font-black">{step}</h3><p className="mt-3 text-sm leading-6" style={{ color: '${theme.muted}' }}>{index === 1 ? product.feature : (zh ? '无需复杂设置，保持注意力在真正重要的结果上。' : 'No complex setup—keep your attention on the outcome that matters.')}</p></div>)}</div></section>
    <section className="mx-auto max-w-4xl px-5 py-20 sm:px-8"><h2 className="text-center text-3xl font-black">{copy.faq}</h2><div className="mt-9 divide-y" style={{ borderColor: '${theme.muted}22' }}>{faqs.map(([q, a]) => <details key={q} className="py-5"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 text-sm leading-6" style={{ color: '${theme.muted}' }}>{a}</p></details>)}</div></section>
    <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8"><div className="rounded-[${theme.radius}] p-8 text-center sm:p-14" style={{ background: '${theme.accent}', color: '${theme.accentInk}' }}><h2 className="text-3xl font-black tracking-[-.04em] sm:text-5xl">{copy.final}</h2><p className="mx-auto mt-4 max-w-xl opacity-75">{product.feature}</p><a href={'/' + locale + '/sign-up'} className="mt-8 inline-flex rounded-full bg-black px-6 py-3 text-sm font-black text-white">{copy.cta} →</a></div></section>
    <footer className="border-t px-5 py-8 text-center text-xs" style={{ borderColor: '${theme.muted}22', color: '${theme.muted}' }}>© {new Date().getFullYear()} {product.name} · Privacy · Terms</footer>
  </main>;
}`;
}

function productComponent(brief: ProjectBrief, projectId: string, plan?: ProjectPlan) {
  const theme = styleCatalogById[brief.style].theme;
  const ai = plan?.ai || { enabled: false, capabilities: [], primaryUseCase: '', systemPrompt: '', outputContract: '' };
  return `/* eslint-disable @next/next/no-img-element */
'use client';
import { useState } from 'react';
import { runManagedAI } from '@/lib/nowbuild-ai';

const product = { name: ${literal(brief.name)}, idea: ${literal(brief.idea)}, feature: ${literal(brief.coreFeature)} };
const managedAI = ${literal(ai)};
const projectId = ${literal(projectId)};

export default function ProductWorkspace({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [input, setInput] = useState('');
  const [items, setItems] = useState<Array<{ id: number; title: string; status: string; output?: string; mediaUrl?: string }>>([
    { id: 1, title: product.feature, status: zh ? '示例结果' : 'Example result' }
  ]);
  const [active, setActive] = useState(1);
  const [running, setRunning] = useState(false);
  async function run() {
    if (!input.trim()) return;
    setRunning(true);
    const title = input.trim();
    try {
      if (managedAI.enabled && managedAI.capabilities.length) {
        const capability = managedAI.capabilities[0];
        const result = await runManagedAI({ projectId, capability, prompt: title, system: managedAI.systemPrompt });
        const next = { id: Date.now(), title, status: zh ? 'AI 已生成' : 'AI generated', output: result.output?.text || (result.output?.jobId ? (zh ? '视频任务已提交：' : 'Video job submitted: ') + result.output.jobId : ''), mediaUrl: result.output?.images?.[0]?.dataUrl || result.output?.audioUrl };
        setItems((current) => [next, ...current]); setActive(next.id);
      } else {
        const next = { id: Date.now(), title, status: zh ? '已完成' : 'Complete' };
        setItems((current) => [next, ...current]); setActive(next.id);
      }
      setInput('');
    } catch (error) {
      const next = { id: Date.now(), title, status: zh ? '生成失败' : 'Failed', output: error instanceof Error ? error.message : (zh ? '请稍后重试' : 'Please retry') };
      setItems((current) => [next, ...current]); setActive(next.id);
    } finally { setRunning(false); }
  }
  const current = items.find((item) => item.id === active) || items[0];
  return <main className="min-h-screen" style={{ background: '${theme.bg}', color: '${theme.ink}' }}>
    <header className="flex h-16 items-center justify-between border-b px-5" style={{ borderColor: '${theme.muted}22', background: '${theme.surface}' }}><a href={'/' + locale} className="font-black tracking-[-.04em]">{product.name}</a><div className="flex items-center gap-3 text-xs"><span style={{ color: '${theme.muted}' }}>240 credits</span><a href={'/' + locale + '/pricing'} className="rounded-full px-3 py-2 font-bold" style={{ background: '${theme.accent}', color: '${theme.accentInk}' }}>{zh ? '升级' : 'Upgrade'}</a></div></header>
    <div className="grid min-h-[calc(100vh-4rem)] md:grid-cols-[230px_1fr]">
      <aside className="border-r p-4" style={{ borderColor: '${theme.muted}22', background: '${theme.surface}' }}><button className="w-full rounded-[${theme.radius}] px-4 py-3 text-left text-sm font-black" style={{ background: '${theme.accent}', color: '${theme.accentInk}' }}>＋ {zh ? '新建任务' : 'New task'}</button><nav className="mt-6 space-y-1 text-sm"><div className="px-3 py-2 font-bold">⌂ {zh ? '工作区' : 'Workspace'}</div><div className="px-3 py-2" style={{ color: '${theme.muted}' }}>◫ {zh ? '历史记录' : 'History'}</div><div className="px-3 py-2" style={{ color: '${theme.muted}' }}>⚙ {zh ? '设置' : 'Settings'}</div></nav><div className="mt-8 text-[10px] font-bold uppercase tracking-[.13em]" style={{ color: '${theme.muted}' }}>{zh ? '最近结果' : 'Recent results'}</div><div className="mt-3 space-y-2">{items.map((item) => <button key={item.id} onClick={() => setActive(item.id)} className="w-full truncate rounded-lg p-2 text-left text-xs" style={{ background: active === item.id ? '${theme.accent}22' : 'transparent' }}>{item.title}</button>)}</div></aside>
      <section className="p-4 sm:p-8"><div className="mx-auto max-w-5xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-xs font-bold uppercase tracking-[.15em]" style={{ color: '${theme.accent}' }}>{zh ? '产品工作区' : 'Product workspace'}</div><h1 className="mt-2 text-3xl font-black tracking-[-.04em]">{product.idea}</h1><p className="mt-2 text-sm" style={{ color: '${theme.muted}' }}>{product.feature}</p></div><div className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: '${theme.muted}33' }}>● {zh ? '服务正常' : 'All systems ready'}</div></div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_320px]"><div><div className="rounded-[${theme.radius}] border p-5" style={{ background: '${theme.surface}', borderColor: '${theme.muted}22' }}><label className="text-xs font-bold">{zh ? '你想完成什么？' : 'What do you want to accomplish?'}</label><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={5} placeholder={product.feature} className="mt-3 w-full resize-none rounded-[${theme.radius}] border bg-transparent p-4 text-sm outline-none" style={{ borderColor: '${theme.muted}33' }} /><div className="mt-3 flex items-center justify-between"><span className="text-[10px]" style={{ color: '${theme.muted}' }}>{zh ? '草稿默认保存在当前会话' : 'Drafts stay in this session by default'}</span><button onClick={run} disabled={running || !input.trim()} className="rounded-[${theme.radius}] px-5 py-2.5 text-sm font-black disabled:opacity-40" style={{ background: '${theme.accent}', color: '${theme.accentInk}' }}>{running ? (zh ? '处理中…' : 'Working…') : (zh ? '运行核心功能 →' : 'Run workflow →')}</button></div></div>
          <div className="mt-5 rounded-[${theme.radius}] border p-5" style={{ background: '${theme.surface}', borderColor: '${theme.muted}22' }}><div className="flex items-center justify-between"><h2 className="font-black">{zh ? '当前结果' : 'Current result'}</h2><span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: '${theme.accent}22', color: '${theme.accent}' }}>{current.status}</span></div><div className="mt-5 rounded-[${theme.radius}] border p-5" style={{ borderColor: '${theme.muted}22' }}><div className="text-xs font-bold uppercase" style={{ color: '${theme.muted}' }}>{zh ? '输入' : 'Input'}</div><div className="mt-2 text-lg font-black">{current.title}</div>{current.mediaUrl && (current.mediaUrl.startsWith('data:audio') ? <audio controls className="mt-5 w-full" src={current.mediaUrl}/> : <img alt="AI generated result" className="mt-5 max-h-[480px] w-full rounded-xl object-cover" src={current.mediaUrl}/>)}{current.output && <div className="mt-5 whitespace-pre-wrap rounded-xl p-4 text-sm leading-6" style={{ background: '${theme.bg}' }}>{current.output}</div>}<div className="mt-6 grid gap-3 sm:grid-cols-3">{[zh ? '关键结论' : 'Key insight', zh ? '证据' : 'Evidence', zh ? '下一步' : 'Next step'].map((label, index) => <div key={label} className="rounded-lg p-3 text-xs" style={{ background: '${theme.bg}' }}><div className="font-bold" style={{ color: '${theme.accent}' }}>{label}</div><p className="mt-2 leading-5" style={{ color: '${theme.muted}' }}>{index === 0 ? product.idea : index === 1 ? product.feature : (zh ? '验证结果并继续下一轮。' : 'Review the result and run the next iteration.')}</p></div>)}</div></div></div></div>
          <aside className="space-y-4"><div className="rounded-[${theme.radius}] border p-5" style={{ background: '${theme.surface}', borderColor: '${theme.muted}22' }}><div className="text-xs font-bold" style={{ color: '${theme.muted}' }}>{zh ? '本周使用量' : 'Usage this week'}</div><div className="mt-2 text-3xl font-black">68%</div><div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: '${theme.muted}22' }}><div className="h-full w-[68%]" style={{ background: '${theme.accent}' }}/></div></div><div className="rounded-[${theme.radius}] border p-5" style={{ background: '${theme.surface}', borderColor: '${theme.muted}22' }}><h3 className="text-sm font-black">{zh ? '产品已具备' : 'Product foundation'}</h3><ul className="mt-4 space-y-3 text-xs" style={{ color: '${theme.muted}' }}>{['✓ Clerk Auth', '✓ Stripe Payments', '✓ Supabase Database', '✓ SEO & i18n'].map((item) => <li key={item}>{item}</li>)}</ul></div></aside></div>
      </div></section>
    </div>
  </main>;
}`;
}

function managedAIClient() {
  return `export type ManagedAICapability = 'text' | 'image' | 'video' | 'speech' | 'transcription' | 'music' | '3d';
export type ManagedAIResult = { output?: { text?: string; images?: Array<{ dataUrl: string }>; audioUrl?: string; jobId?: string; status?: string; urls?: string[] }; credits?: number; balance?: number; error?: string };

export async function runManagedAI(input: { projectId?: string; capability: ManagedAICapability; prompt?: string; system?: string; messages?: Array<{ role: 'user' | 'assistant'; content: string }>; options?: Record<string, unknown>; jobId?: string }): Promise<ManagedAIResult> {
  const response = await fetch('/api/nowbuild-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  const result = await response.json() as ManagedAIResult;
  if (!response.ok) throw new Error(result.error || 'AI generation failed');
  return result;
}`;
}

function managedAIProxyRoute() {
  return `export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  const gateway = process.env.NOWBUILD_AI_GATEWAY_URL;
  const token = process.env.NOWBUILD_AI_GATEWAY_TOKEN;
  const projectId = process.env.NOWBUILD_PROJECT_ID;
  if (!gateway || !token || !projectId) return Response.json({ error: 'NowBuild managed AI is available in preview; publish again to provision a deployment token.' }, { status: 503 });
  const input = await request.json();
  const response = await fetch(gateway, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, projectId }) });
  return new Response(response.body, { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' } });
}`;
}

function dashboardPage() {
  return `import { redirect } from 'next/navigation';
import ProductWorkspace from '@/components/generated/ProductWorkspace';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (clerkKey && !clerkKey.includes('xxxxx')) {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    if (!userId) redirect('/' + locale + '/sign-in');
  }
  return <ProductWorkspace locale={locale} />;
}`;
}

function authPage(mode: 'sign-in' | 'sign-up', brief: ProjectBrief, projectId: string) {
  const component = mode === 'sign-in' ? 'SignIn' : 'SignUp';
  const title = mode === 'sign-in' ? '登录' : '创建账户';
  return `/* eslint-disable @next/next/no-html-link-for-pages */
export default async function AuthPage() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key || key.includes('xxxxx')) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] p-6"><div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-black font-black text-white">${brief.name.slice(0, 1).toUpperCase()}</div><h1 className="mt-5 text-2xl font-black">${title} ${brief.name.replace(/</g, '')}</h1><p className="mt-3 text-sm leading-6 text-gray-500">登录功能已经接入，但这个项目还没有配置自己的 Clerk 测试 Key。预览不会借用 NowBuild 的账号，也不会显示报错页面。</p><a target="_top" href="/zh/dashboard?project=${projectId}" className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-bold text-white">返回 NowBuild 配置登录 →</a><p className="mt-4 text-xs leading-5 text-gray-400">配置并重新构建后，即可测试真实注册、登录和受保护页面。</p></div></main>;
  }
  const { ${component} } = await import('@clerk/nextjs');
  return <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] p-6"><${component} /></main>;
}`;
}

function localeLayout(brief: ProjectBrief, plan?: ProjectPlan) {
  return `import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx'));
export const metadata: Metadata = { title: { default: ${literal(plan?.seo.title || brief.name)}, template: '%s | ${brief.name.replace(/'/g, '')}' }, description: ${literal(plan?.seo.description || brief.idea)} };
export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const content = <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
  return <div className="min-h-screen bg-white antialiased">{clerkConfigured ? <ClerkProvider>{content}</ClerkProvider> : content}</div>;
}`;
}

function middleware() {
  return `import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18n = createMiddleware(routing);
const protectedRoute = createRouteMatcher(['/:locale/dashboard(.*)', '/dashboard(.*)']);
async function handleRouting(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/api')) return NextResponse.next();
  const hasLocale = routing.locales.some((locale) => pathname === '/' + locale || pathname.startsWith('/' + locale + '/'));
  if (!hasLocale && pathname !== '/' && !/\\.[^/]+$/.test(pathname)) {
    const url = request.nextUrl.clone(); url.pathname = '/' + routing.defaultLocale + pathname; url.search = search;
    return NextResponse.rewrite(url);
  }
  return handleI18n(request);
}
const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const configured = Boolean(key && !key.includes('xxxxx'));
export default configured ? clerkMiddleware(async (auth, request) => {
  if (protectedRoute(request)) await auth.protect();
  return handleRouting(request);
}) : handleRouting;
export const config = { matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|zip|webmanifest)).*)', '/(api|trpc)(.*)'] };`;
}

function nextConfig() {
  return `import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const basePath = process.env.NOWBUILD_PREVIEW_BASE_PATH || '';
/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  headers: async () => [{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
  ] }]
};
export default withNextIntl(nextConfig);`;
}

async function rebrandMessages(cwd: string, brief: ProjectBrief) {
  for (const locale of ['zh', 'en']) {
    const path = join(cwd, 'src', 'messages', `${locale}.json`);
    const original = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
    const replaceBrand = (value: unknown): unknown => {
      if (typeof value === 'string') return value.replaceAll('NowBuild', brief.name);
      if (Array.isArray(value)) return value.map(replaceBrand);
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceBrand(item)]));
      }
      return value;
    };
    const messages = replaceBrand(original) as Record<string, unknown>;
    const metadata = messages.Metadata as Record<string, Record<string, string>>;
    metadata.home.title = `${brief.name} — ${brief.idea}`;
    metadata.home.description = locale === 'zh'
      ? `${brief.idea}，面向${brief.audience}。`
      : `${brief.idea}, built for ${brief.audience}.`;
    metadata.pricing.title = locale === 'zh' ? `${brief.name} 定价` : `${brief.name} Pricing`;
    metadata.about.title = locale === 'zh' ? `关于 ${brief.name}` : `About ${brief.name}`;
    const nav = messages.Nav as Record<string, string>;
    nav.getStarted = locale === 'zh' ? '免费开始' : 'Start free';
    const footer = messages.Footer as Record<string, string>;
    footer.description = locale === 'zh'
      ? `${brief.idea}，专为${brief.audience}打造。`
      : `${brief.idea}, built for ${brief.audience}.`;
    const pricing = messages.Pricing as Record<string, unknown>;
    pricing.subtitle = locale === 'zh'
      ? `先体验${brief.coreFeature}，准备好后再升级。`
      : `Try ${brief.coreFeature} first, then upgrade when you're ready.`;
    const faq = messages.FAQ as { subtitle: string; items: Array<{ question: string; answer: string }> };
    faq.subtitle = locale === 'zh' ? `关于 ${brief.name} 的常见问题。` : `Everything you need to know about ${brief.name}.`;
    if (faq.items[0]) {
      faq.items[0] = locale === 'zh'
        ? { question: `${brief.name} 是什么？`, answer: `${brief.name} 面向${brief.audience}，帮助你${brief.idea}。核心功能是${brief.coreFeature}。` }
        : { question: `What is ${brief.name}?`, answer: `${brief.name} helps ${brief.audience} ${brief.idea}. Its core workflow is ${brief.coreFeature}.` };
    }
    const about = messages.About as Record<string, unknown>;
    about.subtitle = locale === 'zh' ? `让${brief.audience}更简单地${brief.idea}。` : `Helping ${brief.audience} ${brief.idea}.`;
    await writeFile(path, `${JSON.stringify(messages, null, 2)}\n`);
  }
}

export async function applySaasKitScaffold(cwd: string, projectId: string, brief: ProjectBrief, plan?: ProjectPlan) {
  const generatedDir = join(cwd, 'src', 'components', 'generated');
  const managedAIRouteDir = join(cwd, 'src', 'app', 'api', 'nowbuild-ai');
  await mkdir(generatedDir, { recursive: true });
  await mkdir(managedAIRouteDir, { recursive: true });
  await writeFile(join(cwd, 'src', 'app', '[locale]', 'page.tsx'), landingPage(brief, plan));
  await writeFile(join(cwd, 'src', 'app', '[locale]', 'layout.tsx'), localeLayout(brief, plan));
  await writeFile(join(generatedDir, 'ProductWorkspace.tsx'), productComponent(brief, projectId, plan));
  await writeFile(join(cwd, 'src', 'lib', 'nowbuild-ai.ts'), managedAIClient());
  await writeFile(join(managedAIRouteDir, 'route.ts'), managedAIProxyRoute());
  await writeFile(join(cwd, 'src', 'app', '[locale]', 'dashboard', 'page.tsx'), dashboardPage());
  await writeFile(join(cwd, 'src', 'app', '[locale]', 'sign-in', '[[...sign-in]]', 'page.tsx'), authPage('sign-in', brief, projectId));
  await writeFile(join(cwd, 'src', 'app', '[locale]', 'sign-up', '[[...sign-up]]', 'page.tsx'), authPage('sign-up', brief, projectId));
  await writeFile(join(cwd, 'src', 'middleware.ts'), middleware());
  await writeFile(join(cwd, 'next.config.mjs'), nextConfig());
  await writeFile(join(cwd, 'NOWBUILD_PROJECT.json'), `${JSON.stringify({ projectId, generatedAt: new Date().toISOString(), brief, plan, foundation: ['clerk', 'stripe', 'supabase', 'next-intl', 'seo', 'nowbuild-managed-ai'] }, null, 2)}\n`);
  await rebrandMessages(cwd, brief);
  return [
    'src/app/[locale]/page.tsx',
    'src/app/[locale]/layout.tsx',
    'src/app/[locale]/dashboard/page.tsx',
    'src/components/generated/ProductWorkspace.tsx',
    'src/lib/nowbuild-ai.ts',
    'src/app/api/nowbuild-ai/route.ts',
    'src/app/[locale]/pricing/page.tsx',
    'src/app/[locale]/sign-in/[[...sign-in]]/page.tsx',
    'src/app/api/create-checkout-session/route.ts',
    'src/app/api/webhooks/stripe/route.ts',
    'supabase/schema.sql',
    'NOWBUILD_PROJECT.json',
  ];
}
