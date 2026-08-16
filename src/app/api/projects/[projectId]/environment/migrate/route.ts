import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { getProjectEnvironment } from '@/lib/nowbuild/project-environment';
import { getProjectSession, saveProjectSession } from '@/lib/nowbuild/project-store';
import { applySupabaseMigration } from '@/lib/nowbuild/supabase-mcp';
import { ensureProjectWorkspace } from '@/lib/nowbuild/workspace';

export const runtime = 'nodejs';
export const maxDuration = 120;

async function migrationFor(projectId: string, userId: string) {
  const project = await getProjectSession(projectId, userId);
  if (!project || project.isExample || !project.result) throw new Error('Build the project before configuring its database');
  const cwd = await ensureProjectWorkspace(projectId);
  const sql = await readFile(join(cwd, 'supabase', 'schema.sql'), 'utf8');
  const hash = createHash('sha256').update(sql).digest('hex').slice(0, 12);
  return { project, sql, name: `nowbuild_${hash}` };
}

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { projectId } = await params;
    const migration = await migrationFor(projectId, userId);
    return NextResponse.json({ name: migration.name, sql: migration.sql, destructiveBlocked: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to prepare migration' }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json() as { confirm?: boolean; name?: string };
    if (body.confirm !== true) return NextResponse.json({ error: 'Explicit migration confirmation is required' }, { status: 400 });
    const { projectId } = await params;
    const migration = await migrationFor(projectId, userId);
    if (body.name !== migration.name) return NextResponse.json({ error: 'Migration changed after preview; review the latest SQL before applying' }, { status: 409 });
    const values = await getProjectEnvironment(projectId);
    const result = await applySupabaseMigration({
      projectRef: values.SUPABASE_PROJECT_REF || '',
      accessToken: values.SUPABASE_ACCESS_TOKEN || '',
      name: migration.name,
      sql: migration.sql,
    });
    migration.project.result?.logs.push(result.applied ? `✓ Supabase MCP applied ${migration.name}` : `✓ Supabase migration ${migration.name} was already applied`);
    migration.project.messages.push({
      id: randomUUID(), role: 'assistant', kind: 'result', createdAt: new Date().toISOString(),
      content: result.applied ? '已通过 Supabase MCP 应用数据库字段、索引和 RLS 策略。' : '当前数据库迁移已存在，未重复执行。',
    });
    await saveProjectSession(migration.project);
    return NextResponse.json({ name: migration.name, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to apply migration' }, { status: 500 });
  }
}
