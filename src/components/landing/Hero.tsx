'use client';

import { FormEvent, useState } from 'react';
import { useLocale } from 'next-intl';

const suggestions = [
  '给独立咨询师做一个客户访谈到提案的工作台',
  '做一个播客媒体包与品牌询盘管理产品',
  '帮餐厅完成菜单发布、订单收集和会员付费',
];

export default function Hero() {
  const locale = useLocale();
  const zh = locale === 'zh';
  const [prompt, setPrompt] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = prompt.trim();
    if (value.length < 10) return;
    window.location.href = `/${locale}/dashboard?prompt=${encodeURIComponent(value)}`;
  }

  return <section className="relative overflow-hidden bg-[#0b0b0c] px-4 pb-16 pt-20 text-[#f4f4ef] sm:px-6 sm:pb-24 sm:pt-28">
    <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:72px_72px]"/>
    <div className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-[#725cff]/25 blur-[120px]"/>
    <div className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-[#d6ff5f]/10 blur-[100px]"/>

    <div className="relative mx-auto max-w-[1440px]">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 text-[10px] font-bold uppercase tracking-[.18em] text-white/45"><span>NowBuild / Product Foundry</span><span className="hidden sm:block">PRD → Design → Code → Test</span><span className="flex items-center gap-2 text-[#d6ff5f]"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"/>System ready</span></div>

      <div className="grid gap-10 pb-16 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end lg:gap-16 lg:pb-24 lg:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d6ff5f]/30 bg-[#d6ff5f]/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#d6ff5f]"><span>01</span><span className="h-px w-5 bg-current/40"/>{zh ? '从自然语言到完整产品' : 'Natural language to a complete product'}</div>
          <h1 className="mt-7 max-w-4xl text-[clamp(3.4rem,7.4vw,7.8rem)] font-black leading-[.82] tracking-[-.075em]"><span className="block">{zh ? '把想法' : 'Turn the idea'}</span><span className="block text-[#d6ff5f]">{zh ? '变成生意。' : 'into business.'}</span></h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-white/58 sm:text-lg">{zh ? '先把模糊需求聊成 PRD，选定真正可执行的视觉系统，再基于完整 SaaS Kit 编码、构建和测试。你拿到的是能登录、收款、迭代的 MVP。' : 'Turn a rough idea into a PRD, choose an executable visual system, then build and test it on a complete SaaS Kit. Ship an MVP that can authenticate, charge, and evolve.'}</p>
          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[10px] font-bold uppercase tracking-[.13em] text-white/38">{['Supabase auth', 'Stripe payments', 'Supabase database', 'SEO + i18n'].map((item) => <span key={item} className="flex items-center gap-2"><i className="h-1 w-1 rounded-full bg-[#ff8a64]"/>{item}</span>)}</div>
        </div>

        <div className="relative lg:pb-3">
          <div className="absolute -left-5 -top-5 hidden rounded-full bg-[#ff8a64] px-4 py-2 text-[10px] font-black uppercase tracking-[.12em] text-black shadow-xl lg:block">Build real software ↘</div>
          <form onSubmit={submit} className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[#151518]/95 shadow-[0_50px_120px_rgba(0,0,0,.6)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#ff655d]"/><i className="h-2.5 w-2.5 rounded-full bg-[#ffbd45]"/><i className="h-2.5 w-2.5 rounded-full bg-[#30c66b]"/></div><span className="font-mono text-[9px] uppercase tracking-[.12em] text-white/25">new-product.nowbuild</span><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-bold text-white/35">DRAFT</span></div>
            <div className="p-5 sm:p-7">
              <label className="text-[10px] font-bold uppercase tracking-[.15em] text-[#a89cff]">{zh ? '描述你要验证的产品' : 'Describe the product to validate'}</label>
              <textarea aria-label={zh ? '描述你的产品需求' : 'Describe your product'} value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} placeholder={zh ? '我想做【产品】，给【用户】，在【场景】解决【痛点】，第一版验证【结果】…' : 'I want to build [product] for [users], solving [pain] in [context], validating [result]…'} className="mt-3 w-full resize-none bg-transparent text-lg font-semibold leading-7 text-white outline-none placeholder:text-white/18 sm:text-xl"/>
              <div className="mt-3 grid grid-cols-4 gap-1.5">{[zh ? '用户' : 'User', zh ? '场景' : 'Context', zh ? '痛点' : 'Pain', zh ? '结果' : 'Result'].map((item, index) => <span key={item} className="rounded-lg border border-white/8 bg-white/[.035] px-2 py-2 text-center text-[8px] font-bold uppercase tracking-wider text-white/30"><b className="mr-1 text-[#d6ff5f]">0{index + 1}</b>{item}</span>)}</div>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5"><span className="hidden text-[9px] leading-4 text-white/28 sm:block">{zh ? '先出方案 · 确认后编码计费' : 'Plan first · pay when coding starts'}</span><button type="submit" disabled={prompt.trim().length < 10} className="ml-auto rounded-xl bg-[#d6ff5f] px-5 py-3 text-sm font-black text-[#12140b] transition hover:-translate-y-0.5 hover:bg-white disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-25">{zh ? '生成产品方案' : 'Generate product plan'} ↗</button></div>
            </div>
          </form>
          <div className="absolute -bottom-4 -right-3 rounded-xl border border-white/10 bg-[#201f27] px-3 py-2 font-mono text-[9px] text-white/45 shadow-xl"><span className="text-emerald-400">●</span> full-stack baseline ready</div>
        </div>
      </div>

      <div className="grid border-y border-white/10 lg:grid-cols-[180px_1fr]"><div className="border-b border-white/10 py-5 text-[10px] font-bold uppercase tracking-[.15em] text-white/30 lg:border-b-0 lg:border-r lg:pr-6">{zh ? '从案例开始' : 'Start from an example'}<br/><span className="mt-1 inline-block text-[#ff8a64]">03 prompts →</span></div><div className="grid sm:grid-cols-3">{suggestions.map((item, index) => <button key={item} onClick={() => setPrompt(item)} className="group border-b border-white/10 p-5 text-left transition hover:bg-white/[.04] sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="text-[9px] font-bold text-[#a89cff]">0{index + 1}</span><span className="mt-8 block text-xs leading-5 text-white/52 transition group-hover:text-white">{item}</span></button>)}</div></div>
    </div>
  </section>;
}
