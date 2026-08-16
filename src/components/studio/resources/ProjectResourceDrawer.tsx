'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProjectPlan, ProjectResources } from '@/lib/nowbuild/types';
import AssetLibraryTab from './AssetLibraryTab';
import ManagedAISettingsTab from './ManagedAISettingsTab';
import MCPConnectionsTab from './MCPConnectionsTab';
import SkillLibraryTab from './SkillLibraryTab';
import { loadResources } from './resource-api';

type Tab = 'ai' | 'mcp' | 'skills' | 'assets';
const empty: ProjectResources = { mcpServers: [], skills: [], assets: [] };

type Props = {
  open: boolean; projectId: string; locale: 'zh' | 'en'; plan: ProjectPlan;
  onPlanChange: (value: ProjectPlan) => void; onClose: () => void; onApplied: () => void;
};

export default function ProjectResourceDrawer({ open, projectId, locale, plan, onPlanChange, onClose, onApplied }: Props) {
  const zh = locale === 'zh';
  const [tab, setTab] = useState<Tab>('ai');
  const [resources, setResources] = useState<ProjectResources>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus(); setLoading(true); setError('');
    loadResources(projectId).then(setResources).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load resources')).finally(() => setLoading(false));
  }, [open, projectId]);

  function changed(value: ProjectResources) { setResources(value); onApplied(); }
  async function savePlan() {
    setError('');
    const response = await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, title: plan.brief.name }) });
    const data = await response.json();
    if (!response.ok) { const message = data.error || 'Unable to save AI settings'; setError(message); throw new Error(message); }
  }

  if (!open) return null;
  const counts = { ai: plan.ai.capabilities.length, mcp: resources.mcpServers.length, skills: resources.skills.length, assets: resources.assets.length };
  const label = (item: Tab) => item === 'ai' ? 'AI' : item === 'mcp' ? 'MCP' : item === 'skills' ? 'Skills' : (zh ? '素材库' : 'Assets');

  return <div className="fixed inset-0 z-[60] flex justify-end bg-black/35" role="presentation" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="resource-title" onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-black/8 p-5"><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6d5dfc]">Product resources</div><h2 id="resource-title" className="mt-1 text-xl font-black">{zh ? '能力与素材' : 'Capabilities & assets'}</h2><p className="mt-1 text-xs text-black/45">{zh ? '这些资源只属于当前项目，并在下一次构建时生效。' : 'These resources belong to this project and apply on the next build.'}</p></div><button ref={closeRef} onClick={onClose} aria-label={zh ? '关闭资源面板' : 'Close resource panel'} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 text-lg">×</button></header>
      <nav aria-label={zh ? '资源类型' : 'Resource types'} className="flex gap-1 overflow-x-auto border-b border-black/8 px-5 py-3">{(['ai', 'mcp', 'skills', 'assets'] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-xs font-bold ${tab === item ? 'bg-[#efedff] text-[#5143c3]' : 'text-black/45 hover:bg-black/[.04]'}`}>{label(item)} <span className="ml-1 opacity-55">{counts[item]}</span></button>)}</nav>
      <div className="flex-1 overflow-y-auto p-5">
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        {loading && tab !== 'ai' ? <div aria-busy="true" className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-black/[.05]"/>)}</div>
          : tab === 'ai' ? <ManagedAISettingsTab ai={plan.ai} onChange={(ai) => onPlanChange({ ...plan, ai })} onSave={savePlan} zh={zh}/>
            : tab === 'mcp' ? <MCPConnectionsTab projectId={projectId} resources={resources} onChange={changed} onError={setError} zh={zh} locale={locale}/>
              : tab === 'skills' ? <SkillLibraryTab projectId={projectId} resources={resources} onChange={changed} onError={setError} zh={zh}/>
                : <AssetLibraryTab projectId={projectId} resources={resources} onChange={changed} onError={setError} zh={zh}/>} 
      </div>
    </section>
  </div>;
}
