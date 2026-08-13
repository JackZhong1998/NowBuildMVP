import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { listProjectSessions } from '@/lib/nowbuild/project-store';
import ProjectLibrary from '@/components/studio/ProjectLibrary';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const userId = await getNowBuildUserId();
  const projects = await listProjectSessions(userId || 'demo-user');
  const items = projects.map((project) => ({
    id: project.id,
    title: project.title,
    prompt: project.initialPrompt,
    status: project.status,
    style: project.plan?.brief.style || '',
    isExample: Boolean(project.isExample),
    category: (project.id.includes('personal-sites') ? 'personal' : project.id.includes('creator-tools') ? 'creator' : 'product') as 'personal' | 'creator' | 'product',
    screenshot: existsSync(resolve(process.cwd(), 'public', 'case-shots', `${project.id}.png`)),
  }));
  return <ProjectLibrary locale={locale === 'en' ? 'en' : 'zh'} projects={items}/>;
}
