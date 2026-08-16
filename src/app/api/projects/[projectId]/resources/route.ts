import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { getProjectSession, updateProjectSession } from '@/lib/nowbuild/project-store';
import { installCatalogMCP, normalizeProjectResources, parseCustomMCP, parseImportedSkill, updateMCPConfiguration } from '@/lib/nowbuild/project-resources';

export const runtime = 'nodejs';

async function ownedProject(projectId: string) {
  const userId = await getNowBuildUserId();
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const project = await getProjectSession(projectId, userId);
  if (!project || project.isExample) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) };
  return { userId, project };
}

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await ownedProject(projectId);
  if ('error' in owned) return owned.error;
  return NextResponse.json(normalizeProjectResources(owned.project.resources));
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await ownedProject(projectId);
  if ('error' in owned) return owned.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const resources = normalizeProjectResources(owned.project.resources);
    if (body.kind === 'skill') {
      if (resources.skills.length >= 12) throw new Error('每个项目最多导入 12 个 Skill');
      resources.skills.push(parseImportedSkill(body));
    } else if (body.kind === 'mcp') {
      if (resources.mcpServers.length >= 16) throw new Error('每个项目最多安装 16 个 MCP');
      const server = body.catalogId ? installCatalogMCP(String(body.catalogId)) : parseCustomMCP(body);
      if (server.catalogId && resources.mcpServers.some((item) => item.catalogId === server.catalogId)) throw new Error('这个 MCP 已安装');
      resources.mcpServers.push(server);
    } else {
      throw new Error('Unknown resource kind');
    }
    const project = await updateProjectSession(projectId, owned.userId, { resources });
    return NextResponse.json(project.resources, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add resource' }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await ownedProject(projectId);
  if ('error' in owned) return owned.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const resources = normalizeProjectResources(owned.project.resources);
    if (body.kind === 'mcp') {
      const index = resources.mcpServers.findIndex((item) => item.id === body.resourceId);
      if (index < 0) throw new Error('MCP not found');
      resources.mcpServers[index] = updateMCPConfiguration(resources.mcpServers[index], body);
    } else if (body.kind === 'skill') {
      const skill = resources.skills.find((item) => item.id === body.resourceId);
      if (!skill) throw new Error('Skill not found');
      skill.enabled = body.enabled !== false;
    } else {
      throw new Error('Unknown resource kind');
    }
    const project = await updateProjectSession(projectId, owned.userId, { resources });
    return NextResponse.json(project.resources);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update resource' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await ownedProject(projectId);
  if ('error' in owned) return owned.error;
  try {
    const body = await request.json() as { kind?: string; resourceId?: string };
    const resources = normalizeProjectResources(owned.project.resources);
    if (body.kind === 'skill') resources.skills = resources.skills.filter((item) => item.id !== body.resourceId);
    else if (body.kind === 'mcp') resources.mcpServers = resources.mcpServers.filter((item) => item.id !== body.resourceId);
    else throw new Error('Unknown resource kind');
    const project = await updateProjectSession(projectId, owned.userId, { resources });
    return NextResponse.json(project.resources);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to remove resource' }, { status: 400 });
  }
}
