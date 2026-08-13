import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { planProject } from '@/lib/nowbuild/project-planner';
import { createProjectSession, listProjectSessions, saveProjectSession } from '@/lib/nowbuild/project-store';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET() {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ projects: await listProjectSessions(userId) });
}

export async function POST(request: Request) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json() as { prompt?: string; locale?: string };
    const prompt = String(body.prompt || '').trim();
    if (prompt.length < 10 || prompt.length > 2000) return NextResponse.json({ error: '请用至少 10 个字描述你想做的产品' }, { status: 400 });
    const locale = body.locale === 'en' ? 'en' : 'zh';
    const session = await createProjectSession(userId, prompt);
    try {
      session.plan = await planProject(prompt, locale);
      session.title = session.plan.brief.name;
      session.status = 'ready';
      const question = session.plan.discovery.openQuestions[0];
      session.messages.push({ id: crypto.randomUUID(), role: 'assistant', kind: 'plan', createdAt: new Date().toISOString(), content: question || (locale === 'zh' ? `我已经把需求整理成 ${session.plan.brief.name} 的 MVP 方案。你可以继续聊天修改方案；确认后我才会开始改代码。` : `I turned this into an MVP plan for ${session.plan.brief.name}. Keep chatting to refine it; I only edit code after confirmation.`) });
      await saveProjectSession(session);
    } catch (error) {
      session.status = 'failed';
      session.lastError = error instanceof Error ? error.message : 'Planning failed';
      session.messages.push({ id: crypto.randomUUID(), role: 'assistant', kind: 'error', createdAt: new Date().toISOString(), content: `方案生成失败：${session.lastError}` });
      await saveProjectSession(session);
    }
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Planning failed' }, { status: 500 });
  }
}
