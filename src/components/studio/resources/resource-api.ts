import type { ProjectResources } from '@/lib/nowbuild/types';

async function parse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '资源操作失败');
  return data as ProjectResources;
}

export function loadResources(projectId: string) {
  return fetch(`/api/projects/${projectId}/resources`, { cache: 'no-store' }).then(parse);
}

export function mutateResources(projectId: string, method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>) {
  return fetch(`/api/projects/${projectId}/resources`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(parse);
}

export function uploadAsset(projectId: string, file: File) {
  const body = new FormData();
  body.set('file', file);
  return fetch(`/api/projects/${projectId}/resources/assets`, { method: 'POST', body }).then(parse);
}

export function deleteAsset(projectId: string, assetId: string) {
  return fetch(`/api/projects/${projectId}/resources/assets/${assetId}`, { method: 'DELETE' }).then(parse);
}
