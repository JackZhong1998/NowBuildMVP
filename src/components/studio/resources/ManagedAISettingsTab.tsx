'use client';

import { useState } from 'react';
import type { AICapability, ProjectPlan } from '@/lib/nowbuild/types';

const ready: Array<{ id: AICapability; zh: string; en: string; note: string }> = [
  { id: 'text', zh: '文本与对话', en: 'Text & chat', note: 'LLM' },
  { id: 'image', zh: '图片生成', en: 'Image', note: '1K / 2K' },
  { id: 'video', zh: '视频生成', en: 'Video', note: 'async job' },
  { id: 'speech', zh: '语音合成', en: 'Speech', note: 'audio' },
  { id: 'transcription', zh: '语音转写', en: 'Transcription', note: 'audio → text' },
];

export default function ManagedAISettingsTab({ ai, onChange, onSave, zh }: { ai: ProjectPlan['ai']; onChange: (value: ProjectPlan['ai']) => void; onSave: () => Promise<void>; zh: boolean }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  function toggleCapability(capability: AICapability) {
    const selected = ai.capabilities.includes(capability) ? ai.capabilities.filter((item) => item !== capability) : [...ai.capabilities, capability];
    onChange({ ...ai, capabilities: selected, enabled: selected.length > 0 });
  }
  return <div className="space-y-5"><section className="rounded-xl border border-black/8 bg-[#171816] p-5 text-white"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a99fff]">Managed OpenRouter gateway</div><h3 className="mt-2 text-lg font-black">{zh ? '生成式 AI 路由' : 'Generative AI routing'}</h3><p className="mt-2 max-w-xl text-xs leading-5 text-white/55">{zh ? '产品只调用 NowBuild 网关。密钥、计量和具体模型均由平台控制；浏览器不能覆盖模型，也不需要用户提供 OpenRouter Key。' : 'Products call the NowBuild gateway only. Keys, metering, and exact models remain platform-controlled; browsers cannot override a model or supply an OpenRouter key.'}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${ai.enabled ? 'bg-emerald-400 text-emerald-950' : 'bg-white/10 text-white/55'}`}>{ai.enabled ? (zh ? '已启用' : 'Enabled') : (zh ? '已关闭' : 'Disabled')}</span></div></section>
    <section><h3 className="text-xs font-bold uppercase tracking-[.12em] text-black/40">{zh ? '选择产品需要的能力' : 'Choose product capabilities'}</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{ready.map((item) => { const checked = ai.capabilities.includes(item.id); return <label key={item.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 ${checked ? 'border-[#7061e8]/35 bg-[#efedff]' : 'border-black/8 bg-white'}`}><span><span className="block text-sm font-bold">{zh ? item.zh : item.en}</span><span className="mt-1 block text-[10px] text-black/40">{item.note}</span></span><input type="checkbox" checked={checked} onChange={() => toggleCapability(item.id)} className="h-4 w-4 accent-[#6656e8]"/></label>; })}</div><div className="mt-2 grid gap-2 sm:grid-cols-2">{[['音乐生成', 'Music'], ['3D 生成', '3D']].map(([cn, en]) => <div key={en} className="flex items-center justify-between rounded-xl border border-dashed border-black/10 p-4 text-black/35"><span className="text-sm font-bold">{zh ? cn : en}</span><span className="text-[9px] font-bold">COMING SOON</span></div>)}</div></section>
    <section className="grid gap-3"><label className="text-xs font-bold">{zh ? '主要使用场景' : 'Primary use case'}<textarea value={ai.primaryUseCase} onChange={(event) => onChange({ ...ai, primaryUseCase: event.target.value })} rows={2} maxLength={1000} className="mt-1.5 w-full rounded-lg border border-black/10 p-3 text-sm leading-5 outline-none focus:border-[#6d5dfc]"/></label><label className="text-xs font-bold">System prompt<textarea value={ai.systemPrompt} onChange={(event) => onChange({ ...ai, systemPrompt: event.target.value })} rows={5} maxLength={8000} spellCheck={false} className="mt-1.5 w-full rounded-lg border border-black/10 p-3 font-mono text-[11px] leading-5 outline-none focus:border-[#6d5dfc]"/></label><label className="text-xs font-bold">{zh ? '输出契约' : 'Output contract'}<textarea value={ai.outputContract} onChange={(event) => onChange({ ...ai, outputContract: event.target.value })} rows={3} maxLength={2000} className="mt-1.5 w-full rounded-lg border border-black/10 p-3 text-sm leading-5 outline-none focus:border-[#6d5dfc]"/></label></section>
    <p className="rounded-lg bg-blue-50 p-3 text-[11px] leading-5 text-blue-800">{zh ? '模型指定方式：运维通过 NOWBUILD_AI_TEXT_MODEL、NOWBUILD_AI_IMAGE_MODEL 等环境变量按能力固定或升级模型；项目代码不保存 model slug。' : 'Model selection: operations pin or upgrade each capability through NOWBUILD_AI_*_MODEL environment variables; generated project code stores no model slug.'}</p><div className="flex items-center justify-end gap-3"><span role="status" className="text-xs text-emerald-700">{saved ? (zh ? '已保存' : 'Saved') : ''}</span><button onClick={() => { setSaving(true); setSaved(false); void onSave().then(() => setSaved(true)).catch(() => undefined).finally(() => setSaving(false)); }} disabled={saving} className="rounded-lg bg-[#171816] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{saving ? (zh ? '正在保存…' : 'Saving…') : (zh ? '保存 AI 设置' : 'Save AI settings')}</button></div>
  </div>;
}
