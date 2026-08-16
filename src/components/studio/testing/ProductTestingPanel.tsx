'use client';

import type { ProjectTestingState, ProjectTestItem } from '@/lib/nowbuild/types';

type Readiness = { supabaseReady: boolean; paymentsReady: boolean };

function iconFor(status: ProjectTestItem['status']) {
  if (status === 'passed') return '✓';
  if (status === 'skipped') return '–';
  if (status === 'failed') return '!';
  if (status === 'needs-retest') return '↻';
  if (status === 'current') return '●';
  return '○';
}

export default function ProductTestingPanel({
  testing,
  readiness,
  locale,
  busy,
  onStart,
  onSelect,
  onPass,
  onSkip,
  onIssue,
  onConfigure,
  onPublish,
}: {
  testing: ProjectTestingState;
  readiness: Readiness;
  locale: 'zh' | 'en';
  busy: boolean;
  onStart: () => void;
  onSelect: (itemId: string) => void;
  onPass: (itemId: string) => void;
  onSkip: (itemId: string) => void;
  onIssue: (item: ProjectTestItem) => void;
  onConfigure: (provider: 'supabase' | 'stripe') => void;
  onPublish: () => void;
}) {
  const zh = locale === 'zh';
  const active = testing.items.find((item) => item.id === testing.activeItemId);
  const completed = testing.items.filter((item) => ['passed', 'skipped'].includes(item.status)).length;
  const needsSetup = active?.requires === 'supabase' ? !readiness.supabaseReady : active?.requires === 'stripe' ? !readiness.paymentsReady : false;
  const providerLabel = active?.requires === 'supabase' ? 'Supabase' : 'Stripe';

  if (testing.status === 'not-started') {
    return <section aria-labelledby="test-ready-title" className="border-b border-black/7 bg-[#f1f7ed] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-black text-white">✓</span>
        <div className="min-w-0 flex-1">
          <h2 id="test-ready-title" className="text-sm font-black">{zh ? '产品第一版已经可以测试' : 'Your first product version is ready to test'}</h2>
          <p className="mt-1 text-[11px] leading-5 text-black/55">{zh ? `我根据 PRD 整理了 ${Math.max(0, testing.items.length - 1)} 个核心测试任务。先确认真实体验，再进入发布。` : `I created ${Math.max(0, testing.items.length - 1)} core test tasks from the PRD.`}</p>
          <button type="button" onClick={onStart} className="mt-3 rounded-lg bg-[#171816] px-3 py-2 text-xs font-bold text-white">{zh ? '开始测试核心流程 →' : 'Start core flow testing →'}</button>
        </div>
      </div>
    </section>;
  }

  if (testing.status === 'passed') {
    return <section aria-labelledby="test-passed-title" className="border-b border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 font-black text-white">✓</span>
        <div className="min-w-0 flex-1">
          <h2 id="test-passed-title" className="text-sm font-black text-emerald-950">{zh ? '核心流程测试完成' : 'Core flow testing complete'}</h2>
          <p className="mt-1 text-[11px] leading-5 text-emerald-900/70">{zh ? '人工验收已经完成。下一步检查 Supabase、Stripe 和 Vercel 配置。' : 'Manual acceptance is complete. Next, check launch configuration.'}</p>
          <button type="button" onClick={onPublish} className="mt-3 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">{zh ? '进入发布检查 →' : 'Open launch checklist →'}</button>
        </div>
      </div>
    </section>;
  }

  return <section aria-labelledby="testing-title" className="border-b border-black/7 bg-white">
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <h2 id="testing-title" className="text-xs font-black">{testing.status === 'fixing' ? (zh ? 'Agent 正在修复' : 'Agent is fixing the issue') : testing.status === 'retest' ? (zh ? '等待复测' : 'Ready to retest') : (zh ? '核心流程测试' : 'Core flow testing')}</h2>
        <p className="mt-0.5 text-[10px] text-black/40">{completed}/{testing.items.length} {zh ? '项完成' : 'complete'}</p>
      </div>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/8"><div className="h-full bg-emerald-600" style={{ width: `${Math.round(completed / Math.max(1, testing.items.length) * 100)}%` }} /></div>
    </div>
    <ol className="border-y border-black/6">
      {testing.items.map((item) => <li key={item.id}>
        <button type="button" disabled={item.source === 'automatic' || testing.status === 'fixing'} onClick={() => onSelect(item.id)} className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-[11px] leading-4 disabled:cursor-default ${item.id === testing.activeItemId ? 'bg-[#f4f2e9]' : 'hover:bg-black/[.025]'}`}>
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${item.status === 'passed' ? 'bg-emerald-100 text-emerald-800' : item.status === 'failed' ? 'bg-red-100 text-red-700' : item.status === 'needs-retest' ? 'bg-amber-100 text-amber-800' : item.id === testing.activeItemId ? 'bg-black text-white' : 'border border-black/15 text-black/35'}`}>{iconFor(item.status)}</span>
          <span className="min-w-0 flex-1"><span className="block font-semibold text-black/75">{item.label}</span>{item.requires && <span className="mt-0.5 block text-[9px] text-black/35">{zh ? '需要连接' : 'Requires'} {item.requires === 'supabase' ? 'Supabase' : 'Stripe'}</span>}</span>
        </button>
      </li>)}
    </ol>
    {active && <div className="p-4">
      {needsSetup ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="text-xs font-black text-amber-950">{zh ? `继续测试前需要连接 ${providerLabel}` : `Connect ${providerLabel} before continuing`}</div>
        <p className="mt-1 text-[10px] leading-4 text-amber-900/70">{zh ? '配置会加密保存，应用后自动重启预览并回到这个测试步骤。' : 'Settings are encrypted; the preview restarts and returns to this step.'}</p>
        <button type="button" onClick={() => onConfigure(active.requires!)} className="mt-2 rounded-lg bg-amber-950 px-3 py-2 text-[10px] font-bold text-white">{zh ? `现在配置 ${providerLabel} →` : `Configure ${providerLabel} →`}</button>
      </div> : <>
        <div className="text-[10px] font-bold uppercase tracking-[.12em] text-black/35">{zh ? '当前任务' : 'Current task'}</div>
        <p className="mt-1 text-xs font-bold leading-5">{active.label}</p>
        {testing.status === 'fixing' ? <p role="status" className="mt-3 rounded-lg bg-blue-50 p-3 text-[10px] leading-4 text-blue-900">{zh ? '问题上下文已交给 Agent。修复、构建和页面检查完成后，这一步会变成“等待复测”。' : 'The agent has the issue context. This step will be marked for retest after validation.'}</p> : <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => onIssue(active)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-800 disabled:opacity-40">{zh ? '这里有问题' : 'There is a problem'}</button>
          <button type="button" disabled={busy} onClick={() => onPass(active.id)} className="rounded-lg bg-[#171816] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-40">{testing.status === 'retest' ? (zh ? '复测通过，下一步' : 'Retest passed') : (zh ? '正常，下一步' : 'Pass, next')}</button>
          <button type="button" disabled={busy} onClick={() => onSkip(active.id)} className="col-span-2 text-[10px] font-semibold text-black/35 hover:text-black/60 disabled:opacity-40">{zh ? '暂时跳过这一步' : 'Skip for now'}</button>
        </div>}
      </>}
    </div>}
  </section>;
}
