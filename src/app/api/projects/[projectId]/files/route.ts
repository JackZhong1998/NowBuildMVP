import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { getProjectSession } from '@/lib/nowbuild/project-store';
import { ensureProjectWorkspace } from '@/lib/nowbuild/workspace';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const project = await getProjectSession(projectId, userId);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const relative = request.nextUrl.searchParams.get('path') || 'NOWBUILD_PROJECT.json';
  if (!/^[a-zA-Z0-9_./\-[\]]+$/.test(relative) || relative.includes('..') || relative.includes('node_modules') || relative.includes('.next')) return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  try {
    const cwd = await ensureProjectWorkspace(projectId);
    const path = resolve(cwd, relative);
    if (!path.startsWith(resolve(cwd) + sep)) throw new Error('Invalid file path');
    const content = await readFile(path, 'utf8');
    return NextResponse.json({ path: relative, content: content.slice(0, 120_000) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'File not found' }, { status: 404 });
  }
}
