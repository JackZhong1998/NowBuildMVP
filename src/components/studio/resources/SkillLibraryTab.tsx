'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import type { ProjectResources } from '@/lib/nowbuild/types';
import { mutateResources } from './resource-api';

export default function SkillLibraryTab({ projectId, resources, onChange, onError, zh }: { projectId: string; resources: ProjectResources; onChange: (value: ProjectResources) => void; onError: (value: string) => void; zh: boolean }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 25_000) { onError(zh ? 'SKILL.md 文件不能超过 25KB' : 'SKILL.md must be under 25KB'); return; }
    setContent(await file.text());
    if (!name) setName(file.name.replace(/\.md$/i, '').replace(/[-_]+/g, ' '));
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); onError('');
    try {
      onChange(await mutateResources(projectId, 'POST', { kind: 'skill', name, description, content }));
      setName(''); setDescription(''); setContent('');
    } catch (error) { onError(error instanceof Error ? error.message : 'Import failed'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    try { onChange(await mutateResources(projectId, 'DELETE', { kind: 'skill', resourceId: id })); }
    catch (error) { onError(error instanceof Error ? error.message : 'Remove failed'); }
  }

  return <div className="space-y-5">
    <form onSubmit={submit} className="rounded-xl border border-black/8 bg-[#f7f7f4] p-4">
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold">{zh ? '导入 Skill' : 'Import a Skill'}</h3><p className="mt-1 text-[11px] text-black/45">{zh ? '上传或粘贴 SKILL.md；构建时作为有边界的项目指令使用。' : 'Upload or paste SKILL.md as bounded project instructions.'}</p></div><label className="cursor-pointer rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold">{zh ? '选择文件' : 'Choose file'}<input className="sr-only" type="file" accept=".md,text/markdown,text/plain" onChange={importFile}/></label></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-bold">{zh ? '名称' : 'Name'}<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6d5dfc]"/></label><label className="text-[11px] font-bold">{zh ? '用途说明' : 'Description'}<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6d5dfc]"/></label></div>
      <label className="mt-3 block text-[11px] font-bold">SKILL.md<textarea value={content} onChange={(event) => setContent(event.target.value)} minLength={20} maxLength={20000} required rows={7} spellCheck={false} className="mt-1.5 w-full resize-y rounded-lg border border-black/10 bg-white p-3 font-mono text-[11px] leading-5 outline-none focus:border-[#6d5dfc]" placeholder={'---\nname: my-skill\n---\n# Instructions\n...'}/></label>
      <button disabled={busy} className="mt-3 rounded-lg bg-[#171816] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? (zh ? '正在导入…' : 'Importing…') : (zh ? '导入到当前项目' : 'Import to project')}</button>
    </form>
    <section><h3 className="text-xs font-bold uppercase tracking-[.12em] text-black/40">{zh ? `已导入 ${resources.skills.length}` : `${resources.skills.length} imported`}</h3>{resources.skills.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-black/12 p-6 text-center text-xs text-black/40">{zh ? '还没有项目 Skill。' : 'No project Skills yet.'}</p> : <ul className="mt-3 space-y-2">{resources.skills.map((skill) => <li key={skill.id} className="flex items-start justify-between gap-4 rounded-xl border border-black/8 p-4"><div className="min-w-0"><div className="text-sm font-bold">{skill.name}</div><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-black/45">{skill.description || skill.content.slice(0, 160)}</p></div><button onClick={() => void remove(skill.id)} className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">{zh ? '移除' : 'Remove'}</button></li>)}</ul>}</section>
  </div>;
}
