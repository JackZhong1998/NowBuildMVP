import 'server-only';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { stat } from 'node:fs/promises';
import { ensureProjectWorkspace } from './workspace';
import { generatedProjectEnv } from './project-environment';

type PreviewProcess = { port: number; process: ChildProcess; logs: string[] };
const globalRuntime = globalThis as typeof globalThis & { __nowbuildPreviews?: Map<string, PreviewProcess> };
const previews = globalRuntime.__nowbuildPreviews ??= new Map<string, PreviewProcess>();

async function availablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitUntilReady(port: number, projectId: string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/p/${projectId}/zh`, { signal: AbortSignal.timeout(1500) });
      if (response.status < 500) return;
    } catch {
      // Process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Generated project preview did not become ready');
}

export async function startProjectPreview(projectId: string) {
  const existing = previews.get(projectId);
  if (existing?.process.exitCode === null) return existing;
  const cwd = await ensureProjectWorkspace(projectId);
  await stat(join(cwd, '.next', 'BUILD_ID'));
  const port = await availablePort();
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npm, ['run', 'start', '--', '-p', String(port)], {
    cwd,
    env: await generatedProjectEnv(projectId, { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', NOWBUILD_PREVIEW_MODE: 'true' }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const record: PreviewProcess = { port, process: child, logs: [] };
  const capture = (chunk: Buffer) => {
    record.logs.push(...chunk.toString().split('\n').map((line) => line.trim()).filter(Boolean));
    record.logs.splice(0, Math.max(0, record.logs.length - 80));
  };
  child.stdout?.on('data', capture);
  child.stderr?.on('data', capture);
  child.once('exit', () => previews.delete(projectId));
  previews.set(projectId, record);
  await waitUntilReady(port, projectId);
  return record;
}

export async function restartProjectPreview(projectId: string) {
  const existing = previews.get(projectId);
  if (existing?.process.exitCode === null) {
    existing.process.kill('SIGTERM');
    previews.delete(projectId);
  }
  return startProjectPreview(projectId);
}
