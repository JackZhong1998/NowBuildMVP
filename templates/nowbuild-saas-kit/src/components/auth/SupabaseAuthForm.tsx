'use client';

import { FormEvent, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default function SupabaseAuthForm({ mode, locale }: { mode: 'sign-in' | 'sign-up'; locale: 'zh' | 'en' }) {
  const zh = locale === 'zh';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const configured = isSupabaseConfigured();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const supabase = createBrowserSupabase();
      const basePath = (window as Window & { __NOWBUILD_BASE_PATH__?: string }).__NOWBUILD_BASE_PATH__ || '';
      if (mode === 'sign-in') {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        window.location.href = `${basePath}/${locale}/dashboard`;
      } else {
        const redirect = `${window.location.origin}${basePath}/auth/confirm?next=${encodeURIComponent(`/${locale}/dashboard`)}`;
        const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
        if (result.error) throw result.error;
        if (result.data.session) window.location.href = `${basePath}/${locale}/dashboard`;
        else setMessage(zh ? '请打开邮箱完成验证。' : 'Check your inbox to confirm your email.');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : (zh ? '请求失败' : 'Request failed')); }
    finally { setBusy(false); }
  }

  if (!configured) return <main className="flex min-h-screen items-center justify-center bg-surface px-4"><div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black">{zh ? 'Supabase 登录已接入' : 'Supabase Auth is ready'}</h1><p className="mt-3 text-sm leading-6 text-gray-500">{zh ? '配置项目 URL 和 Publishable Key 后即可测试注册与登录。' : 'Add the project URL and publishable key to test signup and login.'}</p></div></main>;

  return <main className="flex min-h-screen items-center justify-center bg-surface px-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl"><h1 className="text-2xl font-black">{mode === 'sign-in' ? (zh ? '登录' : 'Sign in') : (zh ? '创建账户' : 'Create account')}</h1><label className="mt-6 block text-sm font-bold">{zh ? '邮箱' : 'Email'}<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal outline-none focus:border-primary-500" /></label><label className="mt-4 block text-sm font-bold">{zh ? '密码' : 'Password'}<input required minLength={8} type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal outline-none focus:border-primary-500" /></label>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}<button disabled={busy} className="mt-6 w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? (zh ? '处理中…' : 'Working…') : mode === 'sign-in' ? (zh ? '登录' : 'Sign in') : (zh ? '注册' : 'Sign up')}</button><a href={`/${locale}/${mode === 'sign-in' ? 'sign-up' : 'sign-in'}`} className="mt-5 block text-center text-sm text-gray-500 underline">{mode === 'sign-in' ? (zh ? '创建账户' : 'Create account') : (zh ? '已有账户，去登录' : 'Already have an account')}</a></form></main>;
}
