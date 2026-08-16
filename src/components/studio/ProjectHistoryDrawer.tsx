'use client';

import { useEffect, useState } from 'react';
import type { ProjectSession } from '@/lib/nowbuild/types';

const statusCopy = {
  planning: ['正在理解需求', 18, 'bg-amber-400'],
  ready: ['方案待确认', 36, 'bg-violet-500'],
  building: ['正在开发与测试', 72, 'bg-blue-500'],
  built: ['可以体验', 100, 'bg-emerald-500'],
  failed: ['需要处理', 100, 'bg-red-500'],
} as const;

export default function ProjectHistoryDrawer({ open, locale, activeId, onClose }: { open: boolean; locale: string; activeId?: string; onClose: () => void }) {
  const [projects, setProjects] = useState<ProjectSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/projects', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load projects');
        setProjects(data.projects || []);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load projects');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, reloadKey]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" onClick={onClose}>
    <aside aria-label="历史对话" className="h-full w-[min(380px,90vw)] overflow-y-auto border-r border-black/10 bg-[#fbfbfa] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between px-1 py-2"><div><div className="text-lg font-black tracking-[-.03em]">历史对话</div><p className="mt-1 text-xs text-black/40">查看每个产品的需求、方案与构建进度</p></div><button onClick={onClose} aria-label="关闭历史对话" className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/8 bg-white text-lg">×</button></div>
      <a href={`/${locale}/dashboard`} className="mt-5 flex items-center justify-center rounded-xl bg-[#171816] px-4 py-3 text-sm font-bold text-white">＋ 创建新产品</a>
      <div className="mt-5 space-y-2">
        {loading && <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-black/[.04]" />)}</div>}
        {!loading && error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-700"><div>{error}</div><button onClick={() => setReloadKey((value) => value + 1)} className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 font-bold">{locale === 'zh' ? '重新加载' : 'Retry'}</button></div>}
        {!loading && projects.map((item) => {
          const [label, progress, color] = statusCopy[item.status];
          return <a key={item.id} href={`/${locale}/dashboard?project=${item.id}`} className={`block rounded-2xl border p-4 transition hover:bg-white ${activeId === item.id ? 'border-[#6d5dfc] bg-white shadow-sm' : 'border-black/7 bg-white/60'}`}>
            <div className="flex items-center justify-between gap-3"><div className="truncate text-sm font-bold">{item.title}</div><span className="shrink-0 text-[10px] text-black/35">{new Date(item.updatedAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}</span></div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-black/42">{item.initialPrompt}</p>
            <div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[.06]"><div className={`h-full rounded-full ${color}`} style={{ width: `${progress}%` }} /></div><span className="text-[10px] font-semibold text-black/45">{label}</span></div>
          </a>;
        })}
      </div>
    </aside>
  </div>;
}
