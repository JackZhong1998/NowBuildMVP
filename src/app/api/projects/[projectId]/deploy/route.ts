import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { projectEnvironmentStatus } from '@/lib/nowbuild/project-environment';
import { getProjectSession, saveProjectSession } from '@/lib/nowbuild/project-store';
import { deployProjectToVercel } from '@/lib/nowbuild/vercel-deploy';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  const { projectId } = await params;
  const project = userId ? await getProjectSession(projectId, userId) : null;
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json({ deployment: project.deployment || null, environment: await projectEnvironmentStatus(projectId) });
}

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  const { projectId } = await params;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = await getProjectSession(projectId, userId);
  if (!project || project.isExample || !project.result) return NextResponse.json({ error: 'Build the project before publishing' }, { status: 400 });
  if (project.testing?.status !== 'passed') return NextResponse.json({ error: '请先完成核心流程测试，再发布产品' }, { status: 400 });
  const environment = await projectEnvironmentStatus(projectId);
  const missing = [
    !environment.supabaseReady && 'Supabase',
    !environment.paymentsReady && 'Stripe',
    !environment.deployReady && 'Vercel',
  ].filter(Boolean);
  if (missing.length) return NextResponse.json({ error: `发布前请完成配置：${missing.join('、')}` }, { status: 400 });
  const isFinalEnvironmentSync = Boolean(
    project.deployment?.url
    && environment.paymentsProductionReady
    && project.launch?.supabaseRedirectConfirmed
    && project.launch?.stripeWebhookConfirmed
  );
  project.deployment = { status: 'uploading', provider: 'vercel', updatedAt: new Date().toISOString() };
  await saveProjectSession(project);
  try {
    project.deployment.status = 'building';
    await saveProjectSession(project);
    const result = await deployProjectToVercel(projectId, project.title, userId);
    project.deployment = { status: 'ready', provider: 'vercel', url: result.url, deploymentId: result.id, updatedAt: new Date().toISOString() };
    project.launch = {
      ...project.launch,
      productionEnvironmentSynced: isFinalEnvironmentSync,
      updatedAt: new Date().toISOString(),
    };
    project.messages.push({ id: randomUUID(), role: 'assistant', kind: 'result', createdAt: new Date().toISOString(), content: `产品已发布：${result.url}` });
    await saveProjectSession(project);
    return NextResponse.json({ project, deployment: project.deployment });
  } catch (error) {
    project.deployment = { status: 'error', provider: 'vercel', updatedAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'Publish failed' };
    await saveProjectSession(project);
    return NextResponse.json({ error: project.deployment.error, deployment: project.deployment }, { status: 500 });
  }
}
