'use client';

import { FormEvent, useState } from 'react';
import type { ProjectMCPServer, ProjectResources } from '@/lib/nowbuild/types';
import { mutateResources } from './resource-api';

export default function MCPConnectionsTab({ projectId, resources, onChange, onError, zh, locale }: { projectId: string; resources: ProjectResources; onChange: (value: ProjectResources) => void; onError: (value: string) => void; zh: boolean; locale: string }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [envVar, setEnvVar] = useState('');
  const [setup, setSetup] = useState<ProjectMCPServer | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitCustom(event: FormEvent) {
    event.preventDefault(); setBusy(true); onError('');
    try {
      onChange(await mutateResources(projectId, 'POST', { kind: 'mcp', name, endpoint, auth: envVar ? 'bearer-env' : 'none', envVars: envVar ? [envVar] : [], tools: [] }));
      setName(''); setEndpoint(''); setEnvVar(''); setCustomOpen(false);
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to add MCP'); }
    finally { setBusy(false); }
  }

  async function saveSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!setup) return; setBusy(true); onError('');
    const data = new FormData(event.currentTarget);
    try {
      onChange(await mutateResources(projectId, 'PATCH', { kind: 'mcp', resourceId: setup.id, endpoint: data.get('endpoint'), envVars: String(data.get('envVar') || '').trim() ? [String(data.get('envVar')).trim()] : setup.envVars, enabled: true }));
      setSetup(null);
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to configure MCP'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    try { onChange(await mutateResources(projectId, 'DELETE', { kind: 'mcp', resourceId: id })); }
    catch (error) { onError(error instanceof Error ? error.message : 'Remove failed'); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#171816] p-4 text-white"><div><h3 className="text-sm font-bold">{zh ? 'MCP 工具集合' : 'MCP tool catalog'}</h3><p className="mt-1 text-[11px] text-white/55">{zh ? '从已核验的远程服务开始，或接入自己的 HTTPS 端点。' : 'Start with verified remote servers or add your own HTTPS endpoint.'}</p></div><div className="flex gap-2"><button onClick={() => setCustomOpen((value) => !value)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold">{zh ? '自定义' : 'Custom'}</button><a href={`/${locale}/mcp?project=${projectId}`} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black">{zh ? '浏览集合 →' : 'Browse catalog →'}</a></div></div>
    {customOpen && <form onSubmit={submitCustom} className="grid gap-3 rounded-xl border border-black/8 bg-[#f7f7f4] p-4 sm:grid-cols-2"><label className="text-[11px] font-bold">{zh ? '名称' : 'Name'}<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"/></label><label className="text-[11px] font-bold">{zh ? '密钥环境变量（可选）' : 'Secret env variable (optional)'}<input value={envVar} onChange={(event) => setEnvVar(event.target.value.toUpperCase())} placeholder="MY_MCP_TOKEN" className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 font-mono text-sm"/></label><label className="text-[11px] font-bold sm:col-span-2">HTTPS endpoint<input required type="url" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://mcp.example.com/mcp" className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 font-mono text-sm"/></label><button disabled={busy} className="w-fit rounded-lg bg-[#171816] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{zh ? '添加连接' : 'Add connection'}</button></form>}
    {resources.mcpServers.length === 0 ? <div className="rounded-xl border border-dashed border-black/12 p-8 text-center"><div className="text-2xl">⌁</div><p className="mt-2 text-sm font-bold">{zh ? '当前项目还没有 MCP' : 'No MCP servers installed'}</p><p className="mt-1 text-xs text-black/40">{zh ? '安装后，Coding Agent 会获得工具契约并生成服务端调用。' : 'Install one to give the coding agent its tool contract.'}</p></div> : <ul className="space-y-2">{resources.mcpServers.map((server) => <li key={server.id} className="rounded-xl border border-black/8 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold">{server.name}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${server.setupRequired ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{server.setupRequired ? (zh ? '待配置' : 'Setup required') : (zh ? '已启用' : 'Enabled')}</span></div><p className="mt-1 text-[11px] leading-5 text-black/45">{server.description}</p>{server.safetyNote && <p className="mt-2 border-l-2 border-amber-300 pl-2 text-[10px] leading-4 text-black/50">{server.safetyNote}</p>}<div className="mt-2 flex flex-wrap gap-1">{server.tools.slice(0, 5).map((tool) => <code key={tool} className="rounded bg-black/[.045] px-1.5 py-0.5 text-[9px]">{tool}</code>)}</div></div><button onClick={() => void remove(server.id)} className="text-xs text-red-600">{zh ? '移除' : 'Remove'}</button></div>{server.setupRequired && <button onClick={() => setSetup(server)} className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">{zh ? '填写企业端点' : 'Configure endpoint'}</button>}</li>)}</ul>}
    {setup && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={() => setSetup(null)}><form onSubmit={saveSetup} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl"><h3 className="text-lg font-black">{zh ? `配置 ${setup.name}` : `Configure ${setup.name}`}</h3><p className="mt-2 text-xs leading-5 text-black/45">{zh ? '端点必须来自你已获授权的提供商。密钥只填写环境变量名称，实际值在项目配置中保存。' : 'Use an authorized provider endpoint. Enter only the secret variable name; store its value in project settings.'}</p><label className="mt-4 block text-xs font-bold">HTTPS endpoint<input name="endpoint" type="url" required autoFocus className="mt-1.5 w-full rounded-lg border border-black/10 px-3 py-2.5 font-mono text-sm" placeholder="https://enterprise.example.com/didi/mcp"/></label><label className="mt-3 block text-xs font-bold">{zh ? '密钥环境变量' : 'Secret environment variable'}<input name="envVar" defaultValue={setup.envVars[0]} required className="mt-1.5 w-full rounded-lg border border-black/10 px-3 py-2.5 font-mono text-sm"/></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setSetup(null)} className="rounded-lg px-4 py-2 text-xs font-bold">{zh ? '取消' : 'Cancel'}</button><button disabled={busy} className="rounded-lg bg-[#171816] px-4 py-2 text-xs font-bold text-white">{zh ? '保存并启用' : 'Save and enable'}</button></div></form></div>}
  </div>;
}
