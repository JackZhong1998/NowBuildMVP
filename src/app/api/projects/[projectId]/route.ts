import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { getProjectSession, updateProjectSession } from '@/lib/nowbuild/project-store';
import { planProject } from '@/lib/nowbuild/project-planner';
import type { ProjectPlan } from '@/lib/nowbuild/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const project = await getProjectSession(projectId, userId);
  return project ? NextResponse.json(project) : NextResponse.json({ error: 'Project not found' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  try {
    const body = await request.json() as { plan?: ProjectPlan; title?: string };
    const project = await updateProjectSession(projectId, userId, { plan: body.plan, title: body.title });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  try {
    const project = await getProjectSession(projectId, userId);
    if (!project || project.isExample || project.status !== 'ready' || !project.plan) throw new Error('Project is not in planning mode');
    const body = await request.json() as { answer?: string; locale?: string };
    const answer = String(body.answer || '').trim();
    if (answer.length < 2 || answer.length > 2000) throw new Error('Invalid planning answer');
    const locale = body.locale === 'en' ? 'en' : 'zh';
    const context = `${project.initialPrompt}\n\nCURRENT EDITABLE PLAN:\n${JSON.stringify(project.plan)}\n\nFOUNDER FOLLOW-UP:\n${answer}\n\nUpdate the plan using the follow-up. Preserve confirmed facts and remove questions the answer resolves.`;
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    const plan = !apiKey || apiKey.includes('xxxxx')
      ? { ...project.plan, discovery: { ...project.plan.discovery, oneLiner: answer, assumptions: [...project.plan.discovery.assumptions, answer].slice(-5), openQuestions: [] } }
      : await planProject(context, locale);
    const now = new Date().toISOString();
    const nextQuestion = plan.discovery.openQuestions[0];
    const messages = [
      ...project.messages,
      { id: crypto.randomUUID(), role: 'user' as const, kind: 'prompt' as const, content: answer, createdAt: now },
      { id: crypto.randomUUID(), role: 'assistant' as const, kind: 'plan' as const, content: nextQuestion || (locale === 'zh' ? '已更新 PRD、官网文案和设计建议。你可以继续修改，或确认方案开始开发。' : 'I updated the PRD, copy, and design recommendation. Continue refining or confirm to start development.'), createdAt: now },
    ];
    return NextResponse.json(await updateProjectSession(projectId, userId, { plan, title: plan.brief.name, messages }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Refinement failed' }, { status: 400 });
  }
}
