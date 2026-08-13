import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { generatedProjectEnv, projectEnvironmentStatus } from '@/lib/nowbuild/project-environment';
import { getProjectSession, saveProjectSession } from '@/lib/nowbuild/project-store';
import { restartProjectPreview } from '@/lib/nowbuild/preview-runtime';
import { ensureProjectWorkspace } from '@/lib/nowbuild/workspace';

const execFileAsync = promisify(execFile);
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const project = await getProjectSession(projectId, userId);
  if (!project || project.isExample || !project.result) return NextResponse.json({ error: 'Build the project before applying environment variables' }, { status: 400 });

  try {
    const cwd = await ensureProjectWorkspace(projectId);
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const env = await generatedProjectEnv(projectId, { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' });
    await execFileAsync(npm, ['run', 'build'], { cwd, env, timeout: 240_000, maxBuffer: 4 * 1024 * 1024 });
    await restartProjectPreview(projectId);
    project.result.logs.push('✓ Project environment applied and production build restarted');
    project.messages.push({
      id: randomUUID(), role: 'assistant', kind: 'result', createdAt: new Date().toISOString(),
      content: '项目配置已安全保存并应用到新的预览构建。现在可以继续测试登录、支付、数据库或 AI 功能。',
    });
    await saveProjectSession(project);
    return NextResponse.json({ project, environment: await projectEnvironmentStatus(projectId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to apply environment' }, { status: 500 });
  }
}
