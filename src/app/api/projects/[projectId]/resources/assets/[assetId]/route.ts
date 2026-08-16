import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { getProjectSession, updateProjectSession } from '@/lib/nowbuild/project-store';
import { deleteProjectAsset, normalizeProjectResources, readProjectAsset } from '@/lib/nowbuild/project-resources';

export const runtime = 'nodejs';

async function getOwnedAsset(projectId: string, assetId: string) {
  const userId = await getNowBuildUserId();
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const project = await getProjectSession(projectId, userId);
  if (!project || project.isExample) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) };
  const resources = normalizeProjectResources(project.resources);
  const asset = resources.assets.find((item) => item.id === assetId);
  if (!asset) return { error: NextResponse.json({ error: 'Asset not found' }, { status: 404 }) };
  return { userId, project, resources, asset };
}

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;
  const owned = await getOwnedAsset(projectId, assetId);
  if ('error' in owned) return owned.error;
  try {
    const bytes = await readProjectAsset(projectId, owned.asset);
    return new NextResponse(bytes, { headers: { 'Content-Type': owned.asset.mimeType, 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ error: 'Asset file not found' }, { status: 404 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;
  const owned = await getOwnedAsset(projectId, assetId);
  if ('error' in owned) return owned.error;
  await deleteProjectAsset(projectId, owned.asset);
  owned.resources.assets = owned.resources.assets.filter((item) => item.id !== assetId);
  const saved = await updateProjectSession(projectId, owned.userId, { resources: owned.resources });
  return NextResponse.json(saved.resources);
}
