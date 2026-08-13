'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { isStyleId, styleCatalogById } from '@/lib/nowbuild/style-catalog';

type LibraryProject = {
  id: string; title: string; prompt: string; status: string; style: string;
  isExample: boolean; category: 'personal' | 'creator' | 'product'; screenshot: boolean;
};

const filters = ['all', 'personal', 'creator', 'product', 'mine'] as const;
type Filter = (typeof filters)[number];

export default function ProjectLibrary({ locale, projects }: { locale: 'zh' | 'en'; projects: LibraryProject[] }) {
  const zh = locale === 'zh';
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(() => projects.filter((project) => filter === 'all' || filter === 'mine' ? (filter === 'all' || !project.isExample) : project.category === filter), [filter, projects]);
  const personalCount = projects.filter((item) => item.category === 'personal').length;

  return <main className="min-h-screen overflow-hidden bg-[#0b0b0c] text-[#f5f3eb]">
    <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:80px_80px]"/>
    <header className="relative border-b border-white/10 px-4 sm:px-7"><div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between"><a href={`/${locale}`} className="flex items-center gap-3 text-sm font-black"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d9ff63] text-black">N</span>NowBuild <i className="font-mono text-[9px] not-italic text-white/30">/ CASE LIBRARY</i></a><a href={`/${locale}/dashboard`} className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black transition hover:bg-[#d9ff63]">＋ {zh ? '创建我的产品' : 'Build mine'}</a></div></header>

    <div className="relative mx-auto max-w-[1500px] px-4 pb-24 sm:px-7">
      <section className="grid gap-10 border-b border-white/10 pb-12 pt-14 lg:grid-cols-[1fr_420px] lg:items-end lg:pb-16 lg:pt-20">
        <div><div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#b2a7ff]"><span>Selected work</span><span className="h-px w-12 bg-current/40"/><span>Full-stack & tested</span></div><h1 className="mt-5 max-w-4xl text-[clamp(3.5rem,8vw,8rem)] font-black leading-[.82] tracking-[-.075em]">{zh ? <>不只是案例，<br/><span className="text-[#d9ff63]">都是活的网站。</span></> : <>Not mockups.<br/><span className="text-[#d9ff63]">Living products.</span></>}</h1></div>
        <div className="border-l border-white/12 pl-6"><div className="grid grid-cols-3 gap-4"><div><b className="text-3xl tracking-tight">{projects.length}</b><span className="mt-1 block text-[9px] uppercase tracking-wider text-white/35">Built cases</span></div><div><b className="text-3xl tracking-tight">{personalCount}</b><span className="mt-1 block text-[9px] uppercase tracking-wider text-white/35">Personal</span></div><div><b className="text-3xl tracking-tight">100%</b><span className="mt-1 block text-[9px] uppercase tracking-wider text-white/35">Build checked</span></div></div><p className="mt-7 text-sm leading-6 text-white/48">{zh ? '每个案例都从同一套 NowBuild SaaS Kit 生成，拥有独立源码、响应式官网、核心工作区以及构建证据。个人网站案例同样可打开、重混并继续对话。' : 'Every case is generated from the same NowBuild SaaS Kit with independent source, responsive website, product flow, and build evidence.'}</p></div>
      </section>

      <nav className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto border-b border-white/10 bg-[#0b0b0c]/90 px-4 py-4 backdrop-blur-xl sm:-mx-7 sm:px-7">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[.12em] transition ${filter === item ? 'bg-[#d9ff63] text-black' : 'border border-white/10 text-white/45 hover:border-white/25 hover:text-white'}`}>{item === 'all' ? (zh ? '全部案例' : 'All') : item === 'personal' ? (zh ? '个人网站' : 'Personal') : item === 'creator' ? (zh ? '创作者工具' : 'Creator') : item === 'product' ? (zh ? '商业产品' : 'Products') : (zh ? '我的项目' : 'Mine')}</button>)}</nav>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-12">
        {visible.map((project, index) => {
          const profile = isStyleId(project.style) ? styleCatalogById[project.style] : null;
          const wide = index % 7 === 0 || index % 7 === 3;
          return <a key={project.id} href={`/p/${project.id}/${locale}`} target="_blank" className={`group relative overflow-hidden rounded-[22px] border border-white/10 bg-[#141416] transition duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_30px_80px_rgba(0,0,0,.45)] ${wide ? 'xl:col-span-7' : 'xl:col-span-5'}`}>
            <div className={`relative overflow-hidden ${wide ? 'aspect-[16/9]' : 'aspect-[4/3]'}`} style={{ background: profile?.theme.bg || '#f4f4f1', color: profile?.theme.ink || '#111' }}>
              {project.screenshot ? <Image src={`/case-shots/${project.id}.png`} alt={`${project.title} website preview`} fill sizes={wide ? '(min-width:1280px) 58vw, 100vw' : '(min-width:1280px) 42vw, 100vw'} className="object-cover object-top transition duration-700 group-hover:scale-[1.025]"/> : <div className="absolute inset-0 p-8"><div className="flex justify-between text-[9px] font-bold uppercase tracking-wider opacity-50"><span>{project.title}</span><span>Selected / 2026</span></div><div className="mt-[16%] max-w-[75%]"><div className="text-[clamp(2rem,4vw,4.7rem)] font-black leading-[.85] tracking-[-.07em]">{project.prompt.slice(0, 32)}</div><span className="mt-6 inline-flex px-4 py-2 text-[9px] font-black" style={{ background: profile?.theme.accent || '#111', color: profile?.theme.accentInk || '#fff', borderRadius: profile?.theme.radius }}>VIEW WORK ↗</span></div><div className="absolute -bottom-12 -right-8 h-44 w-44 rounded-full opacity-25" style={{ background: profile?.theme.accent || '#777' }}/></div>}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent"/>
              <div className="absolute bottom-4 left-4 flex items-center gap-2"><span className="rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur">{profile?.name || 'Custom'}</span>{project.category === 'personal' && <span className="rounded-full bg-[#ff8b68] px-2.5 py-1 text-[9px] font-black text-black">PERSONAL SITE</span>}</div>
            </div>
            <div className="grid gap-5 border-t border-white/8 p-5 sm:grid-cols-[1fr_auto] sm:items-end"><div><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${project.status === 'built' ? 'bg-emerald-400' : 'bg-amber-400'}`}/><span className="text-[9px] font-bold uppercase tracking-[.14em] text-white/35">{project.status === 'built' ? 'Build passed' : project.status}</span></div><h2 className="mt-3 text-2xl font-black tracking-[-.045em]">{project.title}</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">{project.prompt}</p></div><span className="text-xs font-bold text-[#d9ff63]">{zh ? '体验真实网站' : 'Open live website'} ↗</span></div>
          </a>;
        })}
      </section>
      {!visible.length && <div className="mt-8 rounded-3xl border border-dashed border-white/15 py-24 text-center text-sm text-white/35">{zh ? '这个分类还没有案例。' : 'No cases in this category yet.'}</div>}
    </div>
  </main>;
}
