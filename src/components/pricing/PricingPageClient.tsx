'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';

const packs = [
  { id: 'starter', credits: 500, price: '$9', title: 'Starter', note: '验证一个小功能', featured: false },
  { id: 'builder', credits: 2000, price: '$29', title: 'Builder', note: '完成一个可用 MVP', featured: true },
  { id: 'launch', credits: 6000, price: '$69', title: 'Launch', note: '持续迭代并上线', featured: false },
];

export default function PricingPageClient() {
  const locale = useLocale();
  const zh = locale === 'zh';
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  async function checkout(pack: string) {
    setLoading(pack); setError('');
    try {
      const response = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack, locale }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout failed');
    } finally { setLoading(''); }
  }

  return <><Navbar /><main className="bg-[#f7f7f8] px-4 py-20 sm:py-28"><div className="mx-auto max-w-5xl"><div className="text-center"><div className="text-xs font-bold uppercase tracking-[.18em] text-primary-600">Pay as you build</div><h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{zh ? '只为实际生成付费' : 'Pay only for what you build'}</h1><p className="mx-auto mt-4 max-w-xl text-gray-500">{zh ? '一次充值，永久有效。每次生成按真实输入、输出和缓存用量透明扣费。' : 'Buy once, use anytime. Every run is charged transparently from actual input, output and cache usage.'}</p></div><div className="mt-14 grid gap-5 md:grid-cols-3">{packs.map((pack) => <article key={pack.id} className={`relative rounded-2xl border bg-white p-7 ${pack.featured ? 'border-primary-500 shadow-xl ring-1 ring-primary-500' : 'border-black/8 shadow-sm'}`}>{pack.featured && <div className="absolute -top-3 left-6 rounded-full bg-primary-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Most popular</div>}<h2 className="text-lg font-bold">{pack.title}</h2><p className="mt-1 text-sm text-gray-500">{pack.note}</p><div className="mt-7 text-4xl font-bold">{pack.price}</div><div className="mt-2 text-sm font-semibold text-primary-600">{pack.credits.toLocaleString()} Credits</div><ul className="my-7 space-y-3 text-sm text-gray-600"><li>✓ {zh ? '无订阅、无过期' : 'No subscription or expiry'}</li><li>✓ {zh ? '缓存命中价格更低' : 'Lower cost on cache hits'}</li><li>✓ {zh ? '完整用量流水' : 'Complete usage ledger'}</li></ul><button onClick={() => checkout(pack.id)} disabled={Boolean(loading)} className={`w-full rounded-xl py-3 text-sm font-bold ${pack.featured ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'}`}>{loading === pack.id ? (zh ? '正在打开…' : 'Opening…') : (zh ? '购买 Credits' : 'Buy credits')}</button></article>)}</div>{error && <p role="alert" className="mt-6 text-center text-sm text-red-600">{error}</p>}<p className="mt-8 text-center text-xs text-gray-400">1 Credit = $0.01 · {zh ? '实际扣费包含可配置的平台服务倍率' : 'Final charge includes the configured platform service multiplier'}</p></div></main><Footer /></>;
}
