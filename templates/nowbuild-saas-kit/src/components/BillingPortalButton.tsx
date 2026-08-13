'use client';
import { useState } from 'react';

export default function BillingPortalButton({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(false);
  async function openPortal() {
    setLoading(true);
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to open billing portal');
      window.location.assign(data.url);
    } catch (error) { console.error(error); setLoading(false); }
  }
  return (
    <button type="button" onClick={openPortal} disabled={loading}
      className="mt-5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60">
      {loading ? (locale === 'zh' ? '正在打开…' : 'Opening…') : (locale === 'zh' ? '管理订阅与付款方式' : 'Manage subscription & payment')}
    </button>
  );
}
