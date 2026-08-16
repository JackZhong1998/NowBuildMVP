'use client';

import Image from 'next/image';
import { ChangeEvent, useState } from 'react';
import type { ProjectResources } from '@/lib/nowbuild/types';
import { deleteAsset, uploadAsset } from './resource-api';

function size(bytes: number) { return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`; }

export default function AssetLibraryTab({ projectId, resources, onChange, onError, zh }: { projectId: string; resources: ProjectResources; onChange: (value: ProjectResources) => void; onError: (value: string) => void; zh: boolean }) {
  const [busy, setBusy] = useState(false);
  async function add(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return; setBusy(true); onError('');
    try { onChange(await uploadAsset(projectId, file)); }
    catch (error) { onError(error instanceof Error ? error.message : 'Upload failed'); }
    finally { setBusy(false); event.target.value = ''; }
  }
  async function remove(id: string) {
    try { onChange(await deleteAsset(projectId, id)); }
    catch (error) { onError(error instanceof Error ? error.message : 'Delete failed'); }
  }
  return <div className="space-y-5"><div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/15 bg-[#f7f7f4] p-7 text-center"><div className="text-2xl">▧</div><h3 className="mt-2 text-sm font-bold">{zh ? '上传官网与产品素材' : 'Upload website and product assets'}</h3><p className="mt-1 max-w-md text-[11px] leading-5 text-black/45">{zh ? '图片最大 10MB，视频最大 50MB。构建时复制到产品并把稳定路径交给 Coding Agent。' : 'Images up to 10MB, videos up to 50MB. Builds copy them into the product and expose stable paths to the coding agent.'}</p><label className="mt-4 cursor-pointer rounded-lg bg-[#171816] px-4 py-2.5 text-xs font-bold text-white">{busy ? (zh ? '正在上传…' : 'Uploading…') : (zh ? '选择图片或视频' : 'Choose image or video')}<input disabled={busy} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime" onChange={add}/></label></div>{resources.assets.length === 0 ? <p className="text-center text-xs text-black/40">{zh ? '素材库还是空的。' : 'Your asset library is empty.'}</p> : <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{resources.assets.map((asset) => <li key={asset.id} className="group overflow-hidden rounded-xl border border-black/8 bg-white"><div className="relative aspect-video bg-black/[.04]">{asset.kind === 'image' ? <Image unoptimized fill sizes="240px" className="object-cover" src={`/api/projects/${projectId}/resources/assets/${asset.id}`} alt={asset.name}/> : <video className="h-full w-full object-cover" controls preload="metadata" src={`/api/projects/${projectId}/resources/assets/${asset.id}`}/>}</div><div className="flex items-start justify-between gap-2 p-3"><div className="min-w-0"><div className="truncate text-xs font-bold" title={asset.name}>{asset.name}</div><div className="mt-1 text-[9px] text-black/40">{asset.kind.toUpperCase()} · {size(asset.bytes)}</div></div><button onClick={() => void remove(asset.id)} aria-label={`${zh ? '删除' : 'Delete'} ${asset.name}`} className="text-xs text-red-600">×</button></div></li>)}</ul>}</div>;
}
