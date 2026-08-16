'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

export type TestIssueContext = {
  itemId: string;
  step: string;
  expected: string;
  observed: string;
  previewPath: string;
};

export default function IssueReportDialog({
  open,
  step,
  previewPath,
  locale,
  onClose,
  onSubmit,
}: {
  open: boolean;
  step: { id: string; label: string } | null;
  previewPath: string;
  locale: 'zh' | 'en';
  onClose: () => void;
  onSubmit: (issue: TestIssueContext) => void;
}) {
  const zh = locale === 'zh';
  const [expected, setExpected] = useState('');
  const [observed, setObserved] = useState('');
  const expectedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setExpected('');
    setObserved('');
    window.setTimeout(() => expectedRef.current?.focus(), 0);
  }, [open, step?.id]);

  if (!open || !step) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!expected.trim()) return;
    onSubmit({
      itemId: step!.id,
      step: step!.label,
      expected: expected.trim(),
      observed: observed.trim(),
      previewPath,
    });
  }

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="issue-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-amber-700">{zh ? '测试问题' : 'Test issue'}</div>
          <h2 id="issue-title" className="mt-2 text-xl font-black tracking-tight">{zh ? '告诉 Agent 你期待什么' : 'Tell the agent what you expected'}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={zh ? '关闭问题反馈' : 'Close issue report'} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10">×</button>
      </div>
      <div className="mt-5 rounded-xl bg-[#f5f5f2] p-4 text-xs leading-5 text-black/60">
        <b className="text-black/80">{zh ? '当前测试：' : 'Current test: '}</b>{step.label}
        <div className="mt-1 text-[10px] text-black/40">{previewPath}</div>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-xs font-bold text-black/70">
          {zh ? '你期望发生什么？' : 'What should have happened?'}
          <textarea ref={expectedRef} required rows={3} value={expected} onChange={(event) => setExpected(event.target.value)} placeholder={zh ? '例如：点击保存后应该返回项目列表，并显示刚创建的项目。' : 'For example: Saving should return to the project list.'} className="mt-2 w-full resize-none rounded-xl border border-black/10 px-3 py-3 text-sm font-normal leading-6 outline-none focus:border-black" />
        </label>
        <label className="block text-xs font-bold text-black/70">
          {zh ? '实际发生了什么？（可选）' : 'What actually happened? (optional)'}
          <textarea rows={2} value={observed} onChange={(event) => setObserved(event.target.value)} placeholder={zh ? '页面停在原地，没有提示。' : 'The page stayed in place without feedback.'} className="mt-2 w-full resize-none rounded-xl border border-black/10 px-3 py-3 text-sm font-normal leading-6 outline-none focus:border-black" />
        </label>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11px] leading-5 text-blue-900">
          {zh ? '系统会自动附带测试步骤、当前预览地址、最近构建记录和运行错误，不需要你复制技术日志。' : 'The current step, preview URL, build logs, and runtime errors will be attached automatically.'}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-black/10 px-4 py-2.5 text-xs font-bold">{zh ? '取消' : 'Cancel'}</button>
          <button type="submit" disabled={!expected.trim()} className="rounded-xl bg-[#171816] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-30">{zh ? '让 Agent 分析并修复' : 'Ask agent to fix'}</button>
        </div>
      </form>
    </section>
  </div>;
}
