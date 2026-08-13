'use client';

import { useEffect, useMemo, useState } from 'react';
import { environmentFields, environmentGroupCopy } from '@/lib/nowbuild/environment-schema';

type Status = {
  fields: Array<(typeof environmentFields)[number] & { configured: boolean; masked: string }>;
  configuredCount: number;
  loginReady: boolean;
  databaseReady: boolean;
  paymentsReady: boolean;
  aiReady: boolean;
  deployReady: boolean;
};

const groups = ['login', 'database', 'payments', 'ai', 'deploy'] as const;

export default function EnvironmentDialog({ projectId, built, open, onClose, onApplied }: { projectId: string; built: boolean; open: boolean; onClose: () => void; onApplied: () => void }) {
  const [active, setActive] = useState<(typeof groups)[number]>('login');
  const [status, setStatus] = useState<Status | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !projectId) return;
    fetch(`/api/projects/${projectId}/environment`).then((response) => response.json()).then(setStatus);
  }, [open, projectId]);

  const fields = useMemo(() => environmentFields.filter((field) => field.group === active), [active]);
  if (!open) return null;

  async function save(apply: boolean) {
    setBusy(true); setMessage('');
    try {
      const saved = await fetch(`/api/projects/${projectId}/environment`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values }) });
      const payload = await saved.json();
      if (!saved.ok) throw new Error(payload.error || '保存失败');
      setStatus(payload); setValues({});
      if (apply && built) {
        setMessage('正在创建使用新配置的预览构建…');
        const applied = await fetch(`/api/projects/${projectId}/environment/apply`, { method: 'POST' });
        const result = await applied.json();
        if (!applied.ok) throw new Error(result.error || '应用失败');
        setStatus(result.environment); onApplied();
      }
      setMessage(apply && built ? '配置已应用，可以重新测试对应功能。' : '配置已安全保存，将在下一次构建时生效。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败'); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-3 backdrop-blur-sm" onClick={onClose}>
    <div role="dialog" aria-label="项目配置" className="flex max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <aside className="w-48 shrink-0 border-r border-black/7 bg-[#f5f5f2] p-3 max-sm:w-24">
        <div className="px-2 py-3 text-sm font-black">项目配置</div>
        <nav className="mt-2 space-y-1">{groups.map((group) => <button key={group} onClick={() => setActive(group)} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${active === group ? 'bg-white text-[#5b4bd9] shadow-sm' : 'text-black/45'}`}><span className="block">{environmentGroupCopy[group].name}</span><span className="mt-0.5 block truncate text-[9px] font-normal opacity-60 max-sm:hidden">{environmentGroupCopy[group].provider}</span></button>)}</nav>
      </aside>
      <section className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black tracking-[-.04em]">{environmentGroupCopy[active].name} · {environmentGroupCopy[active].provider}</h2><p className="mt-2 max-w-xl text-xs leading-5 text-black/45">{environmentGroupCopy[active].note}</p></div><button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/8 text-lg">×</button></div>
        <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800"><b>密钥保护：</b>值会加密保存，页面和聊天记录永远只显示掩码；生成项目也不会继承 NowBuild 平台自己的凭据。</div>
        <div className="mt-5 space-y-4">{fields.map((field) => {
          const current = status?.fields.find((item) => item.key === field.key);
          return <label key={field.key} className="block"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold">{field.label}{field.required ? <span className="text-red-500"> *</span> : null}</span>{current?.configured && <span className="text-[10px] font-bold text-emerald-600">✓ 已配置 {current.masked}</span>}</div><input type={field.secret ? 'password' : 'text'} value={values[field.key] || ''} onChange={(event) => setValues((all) => ({ ...all, [field.key]: event.target.value }))} placeholder={current?.configured ? '留空以保留当前值' : field.placeholder} className="mt-2 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#6d5dfc]"/><p className="mt-1.5 text-[10px] leading-4 text-black/38">{field.help}</p>{current?.configured && <button type="button" onClick={() => setValues((all) => ({ ...all, [field.key]: '__DELETE__' }))} className="mt-1 text-[10px] font-semibold text-red-500">移除此配置</button>}</label>;
        })}</div>
        {active === 'ai' && <div className={`mt-6 rounded-2xl border p-5 ${status?.aiReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center justify-between gap-3"><div className="text-sm font-black">{status?.aiReady ? '✓ 托管 AI 已就绪' : '平台 AI 尚未配置'}</div><span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold">平台统一计费</span></div><p className="mt-2 text-xs leading-5 text-black/55">AI 产品会自动获得文本对话、图片生成、视频生成、语音合成和语音转写能力。OpenRouter Key 只存在于 NowBuild 服务端，不会复制到项目源码、浏览器或 Vercel 构建日志。</p><div className="mt-4 flex flex-wrap gap-1.5">{['AI 对话', '文本生成', '图片生成', '视频生成', '语音合成', '语音转写'].map((item) => <span key={item} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-black/55">{item}</span>)}</div><p className="mt-4 text-[10px] leading-4 text-black/40">音乐与 3D 已预留能力位；待 OpenRouter 提供正式生成端点后启用。</p></div>}
        {active === 'login' && <div className="mt-6 rounded-2xl border border-black/7 p-4 text-xs leading-5 text-black/50"><b className="text-black/70">上线前检查：</b>在 Clerk 创建独立项目；先使用 Development Key 测试；正式域名发布后，再创建 Production instance，并将部署域名加入允许的跳转地址。</div>}
        {active === 'payments' && <div className="mt-6 rounded-2xl border border-black/7 p-4 text-xs leading-5 text-black/50"><b className="text-black/70">测试建议：</b>先配置 Stripe Test Mode Key。正式部署后，Webhook 地址为你的域名加 <code>/api/webhooks/stripe</code>。</div>}
        {message && <div role="status" className="mt-5 rounded-xl bg-black/[.04] p-3 text-xs text-black/60">{message}</div>}
        {active !== 'ai' && <div className="mt-7 flex flex-wrap justify-end gap-2"><button onClick={() => void save(false)} disabled={busy} className="rounded-xl border border-black/10 px-4 py-2.5 text-xs font-bold disabled:opacity-40">仅保存</button><button onClick={() => void save(true)} disabled={busy || !built} className="rounded-xl bg-[#171816] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-30">{busy ? '处理中…' : built ? '保存并应用到预览' : '构建后可应用'}</button></div>}
      </section>
    </div>
  </div>;
}
