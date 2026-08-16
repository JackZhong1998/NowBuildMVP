'use client';

import { useMemo, useState } from 'react';
import type { MCPCatalogEntry } from '@/lib/nowbuild/mcp-catalog';

const categoryNames: Record<MCPCatalogEntry['category'] | 'all', [string, string]> = {
  all: ['全部', 'All'], development: ['开发', 'Development'], data: ['数据', 'Data'], productivity: ['效率', 'Productivity'],
  payments: ['支付', 'Payments'], observability: ['可观测', 'Observability'], mobility: ['出行', 'Mobility'],
};

export default function MCPMarketplace({ entries, locale, projectId }: { entries: MCPCatalogEntry[]; locale: 'zh' | 'en'; projectId: string }) {
  const zh = locale === 'zh';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MCPCatalogEntry['category'] | 'all'>('all');
  const [busy, setBusy] = useState('');
  const [installed, setInstalled] = useState<string[]>([]);
  const [error, setError] = useState('');
  const filtered = useMemo(() => entries.filter((entry) => {
    const terms = `${entry.name} ${entry.provider} ${entry.description} ${entry.tags.join(' ')}`.toLowerCase();
    return (category === 'all' || entry.category === category) && terms.includes(query.trim().toLowerCase());
  }), [category, entries, query]);

  async function install(entry: MCPCatalogEntry) {
    if (!projectId) return; setBusy(entry.id); setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'mcp', catalogId: entry.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Install failed');
      setInstalled((value) => [...value, entry.id]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Install failed'); }
    finally { setBusy(''); }
  }

  return <main className="min-h-screen bg-[#f1f1ee] text-[#181916]"><header className="border-b border-black/8 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"><a href={`/${locale}`} className="flex items-center gap-2 text-sm font-black"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171816] text-white">N</span> NowBuild</a><div className="flex items-center gap-2">{projectId ? <a href={`/${locale}/dashboard?project=${projectId}`} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold">{zh ? '返回项目' : 'Back to project'}</a> : <a href={`/${locale}/dashboard`} className="rounded-lg bg-[#171816] px-3 py-2 text-xs font-bold text-white">{zh ? '打开项目后安装' : 'Open a project to install'}</a>}</div></div></header>
    <section className="mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8"><div className="grid gap-8 lg:grid-cols-[1fr_340px]"><div><div className="text-xs font-bold uppercase tracking-[.16em] text-[#5d50da]">MCP collection</div><h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-.055em] sm:text-6xl">{zh ? '把外部工具接进你的 AI 产品' : 'Connect real tools to your AI product'}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-black/50">{zh ? '浏览远程 MCP，安装到当前项目。NowBuild 会把工具契约交给 Coding Agent，并在生成产品中创建服务端调用边界。' : 'Browse remote MCP servers and install them into the active project. NowBuild gives their tool contracts to the coding agent and scaffolds a server-side call boundary.'}</p></div><aside className="rounded-xl border border-black/8 bg-[#171816] p-5 text-white"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-white/45">Security baseline</div><ul className="mt-4 space-y-3 text-xs leading-5 text-white/70"><li>✓ {zh ? '密钥只引用环境变量' : 'Secrets only reference environment variables'}</li><li>✓ {zh ? '工具只能从服务端调用' : 'Tools run from server-side code only'}</li><li>✓ {zh ? '高风险操作保留人工确认' : 'Consequential actions retain human confirmation'}</li></ul></aside></div>
      <div className="mt-10 grid gap-3 rounded-xl border border-black/8 bg-white p-3 sm:grid-cols-[1fr_auto]"><label className="sr-only" htmlFor="mcp-search">{zh ? '搜索 MCP' : 'Search MCP'}</label><input id="mcp-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={zh ? '搜索 GitHub、数据库、支付、出行…' : 'Search GitHub, database, payments, mobility…'} className="min-h-11 rounded-lg bg-black/[.035] px-4 text-sm outline-none focus:ring-2 focus:ring-[#6d5dfc]/30"/><div className="flex max-w-full gap-1 overflow-x-auto">{(Object.keys(categoryNames) as Array<keyof typeof categoryNames>).map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${category === item ? 'bg-[#efedff] text-[#5143c3]' : 'text-black/45 hover:bg-black/[.04]'}`}>{categoryNames[item][zh ? 0 : 1]}</button>)}</div></div>
      {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{filtered.map((entry) => <article key={entry.id} className="flex min-h-72 flex-col rounded-xl border border-black/8 bg-white p-5 transition hover:-translate-y-0.5 hover:border-black/18"><div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f0f0ed] text-lg font-black">{entry.name.slice(0, 1)}</div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${entry.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{entry.verified ? (zh ? '官方端点' : 'Official endpoint') : (zh ? '企业适配' : 'Enterprise adapter')}</span></div><h2 className="mt-4 text-lg font-black">{entry.name}</h2><div className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-black/35">{entry.provider} · {entry.transport}</div><p className="mt-3 flex-1 text-xs leading-5 text-black/52">{entry.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{entry.tags.map((tag) => <span key={tag} className="rounded bg-black/[.045] px-2 py-1 text-[9px] font-semibold text-black/50">{tag}</span>)}</div>{entry.safetyNote && <p className="mt-3 border-l-2 border-amber-300 pl-2 text-[10px] leading-4 text-black/45">{entry.safetyNote}</p>}<div className="mt-5 flex items-center gap-2"><button onClick={() => void install(entry)} disabled={!projectId || busy === entry.id || installed.includes(entry.id)} className="flex-1 rounded-lg bg-[#171816] px-3 py-2.5 text-xs font-bold text-white disabled:bg-black/10 disabled:text-black/35">{installed.includes(entry.id) ? (entry.setupRequired ? (zh ? '已安装，待配置' : 'Installed, setup needed') : (zh ? '已安装' : 'Installed')) : busy === entry.id ? (zh ? '安装中…' : 'Installing…') : projectId ? (zh ? '安装到项目' : 'Install to project') : (zh ? '先选择项目' : 'Select a project')}</button><a href={entry.docsUrl} target="_blank" rel="noreferrer" aria-label={`${entry.name} docs`} className="rounded-lg border border-black/10 px-3 py-2.5 text-xs font-bold">↗</a></div></article>)}</div>
      {filtered.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-black/15 p-12 text-center"><h2 className="text-sm font-bold">{zh ? '没有匹配的 MCP' : 'No matching MCP servers'}</h2><p className="mt-2 text-xs text-black/40">{zh ? '换个关键词，或在项目里添加自定义 HTTPS MCP。' : 'Try another search or add a custom HTTPS MCP inside your project.'}</p></div>}
      <div className="mt-8 flex flex-col justify-between gap-3 rounded-xl border border-black/8 bg-white p-5 sm:flex-row sm:items-center"><div><div className="text-sm font-bold">{zh ? '还需要更多工具？' : 'Need more tools?'}</div><p className="mt-1 text-xs text-black/45">{zh ? '继续浏览官方 MCP Registry；在 NowBuild 项目内可粘贴任意合规远程端点。' : 'Browse the official MCP Registry, then paste any compatible remote endpoint into NowBuild.'}</p></div><a href="https://registry.modelcontextprotocol.io/" target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-black/10 px-4 py-2.5 text-xs font-bold">Official Registry ↗</a></div>
    </section></main>;
}
