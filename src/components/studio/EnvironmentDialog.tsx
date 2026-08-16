'use client';

import { useEffect, useMemo, useState } from 'react';
import { environmentFields, environmentGroupCopy } from '@/lib/nowbuild/environment-schema';

type Status = {
  fields: Array<(typeof environmentFields)[number] & { configured: boolean; masked: string }>;
  configuredCount: number;
  loginReady: boolean;
  supabaseReady: boolean;
  databaseReady: boolean;
  paymentsReady: boolean;
  paymentsProductionReady: boolean;
  aiReady: boolean;
  deployReady: boolean;
};

const groups = ['login', 'database', 'payments', 'ai', 'mcp', 'deploy'] as const;
const launchSteps = ['login', 'payments', 'deploy'] as const;

const setupGuide = {
  login: {
    title: '1. 连接 Supabase',
    steps: ['打开 Supabase Dashboard 并选择项目', '在 Project Settings 中复制 Project URL 与 API Keys', '保存后应用到预览，再测试注册和登录'],
    href: 'https://supabase.com/dashboard/projects',
  },
  payments: {
    title: '2. 连接 Stripe',
    steps: ['切换到 Stripe Test mode', '复制 Publishable key 和 Secret key', '创建月付、年付价格并复制 Price ID；Webhook 在首次发布后补充'],
    href: 'https://dashboard.stripe.com/test/apikeys',
  },
  deploy: {
    title: '3. 连接 Vercel',
    steps: ['在 Account Settings 中创建 Access Token', '如果发布到团队，再复制 Team ID', '完成测试与其他配置后，在发布中心创建部署'],
    href: 'https://vercel.com/account/settings/tokens',
  },
} as const;

export default function EnvironmentDialog({ projectId, built, open, initialGroup = 'login', onClose, onApplied, onStatusChange }: { projectId: string; built: boolean; open: boolean; initialGroup?: (typeof groups)[number]; onClose: () => void; onApplied: () => void; onStatusChange?: (status: Status) => void }) {
  const [active, setActive] = useState<(typeof groups)[number]>('login');
  const [status, setStatus] = useState<Status | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [migration, setMigration] = useState<{ name: string; sql: string } | null>(null);
  const [migrationConfirmed, setMigrationConfirmed] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    setActive(initialGroup);
    fetch(`/api/projects/${projectId}/environment`).then((response) => response.json()).then((next: Status) => { setStatus(next); onStatusChange?.(next); });
  }, [initialGroup, onStatusChange, open, projectId]);

  const fields = useMemo(() => (status?.fields || environmentFields).filter((field) => field.group === active), [active, status]);
  if (!open) return null;

  async function save(apply: boolean) {
    setBusy(true); setMessage('');
    try {
      const saved = await fetch(`/api/projects/${projectId}/environment`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values }) });
      const payload = await saved.json();
      if (!saved.ok) throw new Error(payload.error || '保存失败');
      setStatus(payload); onStatusChange?.(payload); setValues({});
      if (apply && built) {
        setMessage('正在创建使用新配置的预览构建…');
        const applied = await fetch(`/api/projects/${projectId}/environment/apply`, { method: 'POST' });
        const result = await applied.json();
        if (!applied.ok) throw new Error(result.error || '应用失败');
        setStatus(result.environment); onStatusChange?.(result.environment); onApplied();
      }
      setMessage(apply && built ? '配置已应用，可以重新测试对应功能。' : '配置已安全保存，将在下一次构建时生效。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败'); }
    finally { setBusy(false); }
  }

  async function previewMigration() {
    setBusy(true); setMessage(''); setMigrationConfirmed(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/environment/migrate`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '无法生成迁移预览');
      setMigration({ name: payload.name, sql: payload.sql });
    } catch (error) { setMessage(error instanceof Error ? error.message : '无法生成迁移预览'); }
    finally { setBusy(false); }
  }

  async function applyMigration() {
    if (!migrationConfirmed) return;
    setBusy(true); setMessage('正在通过 Supabase MCP 应用迁移…');
    try {
      const response = await fetch(`/api/projects/${projectId}/environment/migrate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, name: migration?.name }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '数据库迁移失败');
      setMessage(payload.alreadyApplied ? '该版本迁移已存在，没有重复执行。' : '数据库字段、索引和 RLS 策略已应用。');
      setMigrationConfirmed(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : '数据库迁移失败'); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-3 backdrop-blur-sm" onClick={onClose}>
    <div role="dialog" aria-label="项目配置" className="flex max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <aside className="hidden w-48 shrink-0 border-r border-black/7 bg-[#f5f5f2] p-3 sm:block">
        <div className="px-2 py-3 text-sm font-black">项目配置</div>
        <nav className="mt-2 space-y-1">{groups.map((group) => <button key={group} onClick={() => setActive(group)} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${active === group ? 'bg-white text-[#5b4bd9] shadow-sm' : 'text-black/45'}`}><span className="block">{environmentGroupCopy[group].name}</span><span className="mt-0.5 block truncate text-[9px] font-normal opacity-60 max-sm:hidden">{environmentGroupCopy[group].provider}</span></button>)}</nav>
      </aside>
      <section className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black tracking-[-.04em]">{environmentGroupCopy[active].name} · {environmentGroupCopy[active].provider}</h2><p className="mt-2 max-w-xl text-xs leading-5 text-black/45">{environmentGroupCopy[active].note}</p></div><button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/8 text-lg">×</button></div>
        <label className="mt-5 block text-[10px] font-bold text-black/45 sm:hidden">配置分类<select value={active} onChange={(event) => setActive(event.target.value as (typeof groups)[number])} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm font-bold text-black">{groups.map((group) => <option key={group} value={group}>{environmentGroupCopy[group].name} · {environmentGroupCopy[group].provider}</option>)}</select></label>
        <div className="mt-6 grid grid-cols-3 gap-2">{launchSteps.map((step, index) => {
          const ready = step === 'login' ? status?.supabaseReady : step === 'payments' ? status?.paymentsReady : status?.deployReady;
          return <button type="button" key={step} onClick={() => setActive(step)} className={`rounded-xl border p-3 text-left ${active === step ? 'border-black bg-[#171816] text-white' : ready ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-black/8 bg-white'}`}><span className="text-[9px] font-black">{ready ? '✓' : `0${index + 1}`}</span><span className="mt-2 block text-[11px] font-black">{step === 'login' ? 'Supabase' : step === 'payments' ? 'Stripe' : 'Vercel'}</span><span className="mt-0.5 block text-[9px] opacity-55">{ready ? '已就绪' : '需要配置'}</span></button>;
        })}</div>
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800"><b>密钥保护：</b>值会加密保存，页面和聊天记录永远只显示掩码；生成项目也不会继承 NowBuild 平台自己的凭据。</div>
        {active in setupGuide && <div className="mt-5 rounded-2xl border border-black/8 bg-[#f7f7f4] p-4">
          <div className="flex items-center justify-between gap-3"><div className="text-sm font-black">{setupGuide[active as keyof typeof setupGuide].title}</div><a href={setupGuide[active as keyof typeof setupGuide].href} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#5b4bd9] underline">打开官方控制台 ↗</a></div>
          <ol className="mt-3 space-y-2">{setupGuide[active as keyof typeof setupGuide].steps.map((step, index) => <li key={step} className="flex gap-2 text-[10px] leading-4 text-black/55"><span className="font-black text-black/30">{index + 1}</span><span>{step}</span></li>)}</ol>
        </div>}
        <div className="mt-5 space-y-4">{fields.map((field) => {
          const current = status?.fields.find((item) => item.key === field.key);
          return <label key={field.key} className="block"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold">{field.label}{field.required ? <span className="text-red-500"> *</span> : null}{field.phase === 'after-publish' ? <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] text-blue-700">首次发布后填写</span> : null}</span>{current?.configured && <span className="text-[10px] font-bold text-emerald-600">✓ 已配置 {current.masked}</span>}</div><input type={field.secret ? 'password' : 'text'} value={values[field.key] || ''} onChange={(event) => setValues((all) => ({ ...all, [field.key]: event.target.value }))} placeholder={current?.configured ? '留空以保留当前值' : field.placeholder} className="mt-2 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#6d5dfc]"/><p className="mt-1.5 text-[10px] leading-4 text-black/38">{field.help}</p>{current?.configured && <button type="button" onClick={() => setValues((all) => ({ ...all, [field.key]: '__DELETE__' }))} className="mt-1 text-[10px] font-semibold text-red-500">移除此配置</button>}</label>;
        })}{active === 'mcp' && fields.length === 0 && <div className="rounded-xl border border-dashed border-black/12 p-7 text-center text-xs text-black/40">先在“能力与素材”中安装需要密钥的 MCP，然后在这里保存密钥值。</div>}</div>
        {active === 'ai' && <div className={`mt-6 rounded-2xl border p-5 ${status?.aiReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center justify-between gap-3"><div className="text-sm font-black">{status?.aiReady ? '✓ 托管 AI 已就绪' : '平台 AI 尚未配置'}</div><span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold">平台统一计费</span></div><p className="mt-2 text-xs leading-5 text-black/55">AI 产品会自动获得文本对话、图片生成、视频生成、语音合成和语音转写能力。OpenRouter Key 只存在于 NowBuild 服务端，不会复制到项目源码、浏览器或 Vercel 构建日志。</p><div className="mt-4 flex flex-wrap gap-1.5">{['AI 对话', '文本生成', '图片生成', '视频生成', '语音合成', '语音转写'].map((item) => <span key={item} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-black/55">{item}</span>)}</div><p className="mt-4 text-[10px] leading-4 text-black/40">音乐与 3D 已预留能力位；待 OpenRouter 提供正式生成端点后启用。</p></div>}
        {active === 'login' && <div className="mt-6 rounded-2xl border border-black/7 p-4 text-xs leading-5 text-black/50"><b className="text-black/70">上线前检查：</b>在 Supabase Auth 中启用 Email 登录，将本地、Vercel Preview 和正式域名加入 Redirect URLs。</div>}
        {active === 'database' && <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950"><div className="font-black">通过 Supabase MCP 创建数据库结构</div><p className="mt-2">先保存 Project Ref 和 Access Token。NowBuild 只允许非破坏性迁移，但官方仍建议连接开发/测试项目，不要直接连接有真实用户数据的生产库。</p><button type="button" onClick={() => void previewMigration()} disabled={busy || !built} className="mt-3 rounded-lg bg-white px-3 py-2 font-bold shadow-sm disabled:opacity-40">{built ? '预览 SQL 迁移' : '构建后可生成迁移'}</button>{migration && <div className="mt-4"><div className="font-mono text-[10px] font-bold">{migration.name}</div><pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-[#171816] p-3 text-[10px] leading-5 text-white/75"><code>{migration.sql}</code></pre><label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={migrationConfirmed} onChange={(event) => setMigrationConfirmed(event.target.checked)} className="mt-1"/><span>我已检查上述 SQL，并确认将它应用到当前指定的 Supabase 开发项目。</span></label><button type="button" onClick={() => void applyMigration()} disabled={busy || !migrationConfirmed} className="mt-3 rounded-lg bg-amber-950 px-3 py-2 font-bold text-white disabled:opacity-35">确认并应用迁移</button></div>}</div>}
        {active === 'payments' && <div className="mt-6 rounded-2xl border border-black/7 p-4 text-xs leading-5 text-black/50"><b className="text-black/70">测试建议：</b>先配置 Stripe Test Mode Key。正式部署后，Webhook 地址为你的域名加 <code>/api/webhooks/stripe</code>。</div>}
        {message && <div role="status" className="mt-5 rounded-xl bg-black/[.04] p-3 text-xs text-black/60">{message}</div>}
        {active !== 'ai' && <div className="mt-7 flex flex-wrap justify-end gap-2"><button onClick={() => void save(false)} disabled={busy} className="rounded-xl border border-black/10 px-4 py-2.5 text-xs font-bold disabled:opacity-40">仅保存</button><button onClick={() => void save(true)} disabled={busy || !built} className="rounded-xl bg-[#171816] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-30">{busy ? '处理中…' : built ? '保存并应用到预览' : '构建后可应用'}</button></div>}
      </section>
    </div>
  </div>;
}
