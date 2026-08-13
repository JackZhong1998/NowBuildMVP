import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { getProjectSession } from '@/lib/nowbuild/project-store';
import { projectEnvironmentStatus, updateProjectEnvironment } from '@/lib/nowbuild/project-environment';

export const runtime = 'nodejs';

async function projectForUser(projectId: string) {
  const userId = await getNowBuildUserId();
  if (!userId) return null;
  return getProjectSession(projectId, userId);
}

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!await projectForUser(projectId)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json(await projectEnvironmentStatus(projectId));
}

export async function PUT(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await projectForUser(projectId);
  if (!project || project.isExample) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  try {
    const body = await request.json() as { values?: Record<string, unknown> };
    return NextResponse.json(await updateProjectEnvironment(projectId, body.values || {}));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save environment' }, { status: 400 });
  }
}
