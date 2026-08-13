import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import type { ProjectPlan, ProjectSession } from './types';
import { normalizeStyleId, styleCatalogById } from './style-catalog';

const SESSION_ROOT = join(tmpdir(), 'nowbuild-sessions');
const PROJECT_ROOT = join(tmpdir(), 'nowbuild-projects');

function safeId(id: string) {
  if (!/^[a-z0-9-]{8,80}$/i.test(id)) throw new Error('Invalid project id');
  return id;
}

function sessionPath(id: string) {
  const path = resolve(SESSION_ROOT, `${safeId(id)}.json`);
  if (!path.startsWith(resolve(SESSION_ROOT) + sep)) throw new Error('Unsafe project path');
  return path;
}

export async function saveProjectSession(session: ProjectSession) {
  await mkdir(SESSION_ROOT, { recursive: true });
  session.updatedAt = new Date().toISOString();
  await writeFile(sessionPath(session.id), `${JSON.stringify(session, null, 2)}\n`);
  return session;
}

export async function createProjectSession(ownerId: string, prompt: string) {
  const now = new Date().toISOString();
  const session: ProjectSession = {
    id: randomUUID(), ownerId, title: prompt.slice(0, 48), initialPrompt: prompt,
    status: 'planning', createdAt: now, updatedAt: now,
    messages: [{ id: randomUUID(), role: 'user', content: prompt, kind: 'prompt', createdAt: now }],
  };
  await saveProjectSession(session);
  return session;
}

async function synthesizedExample(id: string): Promise<ProjectSession | null> {
  try {
    const cwd = resolve(PROJECT_ROOT, safeId(id));
    const manifest = JSON.parse(await readFile(join(cwd, 'NOWBUILD_PROJECT.json'), 'utf8')) as { generatedAt: string; brief: ProjectPlan['brief'] };
    await stat(join(cwd, '.next', 'BUILD_ID'));
    const brief = { ...manifest.brief, style: normalizeStyleId(String(manifest.brief.style)) };
    return {
      id, ownerId: 'example', title: brief.name, initialPrompt: brief.idea, status: 'built', createdAt: manifest.generatedAt, updatedAt: manifest.generatedAt, isExample: true,
      plan: {
        discovery: { oneLiner: brief.idea, assumptions: ['以核心工作流验证价值'], openQuestions: [] },
        brief,
        prd: { problem: brief.idea, value: brief.idea, persona: brief.audience, coreJourney: ['登录', '完成核心任务', '查看结果'], scope: ['公开官网与 SEO', brief.coreFeature, '登录、支付与数据库基础'], nonGoals: ['非核心复杂功能'], acceptanceCriteria: ['核心流程可交互', '空、加载、成功和失败状态完整'], success: ['生产构建通过', '核心流程可交互', '全站路由可访问'], risks: ['需要真实用户验证'] },
        design: { rationale: `${brief.style} 产品设计方向`, palette: [...styleCatalogById[brief.style].palette], typography: styleCatalogById[brief.style].typography, layout: styleCatalogById[brief.style].principles.join(' · '), motion: styleCatalogById[brief.style].motion },
        copy: { eyebrow: '从复杂到清晰', headline: brief.idea, subheadline: `专为${brief.audience}打造`, cta: '创建第一个结果', secondaryCta: '查看产品演示', problemTitle: '重要工作不该被重复流程拖慢', problemBody: brief.idea, benefits: [{ title: '更快完成', body: brief.coreFeature }], steps: [{ title: '开始', body: brief.coreFeature }], faq: [{ question: '可以先试用吗？', answer: '可以，先体验核心流程。' }] },
        seo: { title: `${brief.name} — ${brief.idea}`, description: brief.idea, primaryKeyword: brief.name, supportingKeywords: [], canonical: `/${brief.locale}`, schemaTypes: ['SoftwareApplication', 'FAQPage'] },
        ai: { enabled: false, capabilities: [], primaryUseCase: '', systemPrompt: '', outputContract: '' },
      },
      messages: [
        { id: `${id}-u`, role: 'user', content: brief.idea, kind: 'prompt', createdAt: manifest.generatedAt },
        { id: `${id}-a`, role: 'assistant', content: `已确认 ${brief.name} 的产品方案，并完成整站开发、构建与测试。`, kind: 'result', createdAt: manifest.generatedAt },
      ],
      result: { projectId: id, mode: 'scaffold', summary: 'SaaS Kit 全站示例', prd: [], files: [], logs: ['✓ SaaS Kit production build passed', '✓ 官网、产品、定价与登录路由可访问'], previewUrl: `/p/${id}/${brief.locale}`, routes: [{ label: '官网', path: `/${brief.locale}` }, { label: '产品', path: `/${brief.locale}/dashboard` }, { label: '定价', path: `/${brief.locale}/pricing` }, { label: '登录', path: `/${brief.locale}/sign-in` }], usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 }, creditsCharged: 0 },
    };
  } catch { return null; }
}

export async function getProjectSession(id: string, ownerId?: string) {
  let session: ProjectSession | null = null;
  try {
    session = JSON.parse(await readFile(sessionPath(id), 'utf8')) as ProjectSession;
    if (session.plan?.brief) session.plan.brief.style = normalizeStyleId(String(session.plan.brief.style));
  } catch { session = await synthesizedExample(id); }
  if (!session) return null;
  if (ownerId && session.ownerId !== ownerId && !session.isExample) return null;
  return session;
}

export async function listProjectSessions(ownerId?: string) {
  await mkdir(SESSION_ROOT, { recursive: true });
  const sessions: ProjectSession[] = [];
  for (const name of await readdir(SESSION_ROOT)) {
    if (!name.endsWith('.json')) continue;
    try {
      const item = JSON.parse(await readFile(join(SESSION_ROOT, name), 'utf8')) as ProjectSession;
      if (!ownerId || item.ownerId === ownerId) sessions.push(item);
    } catch { /* ignore incomplete cache writes */ }
  }
  try {
    const projectIds = (await readdir(PROJECT_ROOT)).filter((id) => id.startsWith('eval-') || id === 'a7851b42-3c22-483a-9d41-ab012c46baa1');
    for (const id of projectIds.slice(0, 40)) {
      if (sessions.some((item) => item.id === id)) continue;
      const example = await synthesizedExample(id);
      if (example) sessions.push(example);
    }
  } catch { /* no generated examples yet */ }
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listExampleSessions() {
  const all = await listProjectSessions('__examples_only__');
  return all.filter((item) => item.isExample && item.status === 'built');
}

export async function updateProjectSession(id: string, ownerId: string, update: Partial<Pick<ProjectSession, 'status' | 'plan' | 'messages' | 'result' | 'lastError' | 'title' | 'deployment' | 'buildProgress'>>) {
  const session = await getProjectSession(id, ownerId);
  if (!session || session.isExample) throw new Error('Project not found');
  Object.assign(session, update);
  return saveProjectSession(session);
}
