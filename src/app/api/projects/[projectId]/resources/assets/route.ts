import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { getProjectSession, updateProjectSession } from '@/lib/nowbuild/project-store';
import { normalizeProjectResources, saveProjectAsset } from '@/lib/nowbuild/project-resources';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const project = await getProjectSession(projectId, userId);
  if (!project || project.isExample) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  try {
    const resources = normalizeProjectResources(project.resources);
    if (resources.assets.length >= 40) throw new Error('每个项目最多保存 40 个素材');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('请选择图片或视频');
    const asset = await saveProjectAsset(projectId, file);
    resources.assets.push(asset);
    const saved = await updateProjectSession(projectId, userId, { resources });
    return NextResponse.json(saved.resources, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to upload asset' }, { status: 400 });
  }
}
