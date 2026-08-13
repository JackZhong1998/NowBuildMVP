import Image from 'next/image';
import type { ProjectSession } from '@/lib/nowbuild/types';

export default function ProjectShowcase({ locale, projects }: { locale: string; projects: ProjectSession[] }) {
  const zh = locale === 'zh';
  const visible = [...projects]
    .sort((left, right) => Number(right.id.includes('personal-sites')) - Number(left.id.includes('personal-sites')))
    .slice(0, 8);
  if (!visible.length) return null;

  return <section className="bg-[#171816] px-4 py-24 text-white sm:px-6">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div className="text-xs font-bold uppercase tracking-[.18em] text-white/40">{zh ? '真实生成案例' : 'Built with NowBuild'}</div><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-[-.04em] sm:text-5xl">{zh ? '不是效果图，是可以打开的完整网站。' : 'Not mockups. Complete websites you can open.'}</h2></div>
        <a href={`/${locale}/projects`} className="text-sm font-bold text-[#bdb5ff]">{zh ? '进入案例展厅 →' : 'Enter the case gallery →'}</a>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {visible.map((project) => <a key={project.id} href={`/p/${project.id}/${locale}`} target="_blank" className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[.045] transition hover:-translate-y-1 hover:border-white/25 hover:shadow-2xl">
          <div className="relative aspect-[16/10] overflow-hidden bg-white"><Image src={`/case-shots/${project.id}.png`} alt={`${project.title} 官网 Hero 区截图`} fill sizes="(min-width:1024px) 25vw, (min-width:768px) 50vw, 100vw" className="object-cover object-top transition duration-500 group-hover:scale-[1.025]"/><div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent"/><div className="absolute bottom-3 left-3 right-3 flex items-center justify-between"><span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold backdrop-blur">{project.title}</span><span className="rounded-full bg-emerald-400 px-2.5 py-1 text-[9px] font-black text-emerald-950">✓ BUILD</span></div></div>
          <div className="border-t border-white/8 p-4"><p className="line-clamp-2 min-h-10 text-xs leading-5 text-white/55">{project.initialPrompt}</p><div className="mt-4 flex items-center justify-between text-[10px]"><span className="text-white/35">Website · Product · Auth</span><span className="font-bold text-white transition group-hover:text-[#c7ff4a]">{zh ? '体验网站' : 'Open website'} ↗</span></div></div>
        </a>)}
      </div>
    </div>
  </section>;
}
