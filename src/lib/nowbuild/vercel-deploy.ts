import 'server-only';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { getProjectEnvironment } from './project-environment';
import { ensureProjectWorkspace } from './workspace';
import { issueManagedAIToken } from './managed-ai';

type UploadFile = { file: string; data: Buffer; sha: string; size: number };
const ignored = new Set(['node_modules', '.next', '.git', 'test-results', 'playwright-report']);

async function sourceFiles(root: string, dir = root): Promise<UploadFile[]> {
  const files: UploadFile[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith('.env')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(root, full));
    else if (entry.isFile()) {
      const file = relative(root, full).replaceAll('\\', '/');
      let data = await readFile(full);
      if (file === 'next.config.mjs') {
        const deployable = data.toString('utf8')
          .replace(/const basePath = ['"]\/p\/[a-z0-9-]+['"];/i, "const basePath = process.env.NOWBUILD_PREVIEW_BASE_PATH || '';")
          .replace('basePath,\n  assetPrefix: basePath,', "...(basePath ? { basePath, assetPrefix: basePath } : {}),");
        data = Buffer.from(deployable);
      }
      files.push({ file, data, sha: createHash('sha1').update(data).digest('hex'), size: data.byteLength });
    }
  }
  return files;
}

function apiUrl(path: string, teamId?: string) {
  const url = new URL(path, 'https://api.vercel.com');
  if (teamId) url.searchParams.set('teamId', teamId);
  return url;
}

async function vercelFetch(path: string, token: string, teamId: string | undefined, init: RequestInit = {}) {
  const response = await fetch(apiUrl(path, teamId), {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
    throw new Error(payload.error?.message || payload.message || `Vercel API returned ${response.status}`);
  }
  return response;
}

export async function deployProjectToVercel(projectId: string, name: string, userId: string) {
  const values = await getProjectEnvironment(projectId);
  const token = values.VERCEL_TOKEN;
  if (!token) throw new Error('请先在项目配置中连接 Vercel');
  const teamId = values.VERCEL_TEAM_ID || undefined;
  const cwd = await ensureProjectWorkspace(projectId);
  const files = await sourceFiles(cwd);
  if (!files.length) throw new Error('Project source is empty');

  for (let index = 0; index < files.length; index += 6) {
    await Promise.all(files.slice(index, index + 6).map((item) => vercelFetch('/v2/files', token, teamId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'x-vercel-digest': item.sha },
      body: new Blob([new Uint8Array(item.data)]),
    })));
  }

  const runtimeEnv = Object.fromEntries(Object.entries(values).filter(([key]) => !key.startsWith('VERCEL_')));
  const publicGateway = process.env.NOWBUILD_PUBLIC_URL?.trim();
  if (publicGateway?.startsWith('https://') && process.env.OPENROUTER_API_KEY) {
    runtimeEnv.NOWBUILD_AI_GATEWAY_URL = new URL('/api/ai/generate', publicGateway).toString();
    runtimeEnv.NOWBUILD_AI_GATEWAY_TOKEN = issueManagedAIToken(projectId, userId);
    runtimeEnv.NOWBUILD_PROJECT_ID = projectId;
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || `nowbuild-${projectId.slice(0, 8)}`;
  const created = await vercelFetch('/v13/deployments', token, teamId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: slug,
      target: 'production',
      files: files.map(({ file, sha, size }) => ({ file, sha, size })),
      projectSettings: { framework: 'nextjs' },
      env: runtimeEnv,
      build: { env: runtimeEnv },
    }),
  }).then((response) => response.json()) as { id: string; url?: string; readyState?: string };

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const deployment = await vercelFetch(`/v13/deployments/${created.id}`, token, teamId)
      .then((response) => response.json()) as { id: string; url?: string; readyState?: string; errorMessage?: string };
    if (deployment.readyState === 'READY') return { id: deployment.id, url: `https://${deployment.url}` };
    if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') throw new Error(deployment.errorMessage || 'Vercel build failed');
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error('Vercel deployment is still building; check the Vercel dashboard');
}
