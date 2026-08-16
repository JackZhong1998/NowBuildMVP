'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { ProjectLaunchState, ProjectPlan, ProjectSession, ProjectTestingState, ProjectTestItem, StyleId } from '@/lib/nowbuild/types';
import { styleCatalog, styleCatalogById, type StyleProfile } from '@/lib/nowbuild/style-catalog';
import { advanceProjectTest, createProjectTestingState, reportProjectTestIssue, startProjectTesting } from '@/lib/nowbuild/project-testing';
import EnvironmentDialog from './EnvironmentDialog';
import ProjectHistoryDrawer from './ProjectHistoryDrawer';
import ReleaseCenter, { type EnvironmentReadiness } from './ReleaseCenter';
import ProjectResourceDrawer from './resources/ProjectResourceDrawer';
import IssueReportDialog, { type TestIssueContext } from './testing/IssueReportDialog';
import ProductTestingPanel from './testing/ProductTestingPanel';

type StudioView = 'preview' | 'code' | 'deploy' | 'errors';
type EnvironmentGroup = 'login' | 'database' | 'payments' | 'ai' | 'mcp' | 'deploy';
type EnvironmentStatus = EnvironmentReadiness & {
  fields: Array<{ key: string; configured: boolean; masked: string }>;
  configuredCount: number;
  loginReady: boolean;
  databaseReady: boolean;
  aiReady: boolean;
};

function StylePreview({ style }: { style: StyleProfile }) {
  const { theme, preview } = style;
  return <span className="relative block h-24 overflow-hidden border-b border-black/8 p-3" style={{ background: theme.bg, color: theme.ink }}>
    {preview.motif === 'gradient' && <span className="absolute -right-6 -top-10 h-24 w-32 rotate-12 rounded-full blur-xl" style={{ background: `linear-gradient(90deg, ${theme.accent}, #00d4ff)` }}/>}
    {preview.motif === 'glass' && <span className="absolute right-4 top-3 h-16 w-20 rotate-6 rounded-2xl border border-white/70 bg-white/45 shadow-xl backdrop-blur"/>}
    {preview.motif === 'shapes' && <><span className="absolute right-4 top-3 h-8 w-8 rotate-12 bg-[#1e4dff]"/><span className="absolute bottom-2 right-12 h-7 w-7 rounded-full bg-[#ff4da6]"/></>}
    {preview.motif === 'deco' && <span className="absolute inset-3 border border-[#d8b56b]/70"><span className="absolute inset-1 border border-[#d8b56b]/30"/></span>}
    <span className={`relative block ${preview.align === 'center' ? 'mx-auto text-center' : preview.align === 'offset' ? 'ml-5 mt-2' : ''}`}>
      <span className="block h-1.5 w-10 rounded-full opacity-45" style={{ background: theme.accent }}/>
      <span className="mt-3 block h-2.5 w-24 rounded-full" style={{ background: theme.ink }}/>
      <span className="mt-1.5 block h-1.5 w-16 rounded-full opacity-35" style={{ background: theme.ink }}/>
      <span className="mt-3 inline-block px-3 py-1 text-[7px] font-black" style={{ background: theme.accent, color: theme.accentInk, borderRadius: theme.radius }}>START →</span>
    </span>
  </span>;
}

function visibleMessage(value: string) {
  return value
    .replaceAll('Pi Agent', '开发助手')
    .replace(/DeepSeek[^\s·，。]*/gi, '')
    .replaceAll('Agent', '开发助手');
}

const viewCopy = {
  preview: ['预览', 'Preview'],
  code: ['代码', 'Code'],
  deploy: ['发布', 'Publish'],
  errors: ['问题', 'Issues'],
} as const;

export default function NowBuildStudio({ locale, initialPrompt, initialProjectId }: { locale: 'zh' | 'en'; initialPrompt: string; initialProjectId: string }) {
  const zh = locale === 'zh';
  const [project, setProject] = useState<ProjectSession | null>(null);
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [pendingPrompt, setPendingPrompt] = useState(initialProjectId ? '' : initialPrompt);
  const [message, setMessage] = useState('');
  const [view, setView] = useState<StudioView>('preview');
  const [selectedFile, setSelectedFile] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [environmentGroup, setEnvironmentGroup] = useState<EnvironmentGroup>('login');
  const [environmentStatus, setEnvironmentStatus] = useState<EnvironmentStatus | null>(null);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [issueItem, setIssueItem] = useState<ProjectTestItem | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const started = useRef(false);
  const conversationEnd = useRef<HTMLDivElement>(null);
  const conversationScroll = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch('/api/credits').then((response) => response.json()).then((data) => setBalance(Number(data.balance || 0))).catch(() => undefined); }, []);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (initialProjectId) void loadProject(initialProjectId);
    else if (initialPrompt.trim()) void createPlan(initialPrompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId, initialPrompt]);
  useEffect(() => {
    const pane = conversationScroll.current;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
  }, [project?.messages.length, busy]);
  useEffect(() => {
    if (!project?.id) { setEnvironmentStatus(null); return; }
    fetch(`/api/projects/${project.id}/environment`)
      .then((response) => response.ok ? response.json() : null)
      .then((next: EnvironmentStatus | null) => setEnvironmentStatus(next))
      .catch(() => setEnvironmentStatus(null));
  }, [project?.id, project?.result]);
  useEffect(() => {
    if (!project?.id || project.status !== 'building') return;
    const id = project.id;
    const timer = window.setInterval(() => {
      fetch(`/api/projects/${id}`)
        .then((response) => response.ok ? response.json() : null)
        .then((latest: ProjectSession | null) => {
          if (latest?.status === 'building') setProject((current) => current?.id === id ? latest : current);
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [project?.id, project?.status]);

  async function loadProject(id: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/projects/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Project not found');
      const next = data.status === 'built' && data.plan && !data.testing
        ? { ...data, testing: createProjectTestingState(data.plan) }
        : data;
      setProject(next); setPlan(next.plan || null); setPendingPrompt('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load project'); }
    finally { setBusy(false); }
  }

  async function createPlan(value: string) {
    if (value.trim().length < 10) { setError(zh ? '请具体描述产品、用户和主要问题' : 'Describe the product, users, and main problem'); return; }
    setPendingPrompt(value); setBusy(true); setError('');
    try {
      const response = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: value, locale }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Planning failed');
      setProject(data); setPlan(data.plan || null); setPendingPrompt('');
      window.history.replaceState(null, '', `/${locale}/dashboard?project=${data.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Planning failed'); }
    finally { setBusy(false); }
  }

  function setBrief(key: keyof ProjectPlan['brief'], value: string) {
    if (plan) setPlan({ ...plan, brief: { ...plan.brief, [key]: value } });
  }
  function setCopy(key: keyof ProjectPlan['copy'], value: string) {
    if (plan) setPlan({ ...plan, copy: { ...plan.copy, [key]: value } });
  }
  function chooseStyle(style: StyleId) {
    if (!plan) return;
    const selected = styleCatalogById[style];
    setPlan({ ...plan, brief: { ...plan.brief, style }, design: { rationale: selected.note, palette: [...selected.palette], typography: selected.typography, layout: selected.principles.join(' · '), motion: selected.motion } });
  }

  async function build(instruction = '', intent: 'change' | 'bug-fix' = 'change') {
    if (!project || !plan || project.isExample) return;
    setBusy(true); setError(''); setView('preview');
    setProject((current) => current ? { ...current, plan, status: 'building', messages: instruction ? [...current.messages, { id: `pending-${Date.now()}`, role: 'user', kind: 'prompt', content: instruction, createdAt: new Date().toISOString() }] : current.messages } : current);
    try {
      const saved = await fetch(`/api/projects/${project.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, title: plan.brief.name }) });
      if (!saved.ok) throw new Error((await saved.json()).error || 'Unable to save plan');
      const response = await fetch(`/api/projects/${project.id}/build`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction, intent }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Build failed');
      setProject(data.project); setPlan(data.project.plan); setBalance(data.balance); setMessage(''); setPreviewRevision((value) => value + 1);
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : 'Build failed';
      setError(text); await loadProject(project.id);
    } finally { setBusy(false); }
  }

  async function openFile(path: string) {
    if (!project) return;
    setSelectedFile(path); setFileContent('Loading…');
    const response = await fetch(`/api/projects/${project.id}/files?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    setFileContent(response.ok ? data.content : data.error);
  }

  async function publish() {
    if (!project?.result || project.isExample) return;
    setPublishing(true); setError('');
    try {
      const response = await fetch(`/api/projects/${project.id}/deploy`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Publish failed');
      setProject(data.project);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Publish failed'); }
    finally { setPublishing(false); }
  }

  async function updateTesting(testing: ProjectTestingState) {
    if (!project) return;
    setProject((current) => current ? { ...current, testing } : current);
    if (project.isExample) return;
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testing }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save testing progress');
      setProject((current) => current && current.id === data.id ? { ...current, testing: data.testing } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save testing progress'); }
  }

  async function updateLaunch(launch: ProjectLaunchState) {
    if (!project || project.isExample) return;
    setProject((current) => current ? { ...current, launch } : current);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ launch }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save launch progress');
      setProject((current) => current && current.id === data.id ? { ...current, launch: data.launch } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save launch progress'); }
  }

  function openConfiguration(provider: 'supabase' | 'stripe' | 'vercel' | EnvironmentGroup) {
    setEnvironmentGroup(provider === 'supabase' ? 'login' : provider === 'stripe' ? 'payments' : provider === 'vercel' ? 'deploy' : provider);
    setEnvironmentOpen(true);
  }

  function selectTest(itemId: string) {
    if (!project?.testing) return;
    const now = new Date().toISOString();
    const next: ProjectTestingState = {
      ...project.testing,
      status: project.testing.items.find((item) => item.id === itemId)?.status === 'needs-retest' ? 'retest' : 'testing',
      activeItemId: itemId,
      items: project.testing.items.map((item) => item.id === itemId
        ? { ...item, status: item.status === 'pending' ? 'current' : item.status }
        : item.status === 'current' ? { ...item, status: 'pending' } : item),
      updatedAt: now,
    };
    void updateTesting(next);
  }

  async function submitTestIssue(issue: TestIssueContext) {
    if (!project?.testing) return;
    const issueText = `${issue.expected}${issue.observed ? `；实际：${issue.observed}` : ''}`;
    const next = reportProjectTestIssue(project.testing, issue.itemId, issueText);
    setIssueItem(null);
    await updateTesting(next);
    const instruction = `测试问题报告\n- 当前测试步骤：${issue.step}\n- 当前预览路径：${issue.previewPath}\n- 用户期望：${issue.expected}\n- 实际表现：${issue.observed || '用户未补充；请结合运行日志和页面行为复现'}\n\n请先复现并定位根因，只修改与这个问题相关的代码；修复后重新运行静态检查、生产构建和关键页面测试。`;
    await build(instruction, 'bug-fix');
  }

  async function refinePlan() {
    if (!project || project.status !== 'ready' || !message.trim()) return;
    const answer = message.trim();
    setBusy(true); setError(''); setMessage('');
    setProject({ ...project, messages: [...project.messages, { id: `pending-${Date.now()}`, role: 'user', kind: 'prompt', content: answer, createdAt: new Date().toISOString() }] });
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer, locale }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update plan');
      setProject(data); setPlan(data.plan);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update plan'); await loadProject(project.id); }
    finally { setBusy(false); }
  }

  function submitPrompt(event: FormEvent) {
    event.preventDefault();
    if (!project) void createPlan(prompt);
    else if (project.status === 'ready') void refinePlan();
    else if (project.status === 'built' || project.status === 'failed') void build(message);
  }

  const files = project?.result?.files.filter((file) => !file.includes('.next') && !file.includes('node_modules')) || [];
  const previewSrc = project?.result ? `/p/${project.id}/${locale}` : `/${locale}`;
  const previewAddress = project?.result ? `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'product'}.preview.nowbuild.app` : 'nowbuild.app';
  const testing = project?.testing || (project?.status === 'built' && plan ? createProjectTestingState(plan) : null);

  return <main className="flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden bg-[#ececea] text-[#171816]">
    <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-black/8 bg-white px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2"><button onClick={() => setHistoryOpen(true)} aria-label="打开历史对话" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#171816] text-sm font-black text-white">N</button><button onClick={() => setHistoryOpen(true)} aria-label="查看历史对话" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/8 bg-white text-base">☰</button><div className="min-w-0"><div className="truncate text-sm font-bold">{project?.title || (zh ? '新产品' : 'New product')}</div><div className="text-[10px] text-black/35">{project?.status === 'built' ? testing?.status === 'passed' ? (zh ? '核心流程已验收' : 'Core flow accepted') : (zh ? '预览已就绪，等待测试' : 'Preview ready for testing') : project?.status === 'building' ? testing?.status === 'fixing' ? (zh ? 'Agent 正在修复问题' : 'Agent is fixing an issue') : (zh ? '正在开发' : 'Building') : (zh ? '方案阶段' : 'Planning')}</div></div></div>
      <div className="flex w-full min-w-0 items-center gap-1 overflow-x-auto sm:w-auto">
        {(Object.keys(viewCopy) as StudioView[]).map((item) => <button key={item} onClick={() => setView(item)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${view === item ? 'bg-[#efedff] text-[#5b4bd9]' : 'text-black/42 hover:bg-black/[.04]'}`}>{viewCopy[item][zh ? 0 : 1]}{item === 'errors' && project?.lastError ? <span className="ml-1 text-red-500">●</span> : null}</button>)}
        <button onClick={() => setResourcesOpen(true)} disabled={!project || project.isExample} className="ml-1 shrink-0 rounded-lg border border-black/8 px-3 py-2 text-xs font-bold text-black/55 disabled:opacity-30">＋ {zh ? '能力与素材' : 'Resources'}</button>
        <button onClick={() => openConfiguration('login')} disabled={!project || project.isExample} className="shrink-0 rounded-lg border border-black/8 px-3 py-2 text-xs font-bold text-black/55 disabled:opacity-30">⚙ {zh ? '配置' : 'Settings'}</button>
        <div className="hidden shrink-0 rounded-lg border border-black/8 px-3 py-2 text-[11px] font-bold sm:block">{balance} credits</div>
        {project?.status === 'built' && <a href={`/p/${project.id}/${locale}`} target="_blank" className="shrink-0 rounded-lg bg-[#6d5dfc] px-3 py-2 text-[11px] font-bold text-white">{zh ? '打开产品 ↗' : 'Open app ↗'}</a>}
      </div>
    </header>

    <div className="grid w-full min-w-0 flex-1 lg:min-h-0 lg:grid-cols-[400px_1fr]">
      <aside className="flex min-h-[680px] w-full min-w-0 flex-col border-r border-black/8 bg-[#fbfbfa] lg:h-[calc(100vh-3.5rem)]">
        <div className="flex items-center justify-between border-b border-black/6 px-5 py-3"><div className="flex rounded-lg bg-black/[.045] p-1 text-[11px] font-bold"><span className={`rounded-md px-3 py-1.5 ${project?.status === 'building' || project?.status === 'built' ? 'text-black/35' : 'bg-white shadow-sm'}`}>Plan</span><span className={`rounded-md px-3 py-1.5 ${project?.status === 'building' || project?.status === 'built' ? 'bg-white shadow-sm' : 'text-black/35'}`}>Build</span></div><button onClick={() => setHistoryOpen(true)} className="text-[10px] font-semibold text-black/40 hover:text-black">{zh ? '历史与进度 →' : 'History & progress →'}</button></div>
        {project?.status === 'built' && testing && !project.isExample && <ProductTestingPanel
          testing={testing}
          readiness={{ supabaseReady: Boolean(environmentStatus?.supabaseReady), paymentsReady: Boolean(environmentStatus?.paymentsReady) }}
          locale={locale}
          busy={busy}
          onStart={() => void updateTesting(startProjectTesting(testing))}
          onSelect={selectTest}
          onPass={(itemId) => void updateTesting(advanceProjectTest(testing, itemId, 'passed'))}
          onSkip={(itemId) => void updateTesting(advanceProjectTest(testing, itemId, 'skipped'))}
          onIssue={setIssueItem}
          onConfigure={(provider) => openConfiguration(provider)}
          onPublish={() => setView('deploy')}
        />}
        <div ref={conversationScroll} className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {!project && !pendingPrompt && <div className="rounded-2xl rounded-tl-sm border border-[#7767ef]/15 bg-[#efedff] p-4 text-sm leading-6 text-[#4439a3]"><div className="mb-2 font-bold">{zh ? '不用填表，像和产品合伙人聊天' : 'No forms—talk to a product partner'}</div><p>{zh ? '用一句话说清 5 件事；缺少关键信息时，我一次只追问一个问题。' : 'Describe five things in one sentence. I ask one question at a time only when a key decision is missing.'}</p><div className="mt-3 rounded-xl bg-white/75 p-3 text-xs leading-5 text-[#4439a3]/75">{zh ? '我想做【什么产品】，给【哪类用户】，在【什么场景】解决【什么痛点】，第一版要验证【什么结果】。' : 'I want to build [product] for [users], solving [pain] in [context], and validate [result] in v1.'}</div><div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold"><span className="rounded-full bg-white/70 px-2 py-1">目标用户</span><span className="rounded-full bg-white/70 px-2 py-1">痛点场景</span><span className="rounded-full bg-white/70 px-2 py-1">核心动作</span><span className="rounded-full bg-white/70 px-2 py-1">验证结果</span></div></div>}
          {pendingPrompt && !project && <><div className="ml-8 rounded-2xl rounded-tr-sm bg-[#171816] p-4 text-sm leading-6 text-white"><div className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] opacity-45">You</div>{pendingPrompt}</div><div role="status" className="mr-3 rounded-2xl rounded-tl-sm border border-black/7 bg-white p-4"><div className="flex items-center gap-3"><span className="h-4 w-4 animate-spin rounded-full border-2 border-black/10 border-t-[#6d5dfc]"/><div><div className="text-sm font-bold">{zh ? '正在整理你的产品方案' : 'Preparing your product plan'}</div><div className="mt-1 text-[11px] text-black/40">{zh ? '正在生成 PRD、设计方向和官网文案…' : 'Creating the PRD, design direction, and website copy…'}</div></div></div><div className="mt-4 space-y-2"><div className="h-2 w-11/12 animate-pulse rounded bg-black/[.06]"/><div className="h-2 w-8/12 animate-pulse rounded bg-black/[.06]"/></div></div></>}
          {project?.messages.map((item) => <div key={item.id} className={item.role === 'user' ? 'ml-8 min-w-0 rounded-2xl rounded-tr-sm bg-[#171816] p-4 text-sm leading-6 text-white' : `mr-3 min-w-0 rounded-2xl rounded-tl-sm border p-4 text-sm leading-6 ${item.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : item.kind === 'result' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-black/7 bg-white'}`}><div className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] opacity-45">{item.role === 'user' ? 'You' : item.kind === 'activity' ? (zh ? '构建进度' : 'Build progress') : 'NowBuild'}</div><div className="whitespace-pre-wrap [overflow-wrap:anywhere]">{visibleMessage(item.content)}</div></div>)}
          {project?.status === 'building' && <div role="status" className="rounded-2xl border border-[#7868ef]/25 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#6d5dfc]/20 border-t-[#6d5dfc]"/><div><div className="text-sm font-bold">{project.buildProgress?.phase === 'retrying' ? (zh ? '正在自动聚焦重试' : 'Automatically retrying') : (zh ? '正在把方案变成可运行产品' : 'Turning the plan into a working product')}</div><div className="mt-1 text-[11px] text-black/40">{project.buildProgress?.detail || (zh ? '页面可以保持打开，完成后会自动显示预览' : 'Keep this page open; the preview appears when ready')}</div></div></div><div className="mt-4 space-y-2 text-xs text-black/55">{[
            ['preparing', '准备完整 SaaS 工程'], ['coding', '开发官网与核心功能'], ['validating', '检查代码并创建生产构建'], ['previewing', '启动产品并测试关键页面'],
          ].map(([phase, step], index, phases) => { const active = project.buildProgress?.phase === 'retrying' ? 'coding' : (project.buildProgress?.phase || 'preparing'); const activeIndex = phases.findIndex(([name]) => name === active); return <div key={phase} className="flex gap-2"><span className={index < activeIndex ? 'text-emerald-500' : 'text-[#6d5dfc]'}>{index < activeIndex ? '✓' : index === activeIndex ? '●' : '○'}</span>{step}</div>; })}</div></div>}
          {plan && (project?.status === 'ready' || project?.status === 'failed') && <div className="rounded-2xl border border-black/8 bg-white shadow-sm"><div className="border-b border-black/6 p-4"><div className="flex items-center justify-between"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6656e8]">01 · MVP PRD</div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">STRUCTURED</span></div>{plan.discovery?.oneLiner && <p className="mt-3 rounded-xl bg-[#f7f7f4] p-3 text-xs leading-5 text-black/60">{plan.discovery.oneLiner}</p>}<div className="mt-3 grid gap-3"><label className="text-[10px] font-bold text-black/40">产品名称<input value={plan.brief.name} onChange={(event) => setBrief('name', event.target.value)} className="mt-1 w-full rounded-lg border border-black/8 px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#6d5dfc]"/></label><label className="text-[10px] font-bold text-black/40">目标用户<input value={plan.brief.audience} onChange={(event) => setBrief('audience', event.target.value)} className="mt-1 w-full rounded-lg border border-black/8 px-3 py-2 text-sm text-black outline-none focus:border-[#6d5dfc]"/></label><label className="text-[10px] font-bold text-black/40">核心价值<textarea value={plan.brief.idea} onChange={(event) => setBrief('idea', event.target.value)} rows={3} className="mt-1 w-full resize-none rounded-lg border border-black/8 px-3 py-2 text-sm leading-5 text-black outline-none focus:border-[#6d5dfc]"/></label><label className="text-[10px] font-bold text-black/40">MVP 核心交互<textarea value={plan.brief.coreFeature} onChange={(event) => setBrief('coreFeature', event.target.value)} rows={3} className="mt-1 w-full resize-none rounded-lg border border-black/8 px-3 py-2 text-sm leading-5 text-black outline-none focus:border-[#6d5dfc]"/></label></div><div className="mt-4"><div className="text-[9px] font-bold uppercase tracking-wider text-black/35">核心旅程</div><div className="mt-2 flex flex-wrap gap-1.5">{(plan.prd.coreJourney || []).map((item, index) => <span key={item} className="rounded-md bg-[#efedff] px-2 py-1 text-[10px] text-[#5447bc]">{index + 1}. {item}</span>)}</div></div>{plan.ai?.enabled && <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3"><div className="flex items-center justify-between"><div className="text-[9px] font-black uppercase tracking-wider text-violet-700">Managed AI</div><span className="text-[9px] font-bold text-emerald-700">无需用户 API Key</span></div><div className="mt-2 flex flex-wrap gap-1.5">{plan.ai.capabilities.map((item) => <span key={item} className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-violet-700">{item}</span>)}</div><p className="mt-2 text-[10px] leading-4 text-black/50">{plan.ai.primaryUseCase}</p></div>}<details className="mt-3 rounded-xl border border-black/7 p-3"><summary className="cursor-pointer text-[10px] font-bold text-black/55">查看范围、验收标准与假设</summary><div className="mt-3 space-y-3"><div className="flex flex-wrap gap-1.5">{plan.prd.scope.map((item) => <span key={item} className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">✓ {item}</span>)}</div><ul className="space-y-1 text-[10px] leading-4 text-black/50">{(plan.prd.acceptanceCriteria || []).map((item) => <li key={item}>• {item}</li>)}</ul>{(plan.discovery?.assumptions || []).map((item) => <div key={item} className="text-[10px] text-amber-700">假设：{item}</div>)}</div></details></div>
            <div className="border-b border-black/6 p-4"><div className="flex items-end justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6656e8]">02 · Style library</div><p className="mt-1 text-[10px] text-black/40">{styleCatalog.length} 套可开发的官网 + 产品内页设计系统</p></div><span className="text-[9px] text-black/30">Inspired, not copied</span></div><div className="mt-3 grid grid-cols-2 gap-2">{styleCatalog.map((style) => <button key={style.id} onClick={() => chooseStyle(style.id)} className={`overflow-hidden rounded-xl border text-left transition ${plan.brief.style === style.id ? 'border-[#6d5dfc] ring-2 ring-[#6d5dfc]/15' : 'border-black/8 hover:-translate-y-0.5 hover:shadow-md'}`}><StylePreview style={style}/><span className="block p-2.5"><span className="flex items-center justify-between"><span className="text-[11px] font-bold">{style.name}</span>{plan.brief.style === style.id && <span className="text-[#6d5dfc]">✓</span>}</span><span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wider text-black/30">{style.inspiration}</span><span className="mt-1.5 block text-[9px] leading-3.5 text-black/45">{style.note}</span></span></button>)}</div><div className="mt-3 rounded-xl bg-black/[.035] p-3 text-[10px] leading-4 text-black/50"><b className="text-black/70">已选：</b>{styleCatalogById[plan.brief.style].name} · {plan.design.typography || styleCatalogById[plan.brief.style].typography} · {plan.design.motion || styleCatalogById[plan.brief.style].motion}</div></div>
            <div className="p-4"><div className="flex items-center justify-between"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6656e8]">03 · Copy & SEO</div><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">SEARCH + CONVERSION</span></div><div className="mt-3 grid gap-2"><input value={plan.copy.headline} onChange={(event) => setCopy('headline', event.target.value)} aria-label="Homepage headline" className="rounded-lg border border-black/8 px-3 py-2 text-sm font-semibold outline-none"/><textarea value={plan.copy.subheadline} onChange={(event) => setCopy('subheadline', event.target.value)} rows={2} aria-label="Homepage subheadline" className="resize-none rounded-lg border border-black/8 px-3 py-2 text-xs leading-5 outline-none"/><div className="grid grid-cols-2 gap-2"><input value={plan.copy.cta} onChange={(event) => setCopy('cta', event.target.value)} aria-label="Homepage CTA" className="rounded-lg border border-black/8 px-3 py-2 text-xs outline-none"/><input value={plan.copy.secondaryCta || ''} onChange={(event) => setCopy('secondaryCta', event.target.value)} aria-label="Homepage secondary CTA" className="rounded-lg border border-black/8 px-3 py-2 text-xs outline-none"/></div></div><div className="mt-3 rounded-xl border border-black/7 p-3"><div className="text-[9px] font-bold uppercase tracking-wider text-black/35">Search preview</div><div className="mt-2 truncate text-xs font-semibold text-[#1a0dab]">{plan.seo?.title}</div><div className="mt-1 truncate text-[9px] text-emerald-700">nowbuild.app{plan.seo?.canonical}</div><p className="mt-1 text-[10px] leading-4 text-black/50">{plan.seo?.description}</p></div><button onClick={() => void build()} disabled={busy} className="mt-4 w-full rounded-xl bg-[#6d5dfc] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#6d5dfc]/20 disabled:opacity-50">{project.status === 'failed' ? (zh ? '修复并重新开发' : 'Fix and rebuild') : (zh ? '确认 PRD、文案与风格，正式开发 →' : 'Confirm plan, copy, and style →')}</button><p className="mt-2 text-center text-[10px] text-black/35">{zh ? '确认后才开始修改完整 SaaS Kit 代码并计费' : 'Coding and billing begin only after confirmation'}</p></div>
          </div>}
          {project?.status === 'ready' && plan?.discovery?.openQuestions?.[0] && <div className="rounded-2xl border border-[#7767ef]/20 bg-[#efedff] p-4 text-xs leading-5 text-[#4439a3]"><b className="mb-1 block text-[9px] uppercase tracking-wider opacity-60">{zh ? '只需回答一个关键问题' : 'One key question'}</b>{plan.discovery.openQuestions[0]}<div className="mt-2 text-[10px] opacity-55">{zh ? '在下方直接回答，PRD、文案和设计建议会一起更新。' : 'Answer below to update the PRD, copy, and design recommendation.'}</div></div>}
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</div>}
          <div ref={conversationEnd}/>
        </div>
        <form onSubmit={submitPrompt} className="border-t border-black/7 bg-white p-3">
          <div className="rounded-2xl border border-black/10 bg-white p-2 shadow-sm">
            <textarea
              value={project ? message : prompt}
              onChange={(event) => project ? setMessage(event.target.value) : setPrompt(event.target.value)}
              rows={3}
              placeholder={!project ? (zh ? '描述产品、目标用户、痛点场景和验证结果…' : 'Describe the users, pain, context, and result…') : project.isExample ? (zh ? '这是只读案例，可基于它创建新项目' : 'Read-only example') : project.status === 'ready' ? (zh ? '回答问题，或告诉我怎么修改这份方案…' : 'Answer the question or refine the plan…') : project.status === 'built' ? (zh ? '继续要求修改产品…' : 'Ask for another product change…') : (zh ? '说明需要如何调整…' : 'Describe what to change…')}
              disabled={busy || project?.status === 'building' || project?.isExample}
              className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-5 outline-none disabled:opacity-40"
            />
            <div className="flex items-center justify-between pt-2">
              <span className="rounded-md bg-black/[.04] px-2 py-1 text-[10px] font-bold">{project?.status === 'built' ? 'Build' : 'Plan'}</span>
              {project?.isExample ? <button type="button" onClick={() => { window.location.href = `/${locale}/dashboard?prompt=${encodeURIComponent(project.initialPrompt)}`; }} className="rounded-lg bg-[#171816] px-3 py-2 text-xs font-bold text-white">{zh ? '基于此案例创建' : 'Remix'}</button> : <button type="submit" disabled={busy || (project ? !message.trim() || project.status === 'building' : prompt.trim().length < 10)} className="rounded-lg bg-[#171816] px-3 py-2 text-xs font-bold text-white disabled:opacity-25">{busy ? (zh ? '处理中…' : 'Working…') : project?.status === 'ready' ? (zh ? '更新产品方案 ↑' : 'Update plan ↑') : project ? (zh ? '发送并开发 ↑' : 'Send & build ↑') : (zh ? '生成方案 ↑' : 'Create plan ↑')}</button>}
            </div>
          </div>
        </form>
      </aside>

      <section className="min-w-0 p-3 sm:p-5 lg:h-[calc(100vh-3.5rem)]">
        {view === 'preview' && <div className="flex h-full min-h-[720px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl"><div className="flex min-h-12 items-center border-b border-black/8 bg-[#fafafa] px-4"><div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-[#ff5f57]"/><span className="h-3 w-3 rounded-full bg-[#febc2e]"/><span className="h-3 w-3 rounded-full bg-[#28c840]"/></div><div className="mx-auto max-w-[60%] truncate rounded-lg border border-black/6 bg-white px-6 py-2 text-center text-[10px] text-black/38">{previewAddress}</div><button onClick={() => setPreviewRevision((value) => value + 1)} aria-label="刷新预览" className="text-sm text-black/35">↻</button></div><iframe key={`${previewSrc}-${previewRevision}`} title="Generated product preview" src={previewSrc} sandbox="allow-forms allow-scripts allow-same-origin allow-popups" className="min-h-0 flex-1 border-0"/></div>}

        {view === 'code' && <div className="grid h-full min-h-[720px] overflow-hidden rounded-2xl border border-black/10 bg-[#111315] text-white md:grid-cols-[260px_1fr]"><aside className="overflow-auto border-r border-white/8 p-3"><div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.15em] text-white/35">Product source /</div>{files.length ? files.map((file) => <button key={file} onClick={() => void openFile(file)} className={`block w-full truncate rounded-md px-2 py-1.5 text-left font-mono text-[10px] ${selectedFile === file ? 'bg-[#6d5dfc] text-white' : 'text-white/55 hover:bg-white/5'}`}>◇ {file}</button>) : <p className="px-2 text-xs leading-5 text-white/30">{zh ? '产品完成首次构建后，真实源码会显示在这里。' : 'Real source files appear after the first successful build.'}</p>}</aside><div className="min-w-0 overflow-auto"><div className="sticky top-0 border-b border-white/8 bg-[#17191c] px-4 py-3 font-mono text-[10px] text-white/40">{selectedFile || (zh ? '选择左侧文件查看真实源码' : 'Choose a source file')}</div><pre className="min-w-max p-5 font-mono text-[11px] leading-6 text-[#d8e2c4]"><code>{fileContent || '// Select a file'}</code></pre></div></div>}

        {view === 'deploy' && <ReleaseCenter
          locale={locale}
          project={project}
          testing={testing}
          environment={environmentStatus}
          launch={project?.launch || null}
          publishing={publishing}
          onConfigure={(provider) => openConfiguration(provider)}
          onReturnToTesting={() => setView('preview')}
          onPublish={() => void publish()}
          onLaunchChange={(next) => void updateLaunch(next)}
        />}

        {view === 'errors' && <div className="h-full min-h-[720px] overflow-auto rounded-2xl bg-[#111315] p-5 font-mono text-[11px] leading-6 text-white/65"><div className="flex items-center justify-between border-b border-white/8 pb-4"><div><div className="font-sans text-sm font-bold text-white">{zh ? '构建、测试与问题记录' : 'Build, test, and issue log'}</div><div className="mt-1 font-sans text-[10px] text-white/30">Secrets and external service output are redacted</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${project?.lastError ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{project?.lastError ? 'NEEDS ATTENTION' : project?.result ? 'NO BUILD ERRORS' : 'NOT RUN'}</span></div>{project?.lastError && <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-300">× {project.lastError}</div>}<div className="mt-4">{project?.result?.logs.map((log, index) => <div key={`${log}-${index}`}><span className="mr-3 text-white/20">{String(index + 1).padStart(2, '0')}</span>{visibleMessage(log)}</div>) || <div className="text-white/25">{zh ? '产品开始开发后，这里会显示文件修改、检查、构建和页面测试记录。' : 'Build and test records appear after development starts.'}</div>}</div>{project?.lastError && !project.isExample && <button onClick={() => void build('请分析上一次构建错误，复现问题，修复根因并重新完成静态检查、生产构建和关键页面测试。', 'bug-fix')} className="mt-6 rounded-lg bg-white px-4 py-2 font-sans text-xs font-bold text-black">{zh ? '让 Agent 修复并重试' : 'Ask agent to fix and retry'}</button>}</div>}
      </section>
    </div>

    <ProjectHistoryDrawer open={historyOpen} locale={locale} activeId={project?.id} onClose={() => setHistoryOpen(false)}/>
    {project && plan && <ProjectResourceDrawer open={resourcesOpen} projectId={project.id} locale={locale} plan={plan} onPlanChange={setPlan} onClose={() => setResourcesOpen(false)} onApplied={() => undefined}/>}
    {project && (
      <EnvironmentDialog
        projectId={project.id}
        built={Boolean(project.result)}
        open={environmentOpen}
        initialGroup={environmentGroup}
        onClose={() => setEnvironmentOpen(false)}
        onStatusChange={setEnvironmentStatus}
        onApplied={() => {
          void loadProject(project.id);
          setPreviewRevision((value) => value + 1);
        }}
      />
    )}
    <IssueReportDialog
      open={Boolean(issueItem)}
      step={issueItem ? { id: issueItem.id, label: issueItem.label } : null}
      previewPath={previewSrc}
      locale={locale}
      onClose={() => setIssueItem(null)}
      onSubmit={(issue) => void submitTestIssue(issue)}
    />
  </main>;
}
